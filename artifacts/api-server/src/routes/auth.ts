import { Router } from "express";
import { db, usersTable, tutorsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";
import {
  LoginBody,
  SignupBody,
} from "@workspace/api-zod";

const router = Router();

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "scholix_salt").digest("hex");
}

function makeToken(userId: number): string {
  return Buffer.from(`${userId}:${Date.now()}`).toString("base64");
}

/** Normalise and validate Australian mobile numbers.
 *  Accepts: 04XX XXX XXX, 04XXXXXXXX, +61 4XX XXX XXX, +614XXXXXXXX
 *  Returns null if invalid.
 */
function normaliseAuPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  // +614XXXXXXXX → 04XXXXXXXX
  if (digits.startsWith("614") && digits.length === 11) {
    return "0" + digits.slice(2);
  }
  // 04XXXXXXXX
  if (digits.startsWith("04") && digits.length === 10) {
    return digits;
  }
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

router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { email, password } = parsed.data;
  const hash = hashPassword(password);

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  if (!user || user.passwordHash !== hash) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  res.json({ user: userToJson(user), token: makeToken(user.id) });
});

router.post("/auth/signup", async (req, res) => {
  const parsed = SignupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { email, password, firstName, lastName, role, phone } = parsed.data;

  // Validate phone if provided
  let normalisedPhone: string | null = null;
  if (phone) {
    normalisedPhone = normaliseAuPhone(phone);
    if (!normalisedPhone) {
      res.status(400).json({ error: "Please enter a valid Australian mobile number (e.g. 0412 345 678)" });
      return;
    }
  } else {
    // Phone is required — must be provided
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
      passwordHash: hashPassword(password),
      firstName,
      lastName,
      role,
      phone: normalisedPhone,
    })
    .returning();

  if (role === "tutor") {
    await db.insert(tutorsTable).values({
      userId: user.id,
      subjects: [],
      hourlyRate: 65,
      isApproved: false,
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

export default router;
