import { Router } from "express";
import { db, paymentsTable, sessionsTable, tutorsTable, studentsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { SimulatePaymentBody, ListPaymentsQueryParams } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../lib/authMiddleware";
import { authorizeBooking } from "../lib/bookingRequests";
import { BookingError } from "../lib/scheduling";

const router = Router();
const paymentJson = (p: typeof paymentsTable.$inferSelect) => ({
  id: p.id, sessionId: p.sessionId, amount: p.amount, status: p.status, simulatedAt: p.simulatedAt.toISOString(),
});
router.post("/payments/simulate", requireAuth, async (req, res) => {
  const parsed = SimulatePaymentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }
  try {
    res.json(paymentJson(await authorizeBooking(parsed.data.sessionId, (req as AuthRequest).user)));
  } catch (err) {
    if (err instanceof BookingError) { res.status(err.statusCode).json({ error: err.message }); return; }
    throw err;
  }
});
router.get("/payments", requireAuth, async (req, res) => {
  const params = ListPaymentsQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: "Invalid payment filters" }); return; }
  const actor = (req as AuthRequest).user;
  const ownership = actor.role === "admin" ? undefined
    : actor.role === "parent" ? eq(studentsTable.parentId, actor.id)
    : actor.role === "tutor" ? eq(tutorsTable.userId, actor.id) : eq(studentsTable.userId, actor.id);
  const rows = await db.select({ payment: paymentsTable }).from(paymentsTable)
    .innerJoin(sessionsTable, eq(sessionsTable.id, paymentsTable.sessionId))
    .innerJoin(studentsTable, eq(studentsTable.id, sessionsTable.studentId))
    .innerJoin(tutorsTable, eq(tutorsTable.id, sessionsTable.tutorId))
    .where(and(ownership, params.data.sessionId === undefined ? undefined : eq(paymentsTable.sessionId, params.data.sessionId)));
  res.json(rows.map(({ payment }) => paymentJson(payment)));
});
export default router;
