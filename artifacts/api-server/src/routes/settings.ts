import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/authMiddleware";

const router = Router();

router.get("/settings", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;

  const [user] = await db
    .select({
      emailNotificationsEnabled: usersTable.emailNotificationsEnabled,
      notifBookingConfirmation: usersTable.notifBookingConfirmation,
      notifSessionReminder: usersTable.notifSessionReminder,
      notifSessionCompleted: usersTable.notifSessionCompleted,
      notifPaymentConfirmed: usersTable.notifPaymentConfirmed,
      notifApprovalUpdates: usersTable.notifApprovalUpdates,
      phone: usersTable.phone,
      address: usersTable.address,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  res.json({ ...user, phone: user.phone ?? "", address: user.address ?? "" });
});

router.put("/settings", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;

  const body = req.body as Record<string, unknown>;

  const boolFields = [
    "emailNotificationsEnabled",
    "notifBookingConfirmation",
    "notifSessionReminder",
    "notifSessionCompleted",
    "notifPaymentConfirmed",
    "notifApprovalUpdates",
  ] as const;

  type AllowedField = typeof boolFields[number];
  const updates: Partial<Record<AllowedField, boolean>> & { phone?: string; address?: string } = {};

  for (const field of boolFields) {
    if (typeof body[field] === "boolean") {
      updates[field] = body[field] as boolean;
    }
  }
  if (typeof body.phone === "string") updates.phone = body.phone.trim();
  if (typeof body.address === "string") updates.address = body.address.trim();

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields provided" });
    return;
  }

  await db.update(usersTable).set(updates).where(eq(usersTable.id, userId));

  res.json({ ok: true });
});

export default router;
