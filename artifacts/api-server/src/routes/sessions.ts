import { Router } from "express";
import { lockBookableStudent } from "../lib/accountRemoval";
import { db, sessionsTable, tutorsTable, usersTable, studentsTable, invoicesTable, paymentsTable, reviewsTable } from "@workspace/db";
import { eq, and, ne, inArray, count } from "drizzle-orm";
import { CreateSessionBody, ListSessionsQueryParams, DecideSessionRequestBody } from "@workspace/api-zod";
import { createNotification } from "../lib/notify";
import { sessionBookedEmailHtml, sessionCompletedEmailHtml } from "../lib/email";
import { format } from "date-fns";
import { requireAuth, getUserIdFromBearer, type AuthRequest } from "../lib/authMiddleware";
import { canBookForStudent, canActOnSession } from "../lib/sessionAccess";
import { lockBookableTutor } from "../lib/bookableTutor";
import { config } from "../lib/config";
import { tutorSlots } from "../lib/schedulingStore";
import { BookingError, localDate, localTime } from "../lib/scheduling";
import { cancelBooking, decideBooking, expireBookingRequests } from "../lib/bookingRequests";
import { visibleSessionLocation } from "../lib/sessionLocation";
import { getCommissionTierMilestone } from "../lib/commissionTierMilestones";

const router = Router();

type CommissionResult = {
  commissionRate: number;
  platformCommission: number;
  tutorEarnings: number;
  tier: string;
  isCommissionFree: boolean;
};

async function calculateCommission(
  tutorId: number,
  studentId: number,
  sessionId: number,
  totalAmount: number
): Promise<CommissionResult> {
  const [tutor] = await db
    .select()
    .from(tutorsTable)
    .where(eq(tutorsTable.id, tutorId))
    .limit(1);

  if (!tutor) {
    return { commissionRate: 0.3, platformCommission: totalAmount * 0.3, tutorEarnings: totalAmount * 0.7, tier: "standard", isCommissionFree: false };
  }

  // Rule 1: First student ever — lifetime 0% commission for all their sessions
  if (tutor.firstStudentId === studentId) {
    return {
      commissionRate: 0,
      platformCommission: 0,
      tutorEarnings: totalAmount,
      tier: "first_student_free",
      isCommissionFree: true,
    };
  }

  // Count completed sessions for this tutor BEFORE this one (excluding current session)
  const prevCompleted = await db
    .select()
    .from(sessionsTable)
    .where(
      and(
        eq(sessionsTable.tutorId, tutorId),
        eq(sessionsTable.status, "completed"),
        ne(sessionsTable.id, sessionId)
      )
    );

  // Rule 2: This is the tutor's very first completed session ever → set firstStudentId
  if (prevCompleted.length === 0 && !tutor.firstStudentId) {
    await db
      .update(tutorsTable)
      .set({ firstStudentId: studentId })
      .where(eq(tutorsTable.id, tutorId));

    return {
      commissionRate: 0,
      platformCommission: 0,
      tutorEarnings: totalAmount,
      tier: "first_student_free",
      isCommissionFree: true,
    };
  }

  // Rule 3: First completed session between this tutor and this specific student
  const prevWithStudent = prevCompleted.filter((s) => s.studentId === studentId);
  if (prevWithStudent.length === 0) {
    return {
      commissionRate: 0,
      platformCommission: 0,
      tutorEarnings: totalAmount,
      tier: "first_session_free",
      isCommissionFree: true,
    };
  }

  // Rule 4: Commission tier based on total completed sessions (including this one)
  const totalCompleted = prevCompleted.length + 1;
  let commissionRate = 0.3;
  let tier = "standard";

  if (totalCompleted >= 50) {
    commissionRate = 0.15;
    tier = "expert";
  } else if (totalCompleted >= 25) {
    commissionRate = 0.2;
    tier = "established";
  } else if (totalCompleted >= 10) {
    commissionRate = 0.25;
    tier = "growth";
  }

  return {
    commissionRate,
    platformCommission: totalAmount * commissionRate,
    tutorEarnings: totalAmount * (1 - commissionRate),
    tier,
    isCommissionFree: false,
  };
}

