import { Router } from "express";
import { db, usersTable, tutorsTable, legalAgreementsTable, passwordResetTokensTable, authOtpTokensTable, accountDeletionRequestsTable } from "@workspace/db";
import { eq, and, gt, isNull } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcrypt";
import { LoginBody, SignupBody } from "@workspace/api-zod";
import { requireAuth, requireAdmin, type AuthRequest } from "../lib/authMiddleware";
import { sendEmail, passwordResetEmailHtml, otpEmailHtml, accountDeletionConfirmEmailHtml } from "../lib/email";
import { config } from "../lib/config";
import { logger } from "../lib/logger";

const router = Router();

// Legacy SHA-256 hash — used only as fallback for existing accounts
function legacyHashPassword(password: string): string {
  return createHash("sha256").update(password + "scholix_salt").digest("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function makeToken(userId: number): string {
  return Buffer.from(`${userId}:${Date.now()}`).toString("base64");
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (stored.startsWith("$2")) {
    return bcrypt.compare(password, stored);
  }
  // Legacy SHA-256 fallback for accounts created before bcrypt migration
  return stored === legacyHashPassword(password);
}

function normaliseAuPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("614") && digits.length === 11) return "0" + digits.slice(2);
  if (digits.startsWith("04") && digits.length === 10) return digits;
  return null;
}

function userToJson(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    phone: user.phone ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

// Step 1: Validate credentials → issue OTP
router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { email, password } = parsed.data;
  const normalisedEmail = email.toLowerCase();

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalisedEmail))
    .limit(1);

  const passwordMatch = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !passwordMatch) {
    logger.warn({ email: normalisedEmail, found: !!user }, "Login failed — invalid credentials");
    if (user?.role === "admin") {
      logger.error({ email: normalisedEmail }, "ADMIN LOGIN FAILED CHECK SEED");
    }
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  logger.info({ email: normalisedEmail, role: user.role, userId: user.id }, "Login credentials accepted — issuing OTP");

  // Rate limit: max 3 OTP requests per user in 10 minutes
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const recentOtps = await db
    .select({ id: authOtpTokensTable.id })
    .from(authOtpTokensTable)
    .where(
      and(
        eq(authOtpTokensTable.userId, user.id),
        gt(authOtpTokensTable.createdAt, tenMinutesAgo)
      )
    );

  if (recentOtps.length >= 3) {
    res.status(429).json({ error: "Too many login attempts. Please wait 10 minutes before trying again." });
    return;
  }

  // Invalidate any previous unused OTPs for this user
  await db
    .update(authOtpTokensTable)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(authOtpTokensTable.userId, user.id),
        isNull(authOtpTokensTable.usedAt)
      )
    );

  // Generate and store OTP
  const otp = generateOtp();
  const otpHash = hashToken(otp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.insert(authOtpTokensTable).values({ userId: user.id, otpHash, expiresAt });

  const emailConfigured = !!config.resendApiKey;

  if (!emailConfigured) {
    logger.warn({ userId: user.id }, "EMAIL SERVICE NOT CONFIGURED - USING DEV MODE OTP DELIVERY");
    logger.info({ userId: user.id, otp }, "DEV OTP code");
  }

  await sendEmail({
    to: user.email,
    subject: "Your Scholix sign-in code",
    html: otpEmailHtml({ firstName: user.firstName, otp }),
  });

  const devOtp = !emailConfigured && !config.isProduction ? otp : undefined;
  res.json({ requiresOtp: true, pendingUserId: user.id, email: user.email, devOtp });
});

