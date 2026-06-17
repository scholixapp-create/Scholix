import { Router } from "express";
import { db, tutorsTable, usersTable, availabilityTable, studentsTable, sessionsTable } from "@workspace/db";
import { eq, inArray, and } from "drizzle-orm";
import { UpdateTutorProfileBody, SetTutorAvailabilityBody } from "@workspace/api-zod";

const router = Router();

function tutorToJson(
  tutor: typeof tutorsTable.$inferSelect,
  user: typeof usersTable.$inferSelect,
  sessionCount = 0
) {
  return {
    id: tutor.id,
    userId: tutor.userId,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    bio: tutor.bio ?? null,
    subjects: tutor.subjects ?? [],
    hourlyRate: tutor.hourlyRate,
    isApproved: tutor.isApproved,
    verificationStatus: tutor.verificationStatus ?? "pending_verification",
    educationDetails: (tutor as Record<string, unknown>).educationDetails as string | null ?? null,
    sessionCount,
    createdAt: tutor.createdAt.toISOString(),
  };
}

async function getSessionCount(tutorId: number): Promise<number> {
  const rows = await db
    .select({ id: sessionsTable.id })
    .from(sessionsTable)
    .where(and(eq(sessionsTable.tutorId, tutorId), eq(sessionsTable.status, "completed")));
  return rows.length;
}

router.get("/tutors", async (_req, res) => {
  const tutors = await db
    .select()
    .from(tutorsTable)
    .innerJoin(usersTable, eq(tutorsTable.userId, usersTable.id))
    .where(eq(tutorsTable.isApproved, true));

  const result = await Promise.all(
    tutors.map(async (r) => {
      const count = await getSessionCount(r.tutors.id);
      return tutorToJson(r.tutors, r.users, count);
    })
  );
  res.json(result);
});

router.get("/tutors/:tutorId", async (req, res) => {
  const tutorId = parseInt(req.params.tutorId, 10);
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
  const count = await getSessionCount(tutorId);
  res.json(tutorToJson(row.tutors, row.users, count));
});

router.put("/tutors/:tutorId/profile", async (req, res) => {
  const tutorId = parseInt(req.params.tutorId, 10);
  const parsed = UpdateTutorProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const updates: Partial<typeof tutorsTable.$inferInsert> = {};
  if (parsed.data.bio !== undefined) updates.bio = parsed.data.bio;
  if (parsed.data.subjects !== undefined) updates.subjects = parsed.data.subjects;
  if (parsed.data.hourlyRate !== undefined) {
    if (parsed.data.hourlyRate < 65) {
      res.status(400).json({ error: "Minimum hourly rate is $65" });
      return;
    }
    updates.hourlyRate = parsed.data.hourlyRate;
  }

  await db.update(tutorsTable).set(updates).where(eq(tutorsTable.id, tutorId));

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
  const count = await getSessionCount(tutorId);
  res.json(tutorToJson(row.tutors, row.users, count));
});

function slotToJson(s: typeof availabilityTable.$inferSelect) {
  return {
    id: s.id,
    tutorId: s.tutorId,
    date: s.date,
    startTime: s.startTime,
    endTime: s.endTime,
    isBooked: s.isBooked,
  };
}

router.get("/tutors/:tutorId/availability", async (req, res) => {
  const tutorId = parseInt(req.params.tutorId, 10);
  const slots = await db
    .select()
    .from(availabilityTable)
    .where(eq(availabilityTable.tutorId, tutorId));

  res.json(slots.map(slotToJson));
});

router.put("/tutors/:tutorId/availability", async (req, res) => {
  const tutorId = parseInt(req.params.tutorId, 10);
  const parsed = SetTutorAvailabilityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  await db.delete(availabilityTable).where(eq(availabilityTable.tutorId, tutorId));

  if (parsed.data.slots.length > 0) {
    await db.insert(availabilityTable).values(
      parsed.data.slots.map((s) => ({
        tutorId,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        isBooked: false,
      }))
    );
  }

  const slots = await db.select().from(availabilityTable).where(eq(availabilityTable.tutorId, tutorId));
  res.json(slots.map(slotToJson));
});

router.post("/tutors/:tutorId/availability", async (req, res) => {
  const tutorId = parseInt(req.params.tutorId, 10);
  const { date, startTime, endTime } = req.body as { date?: string; startTime?: string; endTime?: string };
  if (!date || !startTime || !endTime) {
    res.status(400).json({ error: "date, startTime, endTime required" });
    return;
  }

  const [slot] = await db
    .insert(availabilityTable)
    .values({ tutorId, date, startTime, endTime, isBooked: false })
    .returning();

  res.status(201).json(slotToJson(slot));
});

router.delete("/tutors/:tutorId/availability/:slotId", async (req, res) => {
  const slotId = parseInt(req.params.slotId, 10);
  const tutorId = parseInt(req.params.tutorId, 10);

  const [deleted] = await db
    .delete(availabilityTable)
    .where(and(eq(availabilityTable.id, slotId), eq(availabilityTable.tutorId, tutorId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Slot not found" });
    return;
  }
  res.json({ ok: true });
});

router.get("/tutors/:tutorId/students", async (req, res) => {
  const tutorId = parseInt(req.params.tutorId, 10);

  const sessionRows = await db
    .select({ studentId: sessionsTable.studentId })
    .from(sessionsTable)
    .where(eq(sessionsTable.tutorId, tutorId));

  const studentIds = [...new Set(sessionRows.map((r) => r.studentId))];

  if (studentIds.length === 0) {
    res.json([]);
    return;
  }

  const students = await db
    .select()
    .from(studentsTable)
    .where(inArray(studentsTable.id, studentIds));

  res.json(
    students.map((s) => ({
      id: s.id,
      userId: s.userId ?? null,
      firstName: s.firstName,
      lastName: s.lastName,
      email: s.email,
      gradeLevel: s.gradeLevel ?? null,
      parentId: s.parentId ?? null,
      createdAt: s.createdAt.toISOString(),
    }))
  );
});

export default router;