async function sessionToJson(s: typeof sessionsTable.$inferSelect, viewer?: AuthRequest["user"]) {
  let tutorName: string | null = null;
  let studentName: string | null = null;

  const [tutorRow] = await db
    .select({ firstName: usersTable.firstName, lastName: usersTable.lastName, userId: tutorsTable.userId })
    .from(tutorsTable)
    .innerJoin(usersTable, eq(tutorsTable.userId, usersTable.id))
    .where(eq(tutorsTable.id, s.tutorId))
    .limit(1);

  if (tutorRow) tutorName = `${tutorRow.firstName} ${tutorRow.lastName}`;

  const [student] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.id, s.studentId))
    .limit(1);

  if (student) studentName = student.archivedAt ? "Removed student" : `${student.firstName} ${student.lastName ?? ""}`.trim();
  const [payment] = await db.select({ status: paymentsTable.status }).from(paymentsTable).where(eq(paymentsTable.sessionId, s.id)).limit(1);
  let parentAddress: string | null = null;
  let parentActive = false;
  let parentApproved = false;
  if (viewer?.role === "tutor" && student && !student.archivedAt && student.parentId && s.lessonMode === "in_person"
    && (s.status === "scheduled" || s.status === "completed")) {
    const [parent] = await db.select({
      address: usersTable.address,
      role: usersTable.role,
      isActive: usersTable.isActive,
      archivedAt: usersTable.archivedAt,
      parentApproved: usersTable.parentApproved,
    })
      .from(usersTable).where(eq(usersTable.id, student.parentId)).limit(1);
    if (parent?.role === "parent" && parent.isActive && !parent.archivedAt && parent.parentApproved) {
      parentAddress = parent.address;
      parentActive = true;
      parentApproved = true;
    }
  }
  const locationAddress = viewer
    ? visibleSessionLocation({
        viewerRole: viewer.role,
        viewerId: viewer.id,
        tutorUserId: tutorRow?.userId ?? null,
        status: s.status,
        lessonMode: s.lessonMode,
        parentAddress,
        studentActive: Boolean(student && !student.archivedAt),
        parentActive,
        parentApproved,
      })
    : null;

  return {
    id: s.id,
    tutorId: s.tutorId,
    studentId: s.studentId,
    subject: s.subject,
    scheduledAt: s.scheduledAt.toISOString(),
    durationMinutes: s.durationMinutes,
    status: s.status,
    lessonMode: s.lessonMode,
    locationAddress,
    requestExpiresAt: s.requestExpiresAt?.toISOString() ?? null,
    cancellationReason: s.cancellationReason,
    paymentStatus: payment?.status ?? null,
    isPaid: s.isPaid,
    totalAmount: s.totalAmount,
    isCommissionFree: s.isCommissionFree,
    tutorName,
    studentName,
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/sessions/summary", requireAuth, async (req, res) => {
  const user = (req as AuthRequest).user;
  const params = ListSessionsQueryParams.safeParse(req.query);
  const tutorId = params.success ? params.data.tutorId : undefined;
  const studentId = params.success ? params.data.studentId : undefined;

  const conditions = [];

  if (user.role === "parent") {
    // Only count sessions for this parent's children
    const children = await db
      .select({ id: studentsTable.id })
      .from(studentsTable)
      .where(eq(studentsTable.parentId, user.id));
    const childIds = children.map((c) => c.id);
    if (childIds.length === 0) {
      res.json({ scheduled: 0, completed: 0, cancelled: 0, total: 0 });
      return;
    }
    if (studentId && childIds.includes(studentId)) {
      conditions.push(eq(sessionsTable.studentId, studentId));
    } else {
      conditions.push(inArray(sessionsTable.studentId, childIds));
    }
  } else if (user.role === "tutor") {
    const [tutorRow] = await db
      .select({ id: tutorsTable.id })
      .from(tutorsTable)
      .where(eq(tutorsTable.userId, user.id))
      .limit(1);
    if (!tutorRow) {
      res.json({ scheduled: 0, completed: 0, cancelled: 0, total: 0 });
      return;
    }
    conditions.push(eq(sessionsTable.tutorId, tutorRow.id));
  } else {
    // admin — can filter by tutorId or studentId query param
    if (tutorId) conditions.push(eq(sessionsTable.tutorId, tutorId));
    if (studentId) conditions.push(eq(sessionsTable.studentId, studentId));
  }

  // Exclude pending_payment from summary counts
  conditions.push(inArray(sessionsTable.status, ["scheduled", "completed", "cancelled"]));

  const sessions = await db.select().from(sessionsTable).where(and(...conditions));

  const summary = { scheduled: 0, completed: 0, cancelled: 0, total: sessions.length };
  for (const s of sessions) {
    if (s.status === "scheduled") summary.scheduled++;
    else if (s.status === "completed") summary.completed++;
    else if (s.status === "cancelled") summary.cancelled++;
  }
  res.json(summary);
});

