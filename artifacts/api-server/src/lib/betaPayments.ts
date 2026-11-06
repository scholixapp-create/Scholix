// Explicit beta-only payment boundary. No money or card details are processed.
// Real payments must replace this boundary with provider idempotency/webhooks;
// never put a network capture inside a long-lived database transaction.
import { db, paymentsTable, invoicesTable, sessionsTable, tutorsTable } from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
import { BookingError } from "./scheduling";
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Session = typeof sessionsTable.$inferSelect;

export async function authorizeBeta(tx: Tx, session: Session) {
  const [existing] = await tx.select().from(paymentsTable).where(eq(paymentsTable.sessionId, session.id));
  if (existing) {
    if (existing.provider === "beta" && existing.status === "authorized") return existing;
    throw new BookingError("This session already has a payment record");
  }
  const [payment] = await tx.insert(paymentsTable).values({
    sessionId: session.id, amount: session.totalAmount, status: "authorized", provider: "beta",
  }).returning();
  return payment;
}

export async function captureBeta(tx: Tx, session: Session) {
  const [payment] = await tx.update(paymentsTable).set({ status: "paid" })
    .where(and(eq(paymentsTable.sessionId, session.id), eq(paymentsTable.provider, "beta"),
      eq(paymentsTable.status, "authorized"))).returning();
  if (!payment) throw new BookingError("No authorised beta hold is available. No booking was confirmed.");
  const [existingInvoice] = await tx.select().from(invoicesTable).where(eq(invoicesTable.sessionId, session.id));
  if (existingInvoice) return payment;
  // Preserve the commission policy used by the existing payment endpoint.
  const [tutor] = await tx.select().from(tutorsTable).where(eq(tutorsTable.id, session.tutorId));
  const completed = await tx.select().from(sessionsTable)
    .where(and(eq(sessionsTable.tutorId, session.tutorId), eq(sessionsTable.status, "completed")));
  const firstPair = tutor?.firstStudentId === session.studentId;
  const firstLesson = !completed.some((s) => s.studentId === session.studentId);
  const count = completed.filter((s) => !s.isCommissionFree).length;
  const rate = firstPair || firstLesson ? 0 : count >= 50 ? 0.05 : count >= 25 ? 0.15 : count >= 10 ? 0.24 : 0.30;
  const tier = firstPair ? "first_student_free" : firstLesson ? "first_session_free"
    : count >= 50 ? "expert" : count >= 25 ? "established" : count >= 10 ? "growth" : "standard";
  await tx.insert(invoicesTable).values({
    sessionId: session.id, totalAmount: session.totalAmount, commissionRate: rate,
    platformCommission: session.totalAmount * rate, tutorEarnings: session.totalAmount * (1 - rate), commissionTier: tier,
  });
  if (rate === 0) await tx.update(sessionsTable).set({ isCommissionFree: true }).where(eq(sessionsTable.id, session.id));
  return payment;
}

export async function releaseBeta(tx: Tx, sessionIds: number[], refundCaptured = false) {
  if (!sessionIds.length) return;
  await tx.update(paymentsTable).set({ status: "released" })
    .where(and(inArray(paymentsTable.sessionId, sessionIds), eq(paymentsTable.provider, "beta"),
      eq(paymentsTable.status, "authorized")));
  if (refundCaptured) await tx.update(paymentsTable).set({ status: "refunded" })
    .where(and(inArray(paymentsTable.sessionId, sessionIds), eq(paymentsTable.provider, "beta"),
      eq(paymentsTable.status, "paid")));
}
