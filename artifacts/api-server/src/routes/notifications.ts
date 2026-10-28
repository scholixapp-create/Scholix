import { Router } from "express";
import { db, notificationsTable, studentsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/authMiddleware";

const router = Router();

router.get("/notifications", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;

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

router.patch("/notifications/read-all", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;

  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)));

  res.json({ ok: true });
});

router.patch("/notifications/:id/read", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;

  const id = parseInt(req.params["id"] as string, 10);
  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, userId)));

  res.json({ ok: true });
});

router.delete("/notifications/:id", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;

  const id = parseInt(req.params["id"] as string, 10);
  await db
    .delete(notificationsTable)
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, userId)));

  res.json({ ok: true });
});

// Student requests a session — notifies their parent
router.post("/notifications/request-session", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;

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
