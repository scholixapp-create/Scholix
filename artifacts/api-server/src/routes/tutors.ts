import { Router } from "express";
import { db, tutorsTable, usersTable, availabilityTable, tutorUnavailablePeriodsTable, studentsTable, sessionsTable, tutorComplianceTable, tutorRelationshipsTable } from "@workspace/db";
import { eq, inArray, and, isNotNull, isNull, lte, gte, asc } from "drizzle-orm";
import { UpdateTutorProfileBody, SetTutorAvailabilityBody, CreateTutorUnavailablePeriodBody, CreateTutorLessonOfferBody } from "@workspace/api-zod";
import { requireAuth, getUserIdFromBearer, type AuthRequest } from "../lib/authMiddleware";
import { tutorSlots } from "../lib/schedulingStore";
import { BookingError, localDate, localTime, validDate, type LessonMode } from "../lib/scheduling";
import { lockBookableStudent } from "../lib/accountRemoval";
import { lockBookableTutor } from "../lib/bookableTutor";
import { createNotification } from "../lib/notify";
import { bookingStatusEmailHtml } from "../lib/email";
import { config } from "../lib/config";

const router = Router();

async function isPublicTutor(tutorId: number): Promise<boolean> {
  if (!Number.isSafeInteger(tutorId) || tutorId <= 0) return false;
  const [row] = await db.select({ id: tutorsTable.id }).from(tutorsTable)
    .innerJoin(usersTable, eq(tutorsTable.userId, usersTable.id))
    .where(and(eq(tutorsTable.id, tutorId), eq(usersTable.isActive, true), eq(tutorsTable.isApproved, true))).limit(1);
  return !!row;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseDurations(raw: string | null | undefined): number[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === "number");
  } catch {
    /* noop */
  }
  return null;
}

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
    verificationStatus: tutor.verificationStatus ?? "pending",
    educationDetails: (tutor as Record<string, unknown>).educationDetails as string | null ?? null,
    sessionCount,
    sessionDurations: parseDurations(tutor.sessionDurations),
    teachingMode: tutor.teachingMode ?? "online",
    travelBufferMinutes: tutor.travelBufferMinutes ?? 0,
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

function windowToJson(s: typeof availabilityTable.$inferSelect) {
  return {
    id: s.id,
    tutorId: s.tutorId,
    dayOfWeek: s.dayOfWeek as number,
    startTime: s.startTime,
    endTime: s.endTime,
    timezone: s.timezone ?? "Australia/Melbourne",
  };
}

function timeToMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minsToTime(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

// ── Tutor CRUD ────────────────────────────────────────────────────────────────

router.get("/tutors", async (_req, res) => {
  const tutors = await db
    .select()
    .from(tutorsTable)
    .innerJoin(usersTable, eq(tutorsTable.userId, usersTable.id))
    .where(and(eq(tutorsTable.isApproved, true), eq(usersTable.isActive, true)));

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
  if (!await isPublicTutor(tutorId)) {
    res.status(404).json({ error: "Tutor is unavailable" }); return;
  }
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
    if (parsed.data.hourlyRate < 50) {
      res.status(400).json({ error: "Minimum hourly rate is $50" });
      return;
    }
    updates.hourlyRate = parsed.data.hourlyRate;
  }
  if (parsed.data.sessionDurations !== undefined) {
    updates.sessionDurations = JSON.stringify(parsed.data.sessionDurations);
  }

  // Extra fields not yet in the OpenAPI schema — read directly from req.body
  const { teachingMode, travelBufferMinutes } = req.body ?? {};
  if (typeof teachingMode === "string" && ["online", "in_person", "both"].includes(teachingMode)) {
    updates.teachingMode = teachingMode;
  }
  if (typeof travelBufferMinutes === "number" && travelBufferMinutes >= 0) {
    updates.travelBufferMinutes = travelBufferMinutes;
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

// ── Availability windows ──────────────────────────────────────────────────────

// GET /tutors/:tutorId/availability — returns weekly recurring windows
router.get("/tutors/:tutorId/availability", async (req, res) => {
  const tutorId = parseInt(req.params.tutorId, 10);
  if (!await isPublicTutor(tutorId)) {
    res.status(404).json({ error: "Tutor is unavailable" }); return;
  }
  const windows = await db
    .select()
    .from(availabilityTable)
    .where(and(eq(availabilityTable.tutorId, tutorId), isNotNull(availabilityTable.dayOfWeek)));

  res.json(windows.map(windowToJson));
});

// PUT /tutors/:tutorId/availability — replace all windows
router.put("/tutors/:tutorId/availability", requireAuth, async (req, res) => {
  const tutorId = parseInt(req.params.tutorId as string, 10);
  const actor = (req as AuthRequest).user;
  const [owner] = await db.select({ userId: tutorsTable.userId }).from(tutorsTable).where(eq(tutorsTable.id, tutorId));
  if (!owner || (actor.role !== "admin" && (actor.role !== "tutor" || owner.userId !== actor.id))) {
    res.status(403).json({ error: "Only this tutor or an admin can update availability" }); return;
  }
  const parsed = SetTutorAvailabilityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const validClock = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (parsed.data.windows.some((w) => !Number.isInteger(w.dayOfWeek) || w.dayOfWeek < 0 || w.dayOfWeek > 6
    || !validClock.test(w.startTime) || !validClock.test(w.endTime) || w.startTime >= w.endTime)) {
    res.status(400).json({ error: "Use valid same-day availability windows with an end after the start" }); return;
  }
  await db.transaction(async (tx) => {
    await tx.select({ id: tutorsTable.id }).from(tutorsTable).where(eq(tutorsTable.id, tutorId)).for("update");
    await tx.delete(availabilityTable).where(eq(availabilityTable.tutorId, tutorId));
    if (parsed.data.windows.length) await tx.insert(availabilityTable).values(parsed.data.windows.map((w) => ({
      tutorId, dayOfWeek: w.dayOfWeek, startTime: w.startTime, endTime: w.endTime, timezone: "Australia/Melbourne",
    })));
  });

  const windows = await db
    .select()
    .from(availabilityTable)
    .where(and(eq(availabilityTable.tutorId, tutorId), isNotNull(availabilityTable.dayOfWeek)));

  res.json(windows.map(windowToJson));
});

router.get("/tutors/:tutorId/unavailable-periods", requireAuth, async (req, res) => {
  const tutorId = Number(req.params.tutorId as string);
  const actor = (req as AuthRequest).user;
  if (!Number.isSafeInteger(tutorId) || tutorId <= 0) {
    res.status(400).json({ error: "Invalid tutor ID" }); return;
  }
  const [owner] = await db.select({ userId: tutorsTable.userId }).from(tutorsTable)
    .where(eq(tutorsTable.id, tutorId)).limit(1);
  if (!owner || (actor.role !== "admin" && (actor.role !== "tutor" || owner.userId !== actor.id))) {
    res.status(403).json({ error: "Only this tutor or an admin can view blocked dates" }); return;
  }
  const periods = await db.select().from(tutorUnavailablePeriodsTable)
    .where(eq(tutorUnavailablePeriodsTable.tutorId, tutorId))
    .orderBy(asc(tutorUnavailablePeriodsTable.startDate));
  res.setHeader("Cache-Control", "private, no-store");
  res.json(periods);
});

router.post("/tutors/:tutorId/unavailable-periods", requireAuth, async (req, res) => {
  const tutorId = Number(req.params.tutorId as string);
  const actor = (req as AuthRequest).user;
  if (!Number.isSafeInteger(tutorId) || tutorId <= 0) {
    res.status(400).json({ error: "Invalid tutor ID" }); return;
  }
  const [owner] = await db.select({ userId: tutorsTable.userId }).from(tutorsTable)
    .where(eq(tutorsTable.id, tutorId)).limit(1);
  if (!owner || (actor.role !== "admin" && (actor.role !== "tutor" || owner.userId !== actor.id))) {
    res.status(403).json({ error: "Only this tutor or an admin can block dates" }); return;
  }
  const parsed = CreateTutorUnavailablePeriodBody.safeParse(req.body);
  if (!parsed.success || !validDate(parsed.data?.startDate ?? "") || !validDate(parsed.data?.endDate ?? "")
    || parsed.data.startDate > parsed.data.endDate || parsed.data.startDate < localDate(new Date())) {
    res.status(400).json({ error: "Choose a date range starting today or later, with the end date on or after the start date" }); return;
  }
  const now = new Date();
  try {
    const period = await db.transaction(async (tx) => {
      await tx.select({ id: tutorsTable.id }).from(tutorsTable)
        .where(eq(tutorsTable.id, tutorId)).for("update");
      const overlap = await tx.select({ id: tutorUnavailablePeriodsTable.id })
        .from(tutorUnavailablePeriodsTable)
        .where(and(
          eq(tutorUnavailablePeriodsTable.tutorId, tutorId),
          lte(tutorUnavailablePeriodsTable.startDate, parsed.data.endDate),
          gte(tutorUnavailablePeriodsTable.endDate, parsed.data.startDate),
        )).limit(1);
      if (overlap.length) throw new BookingError("This date range overlaps an existing blocked period", 409);

      const sessions = await tx.select().from(sessionsTable).where(and(
        eq(sessionsTable.tutorId, tutorId),
        inArray(sessionsTable.status, ["pending_payment", "pending_confirmation", "scheduled"]),
      ));
      const hasConflicts = sessions.some((session) => {
        const active = session.status === "scheduled" || (session.requestExpiresAt
          ? session.requestExpiresAt > now
          : session.createdAt.getTime() + 15 * 60_000 > now.getTime());
        if (!active) return false;
        const date = localDate(session.scheduledAt);
        return date >= parsed.data.startDate && date <= parsed.data.endDate;
      });
      if (hasConflicts) {
        throw new BookingError("This range contains existing sessions or active booking requests. Reschedule or cancel them first.", 409);
      }
      const [created] = await tx.insert(tutorUnavailablePeriodsTable).values({
        tutorId,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        note: parsed.data.note?.trim() || null,
      }).returning();
      return created;
    });
    res.status(201).json(period);
  } catch (error) {
    if (error instanceof BookingError) { res.status(error.statusCode).json({ error: error.message }); return; }
    throw error;
  }
});

router.delete("/tutors/:tutorId/unavailable-periods/:periodId", requireAuth, async (req, res) => {
  const tutorId = Number(req.params.tutorId as string);
  const periodId = Number(req.params.periodId as string);
  const actor = (req as AuthRequest).user;
  if (!Number.isSafeInteger(tutorId) || tutorId <= 0 || !Number.isSafeInteger(periodId) || periodId <= 0) {
    res.status(400).json({ error: "Invalid blocked date ID" }); return;
  }
  const [owner] = await db.select({ userId: tutorsTable.userId }).from(tutorsTable)
    .where(eq(tutorsTable.id, tutorId)).limit(1);
  if (!owner || (actor.role !== "admin" && (actor.role !== "tutor" || owner.userId !== actor.id))) {
    res.status(403).json({ error: "Only this tutor or an admin can remove blocked dates" }); return;
  }
  const [deleted] = await db.delete(tutorUnavailablePeriodsTable).where(and(
    eq(tutorUnavailablePeriodsTable.id, periodId),
    eq(tutorUnavailablePeriodsTable.tutorId, tutorId),
  )).returning({ id: tutorUnavailablePeriodsTable.id });
  if (!deleted) { res.status(404).json({ error: "Blocked date range not found" }); return; }
  res.status(204).end();
});

router.post("/tutors/:tutorId/offers", requireAuth, async (req, res) => {
  const tutorId = Number(req.params.tutorId as string);
  const actor = (req as AuthRequest).user;
  if (!Number.isSafeInteger(tutorId) || tutorId <= 0) {
    res.status(400).json({ error: "Invalid tutor ID" }); return;
  }
  const parsed = CreateTutorLessonOfferBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid lesson offer" }); return; }
  const [tutor] = await db.select().from(tutorsTable).where(and(
    eq(tutorsTable.id, tutorId), eq(tutorsTable.userId, actor.id),
  )).limit(1);
  if (actor.role !== "tutor" || !tutor) {
    res.status(403).json({ error: "Only this tutor can offer a lesson time" }); return;
  }
  const start = new Date(parsed.data.scheduledAt);
  if (!/Z$|[+-]\d{2}:\d{2}$/.test(parsed.data.scheduledAt) || Number.isNaN(start.getTime())
    || start.getUTCSeconds() || start.getUTCMilliseconds() || start.getUTCMinutes() % 15) {
    res.status(400).json({ error: "Choose a valid quarter-hour start with an explicit timezone" }); return;
  }
  const subject = parsed.data.subject.trim();
  if (!subject || subject.length > 200) { res.status(400).json({ error: "Enter a valid lesson subject" }); return; }
  try {
    const session = await db.transaction(async (tx) => {
      if (!await lockBookableStudent(tx, parsed.data.studentId) || !await lockBookableTutor(tx, tutorId)) {
        throw new BookingError("This tutor or student account is inactive or unavailable", 403);
      }
      const [currentTutor] = await tx.select().from(tutorsTable).where(eq(tutorsTable.id, tutorId)).limit(1);
      const [student] = await tx.select({ id: studentsTable.id, parentId: studentsTable.parentId })
        .from(studentsTable).where(eq(studentsTable.id, parsed.data.studentId)).limit(1);
      if (!currentTutor || !student?.parentId) throw new BookingError("Student not found", 404);
      const [parent] = await tx.select({
        role: usersTable.role, isActive: usersTable.isActive, archivedAt: usersTable.archivedAt,
        parentApproved: usersTable.parentApproved,
      }).from(usersTable).where(eq(usersTable.id, student.parentId)).limit(1);
      if (!parent || parent.role !== "parent" || !parent.isActive || parent.archivedAt || !parent.parentApproved) {
        throw new BookingError("The student's parent must have an active approved account to receive an offer", 403);
      }
      const [previousConnection] = await tx.select({ id: sessionsTable.id }).from(sessionsTable)
        .where(and(eq(sessionsTable.tutorId, tutorId), eq(sessionsTable.studentId, student.id))).limit(1);
      if (!previousConnection) throw new BookingError("Lesson offers can only be sent to students in your existing tutor relationship", 403);

      const slots = await tutorSlots(tx, currentTutor, student.parentId, localDate(start),
        parsed.data.durationMinutes, parsed.data.lessonMode);
      if (slots.slotInstants[localTime(start)] !== start.toISOString()) {
        throw new BookingError("That time is no longer available for this family. Choose another slot.");
      }
      const now = new Date();
      const expiresAt = new Date(Math.min(now.getTime() + 24 * 60 * 60_000, start.getTime()));
      const [created] = await tx.insert(sessionsTable).values({
        tutorId,
        studentId: student.id,
        subject,
        scheduledAt: start,
        durationMinutes: parsed.data.durationMinutes,
        status: "pending_payment",
        isPaid: false,
        totalAmount: (currentTutor.hourlyRate * parsed.data.durationMinutes) / 60,
        lessonMode: slots.lessonMode,
        travelBufferMinutes: slots.buffer,
        tutorConfirmedAt: now,
        requestExpiresAt: expiresAt,
      }).returning();
      return { created, parentId: student.parentId };
    });
    const title = "Your tutor offered a lesson time";
    const message = `${subject} on ${localDate(session.created.scheduledAt)} at ${localTime(session.created.scheduledAt)}. Accept by ${session.created.requestExpiresAt?.toLocaleString("en-AU", { timeZone: "Australia/Melbourne" })}. It will be confirmed when you accept; beta payment is simulated and no money is taken.`;
    await createNotification({
      userId: session.parentId,
      type: "action_confirm_session",
      title,
      message,
      actionUrl: "/parent/dashboard",
      actionLabel: "Review lesson offer",
      emailSubject: title,
      emailHtml: bookingStatusEmailHtml({
        title,
        message,
        actionUrl: new URL("/parent/dashboard", config.frontendUrl).toString(),
      }),
    });
    res.status(201).json(session.created);
  } catch (error) {
    if (error instanceof BookingError) { res.status(error.statusCode).json({ error: error.message }); return; }
    throw error;
  }
});

// ── Available slots (dynamic) ─────────────────────────────────────────────────
//
// GET /tutors/:tutorId/available-slots?date=YYYY-MM-DD&duration=60
//
router.get("/tutors/:tutorId/available-slots", async (req, res) => {
  const tutorId = parseInt(req.params.tutorId, 10);
  if (!await isPublicTutor(tutorId)) {
    res.status(404).json({ error: "Tutor is unavailable" }); return;
  }
  const mode = req.query.lessonMode;
  if (mode !== undefined && mode !== "online" && mode !== "in_person") {
    res.status(400).json({ error: "Invalid lesson mode" }); return;
  }
  const [tutor] = await db.select().from(tutorsTable).where(eq(tutorsTable.id, tutorId));
  if (!tutor || tutor.verificationStatus !== "verified") {
    res.status(404).json({ error: "Tutor is unavailable" }); return;
  }
  try {
    // Parents use their own token identity. A tutor may specify one of their existing
    // students so offered times use that family's mode and travel preferences.
    let parentId = await getUserIdFromBearer(req.headers.authorization);
    if (req.query.studentId !== undefined) {
      const studentId = Number(req.query.studentId);
      if (!Number.isSafeInteger(studentId) || studentId <= 0) {
        res.status(400).json({ error: "Invalid student ID" }); return;
      }
      const [link] = await db.select({
        parentId: studentsTable.parentId,
        tutorUserId: tutorsTable.userId,
      }).from(studentsTable)
        .innerJoin(sessionsTable, and(eq(sessionsTable.studentId, studentsTable.id), eq(sessionsTable.tutorId, tutorId)))
        .innerJoin(tutorsTable, eq(tutorsTable.id, sessionsTable.tutorId))
        .where(eq(studentsTable.id, studentId)).limit(1);
      if (!link?.parentId || (parentId !== link.parentId && parentId !== link.tutorUserId)) {
        res.status(403).json({ error: "Student availability is only available to their parent or assigned tutor" }); return;
      }
      parentId = link.parentId;
    }
    const { buffer, ...result } = await tutorSlots(db, tutor, parentId, String(req.query.date ?? ""),
      Number(req.query.duration), mode as LessonMode | undefined);
    res.setHeader("Cache-Control", "no-store");
    res.json(result);
  } catch (err) {
    if (err instanceof BookingError) { res.status(err.statusCode).json({ error: err.message }); return; }
    throw err;
  }
});

// ── Tutor students ────────────────────────────────────────────────────────────

router.get("/tutors/:tutorId/students", requireAuth, async (req, res) => {
  const user = (req as AuthRequest).user;
  const tutorId = Number(req.params.tutorId);
  if (!Number.isSafeInteger(tutorId) || tutorId <= 0) {
    res.status(400).json({ error: "Invalid tutor ID" });
    return;
  }
  if (user.role !== "admin") {
    if (user.role !== "tutor") {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    const [ownedTutor] = await db.select({ id: tutorsTable.id })
      .from(tutorsTable)
      .where(and(eq(tutorsTable.id, tutorId), eq(tutorsTable.userId, user.id)))
      .limit(1);
    if (!ownedTutor) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
  }

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
    .where(and(inArray(studentsTable.id, studentIds), isNull(studentsTable.archivedAt)));

  res.json(
    students.map((s) => ({
      id: s.id,
      userId: s.userId ?? null,
      firstName: s.firstName,
      lastName: s.lastName,
      email: s.email,
      yearLevel: s.gradeLevel ?? null,
      school: s.school ?? null,
      subjects: s.subjects ?? null,
      goals: s.goals ?? null,
      parentId: s.parentId ?? null,
      createdAt: s.createdAt.toISOString(),
    }))
  );
});

// ── Per-parent relationship preferences ──────────────────────────────────────

router.get("/tutors/:tutorId/relationships", requireAuth, async (req, res) => {
  const user = (req as AuthRequest).user;
  const tutorId = parseInt(req.params.tutorId as string, 10);

  // Only the tutor who owns this profile may list their relationships
  const [tutor] = await db
    .select({ id: tutorsTable.id })
    .from(tutorsTable)
    .where(and(eq(tutorsTable.id, tutorId), eq(tutorsTable.userId, user.id)))
    .limit(1);

  if (!tutor) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const rows = await db
    .select()
    .from(tutorRelationshipsTable)
    .where(eq(tutorRelationshipsTable.tutorId, tutorId));

  res.json(
    rows.map((r) => ({
      id: r.id,
      tutorId: r.tutorId,
      parentId: r.parentId,
      lessonMode: r.lessonMode ?? null,
      travelBufferMinutes: r.travelBufferMinutes ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }))
  );
});

router.get("/tutors/:tutorId/relationships/:parentId", requireAuth, async (req, res) => {
  const user = (req as AuthRequest).user;
  const tutorId = parseInt(req.params.tutorId as string, 10);
  const parentId = parseInt(req.params.parentId as string, 10);

  // Accessible by: the tutor who owns the profile, or the parent themselves
  const isTutor = await db
    .select({ id: tutorsTable.id })
    .from(tutorsTable)
    .where(and(eq(tutorsTable.id, tutorId), eq(tutorsTable.userId, user.id)))
    .limit(1)
    .then((rows) => rows.length > 0);

  const isParent = user.id === parentId;

  if (!isTutor && !isParent) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [row] = await db
    .select()
    .from(tutorRelationshipsTable)
    .where(
      and(
        eq(tutorRelationshipsTable.tutorId, tutorId),
        eq(tutorRelationshipsTable.parentId, parentId)
      )
    )
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "No relationship record found" });
    return;
  }

  res.json({
    id: row.id,
    tutorId: row.tutorId,
    parentId: row.parentId,
    lessonMode: row.lessonMode ?? null,
    travelBufferMinutes: row.travelBufferMinutes ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
});

router.put("/tutors/:tutorId/relationships/:parentId", requireAuth, async (req, res) => {
  const user = (req as AuthRequest).user;
  const tutorId = parseInt(req.params.tutorId as string, 10);
  const parentId = parseInt(req.params.parentId as string, 10);

  // Only the tutor who owns this profile may set preferences
  const [tutor] = await db
    .select({ id: tutorsTable.id })
    .from(tutorsTable)
    .where(and(eq(tutorsTable.id, tutorId), eq(tutorsTable.userId, user.id)))
    .limit(1);

  if (!tutor) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { lessonMode, travelBufferMinutes } = req.body ?? {};

  const validModes = ["online", "in_person", null, undefined];
  if (!validModes.includes(lessonMode)) {
    res.status(400).json({ error: "lessonMode must be 'online', 'in_person', or null" });
    return;
  }

  if (travelBufferMinutes !== null && travelBufferMinutes !== undefined && typeof travelBufferMinutes !== "number") {
    res.status(400).json({ error: "travelBufferMinutes must be a number or null" });
    return;
  }

  const now = new Date();

  const [row] = await db
    .insert(tutorRelationshipsTable)
    .values({
      tutorId,
      parentId,
      lessonMode: lessonMode ?? null,
      travelBufferMinutes: travelBufferMinutes ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [tutorRelationshipsTable.tutorId, tutorRelationshipsTable.parentId],
      set: {
        lessonMode: lessonMode ?? null,
        travelBufferMinutes: travelBufferMinutes ?? null,
        updatedAt: now,
      },
    })
    .returning();

  res.json({
    id: row.id,
    tutorId: row.tutorId,
    parentId: row.parentId,
    lessonMode: row.lessonMode ?? null,
    travelBufferMinutes: row.travelBufferMinutes ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
});

// ── Compliance ────────────────────────────────────────────────────────────────

router.get("/tutors/me/compliance", requireAuth, async (req, res) => {
  const user = (req as AuthRequest).user;
  const [tutor] = await db
    .select({ id: tutorsTable.id })
    .from(tutorsTable)
    .where(eq(tutorsTable.userId, user.id))
    .limit(1);

  if (!tutor) {
    res.status(404).json({ error: "Tutor profile not found" });
    return;
  }

  const [compliance] = await db
    .select()
    .from(tutorComplianceTable)
    .where(eq(tutorComplianceTable.tutorId, tutor.id))
    .limit(1);

  res.json({
    wwccDeclared: compliance?.wwccDeclared ?? false,
    codeOfConductAccepted: compliance?.codeOfConductAccepted ?? false,
    acceptedAt: compliance?.acceptedAt?.toISOString() ?? null,
  });
});

router.post("/tutors/me/compliance", requireAuth, async (req, res) => {
  const user = (req as AuthRequest).user;
  const { wwccDeclared, codeOfConductAccepted } = req.body ?? {};

  if (typeof wwccDeclared !== "boolean" || typeof codeOfConductAccepted !== "boolean") {
    res.status(400).json({ error: "wwccDeclared and codeOfConductAccepted must be booleans" });
    return;
  }

  const [tutor] = await db
    .select({ id: tutorsTable.id })
    .from(tutorsTable)
    .where(eq(tutorsTable.userId, user.id))
    .limit(1);

  if (!tutor) {
    res.status(404).json({ error: "Tutor profile not found" });
    return;
  }

  const acceptedAt = wwccDeclared && codeOfConductAccepted ? new Date() : null;

  await db
    .insert(tutorComplianceTable)
    .values({ tutorId: tutor.id, wwccDeclared, codeOfConductAccepted, acceptedAt })
    .onConflictDoUpdate({
      target: tutorComplianceTable.tutorId,
      set: { wwccDeclared, codeOfConductAccepted, acceptedAt },
    });

  res.json({ ok: true, wwccDeclared, codeOfConductAccepted, acceptedAt: acceptedAt?.toISOString() ?? null });
});

export default router;