// Step 2: Verify OTP → return session token
router.post("/auth/verify-otp", async (req, res) => {
  const { pendingUserId, otp } = req.body ?? {};

  if (!pendingUserId || !otp) {
    res.status(400).json({ error: "pendingUserId and otp are required" });
    return;
  }

  const userId = parseInt(String(pendingUserId), 10);
  if (isNaN(userId)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const otpHash = hashToken(String(otp));
  const now = new Date();

  const [otpRecord] = await db
    .select()
    .from(authOtpTokensTable)
    .where(
      and(
        eq(authOtpTokensTable.userId, userId),
        eq(authOtpTokensTable.otpHash, otpHash),
        gt(authOtpTokensTable.expiresAt, now),
        isNull(authOtpTokensTable.usedAt)
      )
    )
    .limit(1);

  if (!otpRecord) {
    res.status(401).json({ error: "Invalid or expired code. Please check the code or request a new one." });
    return;
  }

  // Mark OTP as used
  await db
    .update(authOtpTokensTable)
    .set({ usedAt: now })
    .where(eq(authOtpTokensTable.id, otpRecord.id));

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  logger.info({ userId: user.id, role: user.role }, "OTP verified — session started");
  res.json({ user: userToJson(user), token: makeToken(user.id) });
});

// Resend OTP
router.post("/auth/resend-otp", async (req, res) => {
  const { pendingUserId } = req.body ?? {};
  if (!pendingUserId) {
    res.status(400).json({ error: "pendingUserId is required" });
    return;
  }

  const userId = parseInt(String(pendingUserId), 10);
  if (isNaN(userId)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Rate limit
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const recentOtps = await db
    .select({ id: authOtpTokensTable.id })
    .from(authOtpTokensTable)
    .where(
      and(
        eq(authOtpTokensTable.userId, userId),
        gt(authOtpTokensTable.createdAt, tenMinutesAgo)
      )
    );

  if (recentOtps.length >= 3) {
    res.status(429).json({ error: "Too many OTP requests. Please wait before requesting a new code." });
    return;
  }

  // Invalidate existing unused OTPs
  await db
    .update(authOtpTokensTable)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(authOtpTokensTable.userId, userId),
        isNull(authOtpTokensTable.usedAt)
      )
    );

  const otp = generateOtp();
  const otpHash = hashToken(otp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.insert(authOtpTokensTable).values({ userId, otpHash, expiresAt });

  const emailConfigured = !!config.resendApiKey;

  if (!emailConfigured) {
    logger.warn({ userId }, "EMAIL SERVICE NOT CONFIGURED - USING DEV MODE OTP DELIVERY");
    logger.info({ userId, otp }, "DEV OTP code (resend)");
  }

  await sendEmail({
    to: user.email,
    subject: "Your Scholix sign-in code",
    html: otpEmailHtml({ firstName: user.firstName, otp }),
  });

  const devOtp = !emailConfigured && !config.isProduction ? otp : undefined;
  res.json({ ok: true, devOtp });
});

router.post("/auth/signup", async (req, res) => {
  const parsed = SignupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { email, password, firstName, lastName, role } = parsed.data;
  const body = req.body as { termsAccepted?: boolean; phone?: string };

  if (role === "admin") {
    res.status(400).json({ error: "Admin accounts cannot be created through signup" });
    return;
  }

  if (role === "student") {
    res.status(400).json({ error: "Student accounts are managed by parents. Please ask your parent to add you from their dashboard." });
    return;
  }

  if (!body.termsAccepted) {
    res.status(400).json({ error: "You must accept the Terms of Service and Privacy Policy to create an account" });
    return;
  }

  const phone = body.phone;
  let normalisedPhone: string | null = null;
  if (phone) {
    normalisedPhone = normaliseAuPhone(phone);
    if (!normalisedPhone) {
      res.status(400).json({ error: "Please enter a valid Australian mobile number (e.g. 0412 345 678)" });
      return;
    }
  } else {
    res.status(400).json({ error: "Australian mobile number is required" });
    return;
  }

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const [user] = await db
    .insert(usersTable)
    .values({
      email: email.toLowerCase(),
      passwordHash: await hashPassword(password),
      firstName,
      lastName,
      role,
      phone: normalisedPhone,
    })
    .returning();

  const forwarded = req.headers["x-forwarded-for"];
  const ipAddress = ((Array.isArray(forwarded) ? forwarded[0] : forwarded) ?? req.socket.remoteAddress ?? null)?.split(",")[0]?.trim() ?? null;

  await db.insert(legalAgreementsTable).values({
    userId: user.id,
    agreementVersion: "1.0",
    ipAddress,
  });

  if (role === "tutor") {
    await db.insert(tutorsTable).values({
      userId: user.id,
      subjects: [],
      hourlyRate: 65,
      isApproved: false,
      verificationStatus: "pending",
    });
  }

  res.status(201).json({ user: userToJson(user), token: makeToken(user.id) });
});

router.get("/auth/me", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const userId = parseInt(decoded.split(":")[0], 10);
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    if (!user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    res.json(userToJson(user));
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

router.post("/auth/logout", (_req, res) => {
  res.json({ success: true });
});

// Forgot password — send reset link
router.post("/auth/forgot-password", async (req, res) => {
  const { email } = req.body ?? {};
  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  // Always return 200 to prevent email enumeration
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase().trim()))
    .limit(1);

  if (user) {
    // Invalidate existing unused tokens
    await db
      .update(passwordResetTokensTable)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(passwordResetTokensTable.userId, user.id),
          isNull(passwordResetTokensTable.usedAt)
        )
      );

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await db.insert(passwordResetTokensTable).values({ userId: user.id, tokenHash, expiresAt });

    const baseUrl = config.isProduction
      ? (process.env["REPLIT_DOMAINS"]?.split(",")[0] ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]}` : config.frontendUrl)
      : config.frontendUrl;

    const resetLink = `${baseUrl}/reset-password?token=${rawToken}`;

    await sendEmail({
      to: user.email,
      subject: "Reset your Scholix password",
      html: passwordResetEmailHtml({ firstName: user.firstName, resetLink }),
    });
  }

  res.json({ ok: true });
});

// Reset password with token
router.post("/auth/reset-password", async (req, res) => {
  const { token, newPassword } = req.body ?? {};

  if (!token || typeof token !== "string" || !newPassword || typeof newPassword !== "string") {
    res.status(400).json({ error: "token and newPassword are required" });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const tokenHash = hashToken(token);
  const now = new Date();

  const [record] = await db
    .select()
    .from(passwordResetTokensTable)
    .where(
      and(
        eq(passwordResetTokensTable.tokenHash, tokenHash),
        gt(passwordResetTokensTable.expiresAt, now),
        isNull(passwordResetTokensTable.usedAt)
      )
    )
    .limit(1);

  if (!record) {
    res.status(400).json({ error: "This reset link is invalid or has expired. Please request a new one." });
    return;
  }

  await db
    .update(usersTable)
    .set({ passwordHash: await hashPassword(newPassword) })
    .where(eq(usersTable.id, record.userId));

  await db
    .update(passwordResetTokensTable)
    .set({ usedAt: now })
    .where(eq(passwordResetTokensTable.id, record.id));

  res.json({ ok: true });
});

// Change password (requires current password)
router.post("/auth/change-password", requireAuth, async (req, res) => {
  const user = (req as AuthRequest).user;
  const { currentPassword, newPassword } = req.body ?? {};

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "currentPassword and newPassword are required" });
    return;
  }

  if (typeof newPassword !== "string" || newPassword.length < 6) {
    res.status(400).json({ error: "New password must be at least 6 characters" });
    return;
  }

  const passwordMatch = await verifyPassword(currentPassword, user.passwordHash);
  if (!passwordMatch) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  await db
    .update(usersTable)
    .set({ passwordHash: await hashPassword(newPassword) })
    .where(eq(usersTable.id, user.id));

  res.json({ ok: true });
});

// Request account deletion
router.post("/auth/request-deletion", requireAuth, async (req, res) => {
  const user = (req as AuthRequest).user;
  const { reason } = req.body ?? {};

  // Check for existing pending request
  const [existing] = await db
    .select({ id: accountDeletionRequestsTable.id })
    .from(accountDeletionRequestsTable)
    .where(
      and(
        eq(accountDeletionRequestsTable.userId, user.id),
        eq(accountDeletionRequestsTable.status, "pending")
      )
    )
    .limit(1);

  if (existing) {
    res.status(409).json({ error: "You already have a pending deletion request under review." });
    return;
  }

  await db.insert(accountDeletionRequestsTable).values({
    userId: user.id,
    reason: reason ?? null,
    status: "pending",
  });

  // Notify admin
  const adminEmail = process.env["ADMIN_EMAIL"];
  if (adminEmail) {
    await sendEmail({
      to: adminEmail,
      subject: "Account deletion request — Scholix",
      html: `<p>User <strong>${user.firstName} ${user.lastName}</strong> (${user.email}) has requested account deletion.</p>${reason ? `<p>Reason: ${reason}</p>` : ""}`,
    });
  }

  // Confirm to user
  await sendEmail({
    to: user.email,
    subject: "Deletion request received — Scholix",
    html: accountDeletionConfirmEmailHtml({ firstName: user.firstName }),
  });

  res.json({ ok: true });
});

// Debug: admin status (admin only, no passwords exposed)
router.get("/auth/debug/admin-status", requireAdmin, async (req, res) => {
  const adminEmail = process.env["ADMIN_EMAIL"];

  const [admin] = await db
    .select({ id: usersTable.id, email: usersTable.email, createdAt: usersTable.createdAt })
    .from(usersTable)
    .where(eq(usersTable.role, "admin"))
    .limit(1);

  const maskedEmail = adminEmail
    ? adminEmail.replace(/(.{2}).*(@.*)/, "$1***$2")
    : null;

  res.json({
    adminExists: !!admin,
    seedRan: !!adminEmail,
    configuredEmail: maskedEmail,
    adminCreatedAt: admin?.createdAt?.toISOString() ?? null,
  });
});

export default router;