router.get("/sessions", requireAuth, async (req, res) => {
  await expireBookingRequests();
  const user = (req as AuthRequest).user;
  const params = ListSessionsQueryParams.safeParse(req.query);
  const statusFilter = params.success ? params.data.status : undefined;

  const conditions = [];

  if (user.role === "admin") {
    // Admin can see all sessions with any optional filter
    const tutorId = params.success ? params.data.tutorId : undefined;
    const studentId = params.success ? params.data.studentId : undefined;
    if (tutorId) conditions.push(eq(sessionsTable.tutorId, tutorId));
    if (studentId) conditions.push(eq(sessionsTable.studentId, studentId));
  } else if (user.role === "tutor") {
    // Tutor sees only their own sessions
    const [tutorRow] = await db
      .select({ id: tutorsTable.id })
      .from(tutorsTable)
      .where(eq(tutorsTable.userId, user.id))
      .limit(1);
    if (!tutorRow) { res.json([]); return; }
    conditions.push(eq(sessionsTable.tutorId, tutorRow.id));
    // Default: exclude pending_payment for tutors
    if (!statusFilter) {
      conditions.push(inArray(sessionsTable.status, ["pending_confirmation", "scheduled", "completed", "cancelled"]));
    }
  } else if (user.role === "parent") {
    // Parent sees only sessions for their own children
    const children = await db
      .select({ id: studentsTable.id })
      .from(studentsTable)
      .where(eq(studentsTable.parentId, user.id));
    const childIds = children.map((c) => c.id);
    if (childIds.length === 0) { res.json([]); return; }
    // Honour optional studentId filter but must be one of their children
    const requestedStudentId = params.success ? params.data.studentId : undefined;
    if (requestedStudentId) {
      if (!childIds.includes(requestedStudentId)) {
        res.status(403).json({ error: "Access denied" });
        return;
      }
      conditions.push(eq(sessionsTable.studentId, requestedStudentId));
    } else {
      conditions.push(inArray(sessionsTable.studentId, childIds));
    }
  } else if (user.role === "student") {
    // Student sees only sessions linked to their student profile
    const [studentRow] = await db
      .select({ id: studentsTable.id })
      .from(studentsTable)
      .where(eq(studentsTable.userId, user.id))
      .limit(1);
    if (!studentRow) { res.json([]); return; }
    conditions.push(eq(sessionsTable.studentId, studentRow.id));
  } else {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  if (statusFilter) {
    conditions.push(eq(sessionsTable.status, statusFilter));
  }

  const sessions = conditions.length > 0
    ? await db.select().from(sessionsTable).where(and(...conditions))
    : await db.select().from(sessionsTable);

  const result = await Promise.all(sessions.map((session) => sessionToJson(session, user)));
  res.json(result);
});

router.post("/sessions", requireAuth, async (req, res) => {
  const parsed = CreateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const actor = (req as AuthRequest).user;
  const [student] = await db.select({ parentId: studentsTable.parentId }).from(studentsTable)
    .where(eq(studentsTable.id, parsed.data.studentId)).limit(1);
  if (!student || !canBookForStudent(actor, student.parentId)) {
    res.status(403).json({ error: "Only an approved parent can book for their own student" }); return;
  }

  const [tutor] = await db
    .select()
    .from(tutorsTable)
    .where(eq(tutorsTable.id, parsed.data.tutorId))
    .limit(1);

  if (!tutor) {
    res.status(404).json({ error: "Tutor not found" });
    return;
  }
  if (tutor.verificationStatus === "expired") {
    res.status(403).json({ error: "This tutor's WWCC verification has expired. New bookings are not available until they renew." });
    return;
  }
  if (!tutor.isApproved || tutor.verificationStatus !== "verified") {
    res.status(403).json({ error: "This tutor is not approved for new bookings" }); return;
  }

  const newStart = new Date(parsed.data.scheduledAt);
  if (!/Z$|[+-]\d{2}:\d{2}$/.test(parsed.data.scheduledAt) || isNaN(newStart.getTime())
    || newStart.getUTCSeconds() || newStart.getUTCMilliseconds() || newStart.getUTCMinutes() % 15) {
    res.status(400).json({ error: "Choose a valid quarter-hour start with an explicit timezone" }); return;
  }
  if (!parsed.data.subject.trim() || parsed.data.subject.length > 200) {
    res.status(400).json({ error: "Enter a valid lesson subject" }); return;
  }
  try {
    // Recheck availability AFTER locking the tutor. Two simultaneous bookings
    // cannot both pass an earlier, unlocked availability check.
    const session = await db.transaction(async (tx) => {
      if (!await lockBookableStudent(tx, parsed.data.studentId) || !await lockBookableTutor(tx, tutor.id)) {
        throw new BookingError("This family or tutor is inactive or no longer approved", 403);
      }
      const [currentTutor] = await tx.select().from(tutorsTable).where(eq(tutorsTable.id, tutor.id));
      const slots = await tutorSlots(tx, currentTutor, actor.id, localDate(newStart),
        parsed.data.durationMinutes, parsed.data.lessonMode);
      if (slots.slotInstants[localTime(newStart)] !== newStart.toISOString()) {
        throw new BookingError("That time is no longer available. Choose another start time.");
      }
      const [created] = await tx.insert(sessionsTable).values({
        tutorId: tutor.id, studentId: parsed.data.studentId, subject: parsed.data.subject,
        scheduledAt: newStart, durationMinutes: parsed.data.durationMinutes,
        status: "pending_payment", isPaid: false, totalAmount: (currentTutor.hourlyRate * parsed.data.durationMinutes) / 60,
        lessonMode: slots.lessonMode, travelBufferMinutes: slots.buffer,
        requestExpiresAt: new Date(Math.min(Date.now() + 15 * 60_000, newStart.getTime())),
      }).returning();
      return created;
    });
    res.status(201).json(await sessionToJson(session));
  } catch (err) {
    if (err instanceof BookingError) { res.status(err.statusCode).json({ error: err.message }); return; }
    throw err;
  }
});

router.post("/sessions/:sessionId/decision", requireAuth, async (req, res) => {
  const parsed = DecideSessionRequestBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Choose accept or decline" }); return; }
  try {
    const user = (req as AuthRequest).user;
    res.json(await sessionToJson(await decideBooking(Number(req.params.sessionId), user, parsed.data.decision), user));
  } catch (err) {
    if (err instanceof BookingError) { res.status(err.statusCode).json({ error: err.message }); return; }
    throw err;
  }
});

router.get("/sessions/:sessionId", requireAuth, async (req, res) => {
  await expireBookingRequests();
  const user = (req as AuthRequest).user;
  const sessionId = parseInt(req.params["sessionId"] as string, 10);
  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, sessionId))
    .limit(1);

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  if (user.role !== "admin") {
    if (user.role === "tutor") {
      const [tutorRow] = await db
        .select({ id: tutorsTable.id })
        .from(tutorsTable)
        .where(eq(tutorsTable.userId, user.id))
        .limit(1);
      if (!tutorRow || tutorRow.id !== session.tutorId) {
        res.status(403).json({ error: "Access denied" });
        return;
      }
    } else if (user.role === "parent") {
      const [student] = await db
        .select({ parentId: studentsTable.parentId })
        .from(studentsTable)
        .where(eq(studentsTable.id, session.studentId))
        .limit(1);
      if (!student || student.parentId !== user.id) {
        res.status(403).json({ error: "Access denied" });
        return;
      }
    } else if (user.role === "student") {
      const [student] = await db
        .select({ userId: studentsTable.userId })
        .from(studentsTable)
        .where(eq(studentsTable.id, session.studentId))
        .limit(1);
      if (!student || student.userId !== user.id) {
        res.status(403).json({ error: "Access denied" });
        return;
      }
    } else {
      res.status(403).json({ error: "Access denied" });
      return;
    }
  }

  res.json(await sessionToJson(session, user));
});

