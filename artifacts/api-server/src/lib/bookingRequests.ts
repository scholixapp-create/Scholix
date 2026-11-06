import { db, sessionsTable, tutorsTable, studentsTable, paymentsTable } from "@workspace/db";
import { and, eq, inArray, lte } from "drizzle-orm";
import { lockBookableStudent } from "./accountRemoval";
import { lockBookableTutor } from "./bookableTutor";
import { canActOnSession, canBookForStudent } from "./sessionAccess";
import { authorizeBeta, captureBeta, releaseBeta } from "./betaPayments";
import { notifyBookingState } from "./bookingNotifications";
import { BookingError } from "./scheduling";
import { logger } from "./logger";

type Actor = Parameters<typeof canActOnSession>[0];
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function getSession(id: number) {
  if (!Number.isSafeInteger(id) || id <= 0) throw new BookingError("Invalid session ID", 400);
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, id));
  if (!session) throw new BookingError("Session not found", 404);
  return session;
}
async function lockedSession(tx: Tx, session: typeof sessionsTable.$inferSelect, requireBookable = true) {
  // Consistent lock order with booking and family archival: parent/child, tutor, session, payment.
  if (requireBookable && (!await lockBookableStudent(tx, session.studentId) || !await lockBookableTutor(tx, session.tutorId))) {
    throw new BookingError("This family or tutor is inactive or no longer approved", 403);
  }
  const [locked] = await tx.select().from(sessionsTable).where(eq(sessionsTable.id, session.id)).for("update");
  if (!locked) throw new BookingError("Session not found", 404);
  return locked;
}
async function notifySafely(session: typeof sessionsTable.$inferSelect,
  event: Parameters<typeof notifyBookingState>[1]) {
  try { await notifyBookingState(session, event); }
  catch (err) { logger.error({ err, sessionId: session.id }, "Booking saved, but notification delivery failed"); }
}

export async function expireBookingRequests(now = new Date()) {
  const expired = await db.transaction(async (tx) => {
    const rows = await tx.update(sessionsTable).set({ status: "cancelled", cancellationReason: "expired" })
      .where(and(inArray(sessionsTable.status, ["pending_payment", "pending_confirmation"]), lte(sessionsTable.requestExpiresAt, now)))
      .returning();
    const ids = rows.map((s) => s.id);
    await releaseBeta(tx, ids);
    const holds = ids.length ? await tx.select({ sessionId: paymentsTable.sessionId }).from(paymentsTable)
      .where(and(inArray(paymentsTable.sessionId, ids), eq(paymentsTable.status, "released"))) : [];
    return { rows, submitted: new Set(holds.map((p) => p.sessionId)) };
  });
  // Only submitted requests need tutor notifications; abandoned checkouts do not.
  for (const session of expired.rows.filter((s) => expired.submitted.has(s.id))) {
    await notifySafely(session, "expired");
  }
  return expired.rows.length;
}

export async function authorizeBooking(sessionId: number, actor: Actor) {
  await expireBookingRequests();
  const initial = await getSession(sessionId);
  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, initial.studentId));
  if (!student || !canBookForStudent(actor, student.parentId)) throw new BookingError("Only the owning approved parent can submit this request", 403);
  const result = await db.transaction(async (tx) => {
    const session = await lockedSession(tx, initial);
    if (session.status === "pending_confirmation") {
      const [payment] = await tx.select().from(paymentsTable).where(and(eq(paymentsTable.sessionId, session.id), eq(paymentsTable.status, "authorized")));
      if (payment) return { session, payment, changed: false };
    }
    if (session.status !== "pending_payment" || session.isPaid || !session.requestExpiresAt || session.requestExpiresAt <= new Date()) {
      throw new BookingError("This checkout expired or has already been submitted. Choose an available time again.");
    }
    const payment = await authorizeBeta(tx, session);
    const [updated] = await tx.update(sessionsTable).set({
      status: "pending_confirmation",
      requestExpiresAt: new Date(Math.min(Date.now() + 24 * 60 * 60_000, session.scheduledAt.getTime())),
    }).where(eq(sessionsTable.id, session.id)).returning();
    return { session: updated, payment, changed: true };
  });
  if (result.changed) await notifySafely(result.session, "requested");
  return result.payment;
}

export async function decideBooking(sessionId: number, actor: Actor, decision: "accept" | "decline") {
  await expireBookingRequests();
  const initial = await getSession(sessionId);
  const [tutor] = await db.select().from(tutorsTable).where(eq(tutorsTable.id, initial.tutorId));
  if (actor.role !== "tutor" || tutor?.userId !== actor.id) throw new BookingError("Only the owning tutor can accept or decline this request", 403);
  const result = await db.transaction(async (tx) => {
    // A tutor can decline and release a hold even if the parent lost approval.
    const session = await lockedSession(tx, initial, decision === "accept");
    if ((decision === "accept" && session.status === "scheduled" && session.tutorConfirmedAt)
      || (decision === "decline" && session.status === "cancelled" && session.cancellationReason === "declined")) {
      return { session, changed: false };
    }
    if (session.status !== "pending_confirmation" || !session.requestExpiresAt || session.requestExpiresAt <= new Date()) {
      throw new BookingError("This booking request expired or has already been decided");
    }
    if (decision === "accept") await captureBeta(tx, session);
    else await releaseBeta(tx, [session.id]);
    const [updated] = await tx.update(sessionsTable).set(decision === "accept"
      ? { status: "scheduled", isPaid: true, requestExpiresAt: null, tutorConfirmedAt: new Date() }
      : { status: "cancelled", isPaid: false, requestExpiresAt: null, cancellationReason: "declined" })
      .where(eq(sessionsTable.id, session.id)).returning();
    return { session: updated, changed: true };
  });
  if (result.changed) await notifySafely(result.session, decision === "accept" ? "accepted" : "declined");
  return result.session;
}

export async function cancelBooking(sessionId: number, actor: Actor) {
  await expireBookingRequests();
  const initial = await getSession(sessionId);
  const [tutor] = await db.select().from(tutorsTable).where(eq(tutorsTable.id, initial.tutorId));
  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, initial.studentId));
  if (!tutor || !student || !canActOnSession(actor, { tutorUserId: tutor.userId, parentId: student.parentId }, "cancel")) {
    throw new BookingError("Session access denied", 403);
  }
  const result = await db.transaction(async (tx) => {
    // Cancellation needs only the session lock; never acquire parent/tutor locks afterwards.
    const session = await lockedSession(tx, initial, false);
    if (!["pending_payment", "pending_confirmation", "scheduled"].includes(session.status)) throw new BookingError("Only upcoming sessions can be cancelled");
    await releaseBeta(tx, [session.id], true);
    const [updated] = await tx.update(sessionsTable).set({
      status: "cancelled", isPaid: false, requestExpiresAt: null, cancellationReason: "withdrawn",
    }).where(eq(sessionsTable.id, session.id)).returning();
    return updated;
  });
  await notifySafely(result, "withdrawn");
  return result;
}
