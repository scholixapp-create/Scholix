import { Router } from "express";
import { db, tutorsTable, usersTable, availabilityTable, studentsTable, sessionsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { UpdateTutorProfileBody, SetTutorAvailabilityBody } from "@workspace/api-zod";

const router = Router();

function tutorToJson(tutor: typeof tutorsTable.$inferSelect, user: typeof usersTable.$inferSelect) {
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
    createdAt: tutor.createdAt.toISOString(),
  };
}

router.get("/tutors", async (_req, res) => {
  const tutors = await db
    .select()
    .from(tutorsTable)
    .innerJoin(usersTable, eq(tutorsTable.userId, usersTable.id))
    .where(eq(tutorsTable.isApproved, true));

  res.json(tutors.map((r) => tutorToJson(r.tutors, r.users)));
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
  res.json(tutorToJson(row.tutors, row.users));
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
  res.json(tutorToJson(row.tutors, row.users));
});

router.get("/tutors/:tutorId/availability", async (req, res) => {
  const tutorId = parseInt(req.params.tutorId, 10);
  const slots = await db
    .select()
    .from(availabilityTable)
    .where(eq(availabilityTable.tutorId, tutorId));

  res.json(
    slots.map((s) => ({
      id: s.id,
      tutorId: s.tutorId,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
    }))
  );
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
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
      }))
    );
  }

  const slots = await db.select().from(availabilityTable).where(eq(availabilityTable.tutorId, tutorId));
  res.json(slots.map((s) => ({ id: s.id, tutorId: s.tutorId, dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime })));
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
