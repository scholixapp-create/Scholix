import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function getUserId(authHeader: string | undefined): number | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const decoded = Buffer.from(authHeader.slice(7), "base64").toString("utf-8");
    const id = parseInt(decoded.split(":")[0], 10);
    return isNaN(id) ? null : id;
  } catch { return null; }
}

router.get("/settings", async (req, res) => {
  const userId = getUserId(req.headers.authorization);
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  const [user] = await db
    .select({ emailNotificationsEnabled: usersTable.emailNotificationsEnabled })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  res.json({ emailNotificationsEnabled: user.emailNotificationsEnabled });
});

router.put("/settings", async (req, res) => {
  const userId = getUserId(req.headers.authorization);
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { emailNotificationsEnabled } = req.body as { emailNotificationsEnabled?: boolean };

  if (typeof emailNotificationsEnabled !== "boolean") {
    res.status(400).json({ error: "emailNotificationsEnabled must be a boolean" });
    return;
  }

  await db
    .update(usersTable)
    .set({ emailNotificationsEnabled })
    .where(eq(usersTable.id, userId));

  res.json({ emailNotificationsEnabled });
});

export default router;
