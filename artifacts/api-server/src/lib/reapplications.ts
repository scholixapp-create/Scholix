import { Router, type Request, type Response } from "express";
import { db, usersTable, accountReapplicationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createHash, timingSafeEqual } from "node:crypto";
import bcrypt from "bcrypt";
import { VerifyReapplicationBody } from "@workspace/api-zod";
import { generateOtp } from "./authTokens";
import { sendEmail, otpEmailHtml } from "./email";
import { canReapply, canRequestCode } from "./reapplicationPolicy";

const digest = (value: string) => createHash("sha256").update(value).digest("hex");

export async function beginReapplication(
  _req: Request, res: Response, existing: typeof usersTable.$inferSelect, password: string, role: string,
) {
  if (!canReapply(existing, role)) {
    res.status(409).json({ error: "Reapply using your existing parent or tutor account role. Administrator accounts must be restored by another administrator." }); return;
  }
  const otp = generateOtp();
  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();
  const state = await db.transaction(async (tx) => {
    const [user] = await tx.select().from(usersTable).where(eq(usersTable.id, existing.id)).for("update");
    if (!user || !canReapply(user, role)) return "unavailable";
    const [previous] = await tx.select().from(accountReapplicationsTable)
      .where(eq(accountReapplicationsTable.userId, user.id)).for("update");
    // A verified proposal is immutable until an admin decides. A third party
    // cannot replace its password or remove it from the approval queue.
    if (previous?.verifiedAt) return "pending";
    if (!canRequestCode(previous, now)) return "limited";
    const sameWindow = previous && now.getTime() - previous.windowStartedAt.getTime() < 600_000;
    const values = {
      userId: user.id, passwordHash, otpHash: digest(otp),
      expiresAt: new Date(now.getTime() + 600_000), verifiedAt: null, attempts: 0,
      sends: sameWindow ? previous.sends + 1 : 1,
      windowStartedAt: sameWindow ? previous.windowStartedAt : now,
    };
    await tx.insert(accountReapplicationsTable).values(values)
      .onConflictDoUpdate({ target: accountReapplicationsTable.userId, set: values });
    return "sent";
  });
  if (state !== "sent") {
    res.status(state === "limited" ? 429 : 409).json({ error: state === "pending"
      ? "Your reapplication is already awaiting admin approval."
      : state === "limited"
      ? "Too many codes requested. Please wait 10 minutes before trying again."
      : "This account is no longer eligible to reapply. Try signing in." }); return;
  }
  const email = await sendEmail({
    to: existing.email, subject: "Verify your Scholix reapplication",
    html: otpEmailHtml({ firstName: existing.firstName, otp, reapplication: true }),
  });
  res.status(201).json({
    requiresOtp: true, reapplication: true, pendingUserId: existing.id, email: existing.email,
    ...(email.devMode ? { devOtp: otp } : {}),
    ...(!email.devMode && !email.delivered ? { emailFailed: true } : {}),
  });
}

export const reapplicationRouter = Router();
reapplicationRouter.post("/auth/reapply/verify", async (req, res) => {
  const parsed = VerifyReapplicationBody.strict().safeParse(req.body);
  if (!parsed.success || parsed.data.pendingUserId < 1 || parsed.data.pendingUserId > 2_147_483_647 || !/^\d{6}$/.test(parsed.data.otp)) {
    res.status(400).json({ error: "Enter a valid user ID and six-digit code" }); return;
  }
  const { pendingUserId: userId, otp } = parsed.data;
  const result = await db.transaction(async (tx) => {
    const [user] = await tx.select().from(usersTable).where(eq(usersTable.id, userId)).for("update");
    const [request] = await tx.select().from(accountReapplicationsTable)
      .where(eq(accountReapplicationsTable.userId, userId)).for("update");
    if (!user || user.isActive || !request || !canReapply(user, user.role)) return "unavailable";
    if (request.verifiedAt) return "submitted";
    if (request.attempts >= 5) return "limited";
    if (!request.otpHash || request.expiresAt.getTime() <= Date.now()) return "invalid";
    if (!timingSafeEqual(Buffer.from(request.otpHash), Buffer.from(digest(otp)))) {
      await tx.update(accountReapplicationsTable).set({ attempts: request.attempts + 1 })
        .where(eq(accountReapplicationsTable.userId, userId));
      return "invalid";
    }
    await tx.update(accountReapplicationsTable).set({ verifiedAt: new Date(), otpHash: null })
      .where(eq(accountReapplicationsTable.userId, userId));
    return "verified";
  });
  if (result !== "verified") {
    const status = result === "limited" ? 429 : result === "invalid" ? 401 : 409;
    res.status(status).json({ error: result === "limited" ? "Too many incorrect attempts. Request a new code."
      : result === "invalid" ? "Invalid or expired code. Request a new code and try again."
      : result === "submitted" ? "Your reapplication is already awaiting admin approval."
      : "No eligible inactive account reapplication was found." }); return;
  }
  res.json({ pendingApproval: true, message: "Your email is verified and your reapplication is awaiting admin approval. Your account remains inactive until approved." });
});