router.post("/sessions/:sessionId/complete", requireAuth, async (req, res) => {
  const sessionId = parseInt(req.params.sessionId as string, 10);
  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, sessionId))
    .limit(1);

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  const [parties] = await db.select({
    tutorUserId: tutorsTable.userId, parentId: studentsTable.parentId,
  }).from(tutorsTable).innerJoin(studentsTable, eq(studentsTable.id, session.studentId))
    .where(eq(tutorsTable.id, session.tutorId)).limit(1);
  if (!parties || !canActOnSession((req as AuthRequest).user, parties, "complete")) {
    res.status(403).json({ error: "Only this tutor or an admin can complete this session" }); return;
  }
  if (session.status !== "scheduled") {
    res.status(409).json({ error: "Only scheduled sessions can be completed" }); return;
  }

  const [updated] = await db
    .update(sessionsTable)
    .set({ status: "completed" })
    .where(and(eq(sessionsTable.id, sessionId), eq(sessionsTable.status, "scheduled")))
    .returning();
  if (!updated) {
    res.status(409).json({ error: "This session has already been updated" }); return;
  }

  const commResult = await calculateCommission(
    updated.tutorId,
    updated.studentId,
    sessionId,
    updated.totalAmount
  );

  // Store isCommissionFree on the session
  if (commResult.isCommissionFree) {
    await db
      .update(sessionsTable)
      .set({ isCommissionFree: true })
      .where(eq(sessionsTable.id, sessionId));
  }

  const existingInvoice = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.sessionId, sessionId))
    .limit(1);

  let invoice;
  if (existingInvoice.length > 0) {
    invoice = existingInvoice[0];
  } else {
    [invoice] = await db
      .insert(invoicesTable)
      .values({
        sessionId,
        totalAmount: updated.totalAmount,
        platformCommission: commResult.platformCommission,
        tutorEarnings: commResult.tutorEarnings,
        commissionRate: commResult.commissionRate,
        commissionTier: commResult.tier,
      })
      .returning();
  }

  const sessionJson = await sessionToJson(updated, (req as AuthRequest).user);

  const [tutorRow] = await db
    .select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
    .from(tutorsTable)
    .innerJoin(usersTable, eq(tutorsTable.userId, usersTable.id))
    .where(eq(tutorsTable.id, updated.tutorId))
    .limit(1);

  const [student] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.id, updated.studentId))
    .limit(1);

  const dateStr = format(updated.scheduledAt, "EEE, MMM d 'at' h:mm a");
  const tutorName = tutorRow ? `${tutorRow.firstName} ${tutorRow.lastName}` : "Your tutor";
  const studentName = student ? `${student.firstName} ${student.lastName}` : "Student";

  // Notify tutor — session completed + earnings + upload notes action
  const [tutorUserRow2] = await db
    .select({ userId: tutorsTable.userId, firstName: usersTable.firstName })
    .from(tutorsTable)
    .innerJoin(usersTable, eq(tutorsTable.userId, usersTable.id))
    .where(eq(tutorsTable.id, updated.tutorId))
    .limit(1);

  if (tutorUserRow2) {
    await createNotification({
      userId: tutorUserRow2.userId,
      type: "action_upload_notes",
      title: "Upload progress notes",
      message: `${session.subject} with ${studentName} is done. Log their progress now`,
      actionUrl: "/tutor/sessions",
      actionLabel: "Log notes",
      emailSubject: `Session completed: ${session.subject}`,
      emailHtml: sessionCompletedEmailHtml({
        recipientName: tutorUserRow2.firstName,
        tutorName,
        studentName,
        subject: updated.subject,
        date: dateStr,
        duration: updated.durationMinutes,
        totalAmount: updated.totalAmount,
        tutorEarnings: commResult.tutorEarnings,
        commissionTier: commResult.tier,
        isCommissionFree: commResult.isCommissionFree,
      }),
    });

    const [completionStats] = await db
      .select({ total: count() })
      .from(sessionsTable)
      .where(and(
        eq(sessionsTable.tutorId, updated.tutorId),
        eq(sessionsTable.status, "completed"),
      ));
    const milestone = getCommissionTierMilestone(completionStats?.total ?? 0);
    if (milestone) {
      await createNotification({
        userId: tutorUserRow2.userId,
        type: "commission_tier",
        title: `You reached the ${milestone.label} commission tier!`,
        message: `You have completed ${milestone.sessions} sessions on Scholix. Keep up the great work.`,
        actionUrl: "/tutor/dashboard",
        actionLabel: "View commission progress",
      });
    }
  }

  // Notify parent — session completed + rate tutor action
  if (student?.parentId) {
    const [existingReview] = await db.select({ id: reviewsTable.id }).from(reviewsTable)
      .where(and(eq(reviewsTable.authorId, student.parentId), eq(reviewsTable.tutorId, session.tutorId))).limit(1);
    const reviewPath = `/parent/dashboard?reviewSession=${session.id}`;
    await createNotification({
      userId: student.parentId,
      type: existingReview ? "session_completed" : "action_rate_session",
      title: existingReview ? "Session completed" : "Rate your tutor",
      message: existingReview
        ? `${studentName}'s ${session.subject} session with ${tutorName} is done.`
        : `${studentName}'s ${session.subject} session with ${tutorName} is done. How did it go?`,
      actionUrl: existingReview ? "/parent/dashboard" : reviewPath,
      actionLabel: existingReview ? "View sessions" : "Leave a review",
      emailSubject: `Session completed: ${session.subject}`,
      emailHtml: sessionCompletedEmailHtml({
        recipientName: studentName.split(" ")[0],
        tutorName,
        studentName,
        subject: updated.subject,
        date: dateStr,
        duration: updated.durationMinutes,
        totalAmount: updated.totalAmount,
        reviewUrl: existingReview ? undefined : new URL(reviewPath, config.frontendUrl).toString(),
      }),
    });
  }

  res.json({
    session: sessionJson,
    invoice: {
      id: invoice.id,
      sessionId: invoice.sessionId,
      totalAmount: invoice.totalAmount,
      platformCommission: invoice.platformCommission,
      tutorEarnings: invoice.tutorEarnings,
      commissionRate: invoice.commissionRate,
      commissionTier: invoice.commissionTier,
      isCommissionFree: commResult.isCommissionFree,
      generatedAt: invoice.generatedAt.toISOString(),
      tutorName: tutorRow ? `${tutorRow.firstName} ${tutorRow.lastName}` : "",
      studentName: student ? `${student.firstName} ${student.lastName}` : "",
      subject: updated.subject,
      durationMinutes: updated.durationMinutes,
    },
  });
});

router.post("/sessions/:sessionId/cancel", requireAuth, async (req, res) => {
  try {
    const user = (req as AuthRequest).user;
    res.json(await sessionToJson(await cancelBooking(Number(req.params.sessionId), user), user));
  } catch (err) {
    if (err instanceof BookingError) { res.status(err.statusCode).json({ error: err.message }); return; }
    throw err;
  }
});

export default router;
