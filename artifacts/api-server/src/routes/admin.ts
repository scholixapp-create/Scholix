import { Router } from "express";
import { db, usersTable, tutorsTable, sessionsTable, invoicesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { ApproveTutorBody } from "@workspace/api-zod";

const router = Router();

router.get("/admin/users", async (_req, res) => {
  const users = await db.select().from(usersTable);
  res.json(
    users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      createdAt: u.createdAt.toISOString(),
    }))
  );
});

router.post("/admin/tutors/:tutorId/approve", async (req, res) => {
  const tutorId = parseInt(req.params.tutorId, 10);
  const parsed = ApproveTutorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  await db
    .update(tutorsTable)
    .set({ isApproved: parsed.data.approved })
    .where(eq(tutorsTable.id, tutorId));

  const [row] = await db
    .select()
    .from(tutorsTable)
    .innerJoin(usersTable, eq(tutorsTable.userId, usersTable.id))
    .where(eq(tutorsTable.id, tutorId))
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Tutor not found" });
    return;
  }

  res.json({
    id: row.tutors.id,
    userId: row.tutors.userId,
    firstName: row.users.firstName,
    lastName: row.users.lastName,
    email: row.users.email,
    bio: row.tutors.bio ?? null,
    subjects: row.tutors.subjects ?? [],
    hourlyRate: row.tutors.hourlyRate,
    isApproved: row.tutors.isApproved,
    createdAt: row.tutors.createdAt.toISOString(),
  });
});

router.get("/admin/stats", async (_req, res) => {
  const [userCount] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable);
  const [tutorCount] = await db.select({ count: sql<number>`count(*)::int` }).from(tutorsTable);
  const [approvedCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tutorsTable)
    .where(eq(tutorsTable.isApproved, true));

  const sessions = await db.select().from(sessionsTable);
  const completedSessions = sessions.filter((s) => s.status === "completed");
  const scheduledSessions = sessions.filter((s) => s.status === "scheduled");

  const invoices = await db.select().from(invoicesTable);
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const platformCommission = invoices.reduce((sum, inv) => sum + inv.platformCommission, 0);

  const studentCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usersTable)
    .where(eq(usersTable.role, "student"));

  res.json({
    totalUsers: userCount.count,
    totalTutors: tutorCount.count,
    approvedTutors: approvedCount.count,
    totalStudents: studentCount[0].count,
    totalSessions: sessions.length,
    completedSessions: completedSessions.length,
    scheduledSessions: scheduledSessions.length,
    totalRevenue,
    platformCommission,
  });
});

export default router;
