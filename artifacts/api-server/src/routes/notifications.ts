import { Router } from "express";
import { db, notificationsTable, studentsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

function getUserIdFromToken(authHeader: string | undefined): number | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice(7);
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const userId = parseInt(decoded.split(":")[0], 10);
    return isNaN(userId) ? null : userId;
  } catch {
    return null;
  }
}

router.get("/notifications", async (req, res) => {
  const userId = getUserIdFromToken(req.headers.authorization);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);

  res.json(notifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    actionUrl: n.actionUrl ?? null,
    actionLabel: n.actionLabel ?? null,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  })));
});

router.patch("/notifications/read-all", async (req, res) => {
  const userId = getUserIdFromToken(req.headers.authorization);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)));

  res.json({ ok: true });
});

router.patch("/notifications/:id/read", async (req, res) => {
  const userId = getUserIdFromToken(req.headers.authorization);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id, 10);
  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, userId)));

  res.json({ ok: true });
});

router.delete("/notifications/:id", async (req, res) => {
  const userId = getUserIdFromToken(req.headers.authorization);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id, 10);
  await db
    .delete(notificationsTable)
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, userId)));

  res.json({ ok: true });
});

// Student requests a session — notifies their parent
router.post("/notifications/request-session", async (req, res) => {
  const userId = getUserIdFromToken(req.headers.authorization);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [student] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.userId, userId))
    .limit(1);

  if (!student) {
    res.status(400).json({ error: "No student profile found for this account" });
    return;
  }

  if (!student.parentId) {
    res.status(400).json({ error: "No parent linked to this student account" });
    return;
  }

  await db.insert(notificationsTable).values({
    userId: student.parentId,
    type: "session_booked" as any,
    title: "Session request from your student",
    message: `${student.firstName} is asking you to book a tutoring session. Browse available tutors to get started.`,
    actionUrl: "/parent/tutors",
    actionLabel: "Browse tutors",
    isRead: false,
  });

  res.json({ ok: true });
});

export default router;
