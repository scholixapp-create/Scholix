import { Router } from "express";
import { db, tutorsTable, usersTable, availabilityTable, studentsTable, sessionsTable, tutorComplianceTable, tutorRelationshipsTable } from "@workspace/db";
import { eq, inArray, and, isNotNull } from "drizzle-orm";
import { UpdateTutorProfileBody, SetTutorAvailabilityBody } from "@workspace/api-zod";
import { requireAuth, parseUserId, type AuthRequest } from "../lib/authMiddleware";

const router = Router();

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
  const windows = await db
    .select()
    .from(availabilityTable)
    .where(and(eq(availabilityTable.tutorId, tutorId), isNotNull(availabilityTable.dayOfWeek)));

  res.json(windows.map(windowToJson));
});

// PUT /tutors/:tutorId/availability — replace all windows
router.put("/tutors/:tutorId/availability", async (req, res) => {
  const tutorId = parseInt(req.params.tutorId, 10);
  const parsed = SetTutorAvailabilityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  // Delete all existing windows for this tutor
  await db.delete(availabilityTable).where(eq(availabilityTable.tutorId, tutorId));

  if (parsed.data.windows.length > 0) {
    await db.insert(availabilityTable).values(
      parsed.data.windows.map((w) => ({
        tutorId,
        dayOfWeek: w.dayOfWeek,
        startTime: w.startTime,
        endTime: w.endTime,
        timezone: "Australia/Melbourne",
      }))
    );
  }

  const windows = await db
    .select()
    .from(availabilityTable)
    .where(and(eq(availabilityTable.tutorId, tutorId), isNotNull(availabilityTable.dayOfWeek)));

  res.json(windows.map(windowToJson));
});

// ── Available slots (dynamic) ─────────────────────────────────────────────────
//
// GET /tutors/:tutorId/available-slots?date=YYYY-MM-DD&duration=60
//
// Melbourne is AEST (UTC+10) or AEDT (UTC+11 during summer).
// We use a fixed UTC+10 offset for MVP simplicity.
//
// The frontend creates scheduledAt via: new Date(`${date}T${time}:00`) which
// produces a local-timezone Date in the user's browser (AEST for AU users).
// All UTC arithmetic here must match that convention so conflict checks align.
//
const AEST_OFFSET_MS = 10 * 60 * 60 * 1000; // UTC+10

router.get("/tutors/:tutorId/available-slots", async (req, res) => {
  const tutorId = parseInt(req.params.tutorId, 10);
  const date = req.query.date as string;
  const duration = parseInt(req.query.duration as string, 10);
  const parentId = req.query.parentId ? parseInt(req.query.parentId as string, 10) : null;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(duration) || duration < 15) {
    res.status(400).json({ error: "date (YYYY-MM-DD) and duration (minutes, ≥15) are required" });
    return;
  }

  const [year, month, day] = date.split("-").map(Number);

  // Day of week in AEST: 0=Mon … 6=Sun
  // The date string represents an AEST date. Midnight AEST = prior UTC day 14:00.
  const aestMidnightUtc = new Date(Date.UTC(year, month - 1, day) - AEST_OFFSET_MS);
  // JS getDay() on the AEST midnight (in UTC): Sun=0, Mon=1, …, Sat=6
  const jsDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1; // Mon=0 … Sun=6

  // Load tutor profile to get teaching mode + default travel buffer
  const [tutorRow] = await db
    .select({ teachingMode: tutorsTable.teachingMode, travelBufferMinutes: tutorsTable.travelBufferMinutes })
    .from(tutorsTable)
    .where(eq(tutorsTable.id, tutorId))
    .limit(1);

  const tutorMode = tutorRow?.teachingMode ?? "online";
  let bufferMins = tutorRow?.travelBufferMinutes ?? 0;

  // Per-parent relationship override.
  // Prefer the authenticated user from the Bearer token; fall back to the
  // parentId query param only when the request is unauthenticated.
  const tokenUserId = parseUserId(req.headers.authorization as string | undefined);
  const resolvedParentId = tokenUserId ?? parentId;
  if (resolvedParentId && !isNaN(resolvedParentId)) {
    const [rel] = await db
      .select({ travelBufferMinutes: tutorRelationshipsTable.travelBufferMinutes })
      .from(tutorRelationshipsTable)
      .where(and(eq(tutorRelationshipsTable.tutorId, tutorId), eq(tutorRelationshipsTable.parentId, resolvedParentId)))
      .limit(1);
    if (rel?.travelBufferMinutes !== null && rel?.travelBufferMinutes !== undefined) {
      bufferMins = rel.travelBufferMinutes;
    }
  }

  // Travel buffer only applies for in-person/both modes
  const effectiveBuffer = tutorMode === "online" ? 0 : bufferMins;

  // Get tutor's availability windows for this day of week
  const windows = await db
    .select()
    .from(availabilityTable)
    .where(and(eq(availabilityTable.tutorId, tutorId), eq(availabilityTable.dayOfWeek, dayOfWeek)));

  if (windows.length === 0) {
    res.json({ date, duration, slots: [] });
    return;
  }

  // Query sessions for this tutor on this AEST date
  // AEST day in UTC: [aestMidnightUtc, aestMidnightUtc + 24h)
  const aestEndOfDayUtc = new Date(aestMidnightUtc.getTime() + 24 * 60 * 60 * 1000);

  const sessionsOnDate = await db
    .select({ scheduledAt: sessionsTable.scheduledAt, durationMinutes: sessionsTable.durationMinutes })
    .from(sessionsTable)
    .where(
      and(
        eq(sessionsTable.tutorId, tutorId),
        inArray(sessionsTable.status, ["pending_payment", "scheduled"])
      )
    );

  // Convert sessions to AEST-day-relative minute ranges.
  // Travel buffer is added only to the END of each booked session: the tutor
  // needs travel time after finishing before they can start the next session.
  // We do NOT shrink the start — that would block valid slots before a booking.
  const bookedRanges = sessionsOnDate
    .filter((s) => s.scheduledAt >= aestMidnightUtc && s.scheduledAt < aestEndOfDayUtc)
    .map((s) => {
      const msFromAestMidnight = s.scheduledAt.getTime() - aestMidnightUtc.getTime();
      const startMins = Math.round(msFromAestMidnight / 60000);
      return {
        startMins,
        endMins: startMins + s.durationMinutes + effectiveBuffer,
      };
    });

  // Generate slots within each availability window.
  // For short sessions (<60 min) use a 15-min step so :15/:30/:45 starts are offered.
  // For 60/90 min sessions keep the existing 30-min step.
  const STEP = duration < 60 ? 15 : 30;
  const resultSlots = new Set<string>();

  for (const w of windows) {
    const windowStart = timeToMins(w.startTime);
    const windowEnd = timeToMins(w.endTime);
    let slotStart = windowStart;
    while (slotStart + duration <= windowEnd) {
      const slotEnd = slotStart + duration;
      const hasConflict = bookedRanges.some(
        (b) => b.startMins < slotEnd && b.endMins > slotStart
      );
      if (!hasConflict) {
        resultSlots.add(minsToTime(slotStart));
      }
      slotStart += STEP;
    }
  }

  const slots = [...resultSlots].sort();
  res.json({ date, duration, slots });
});

// ── Tutor students ────────────────────────────────────────────────────────────

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
