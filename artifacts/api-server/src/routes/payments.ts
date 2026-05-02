import { Router } from "express";
import { db, paymentsTable, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { SimulatePaymentBody, ListPaymentsQueryParams } from "@workspace/api-zod";

const router = Router();

router.post("/payments/simulate", async (req, res) => {
  const parsed = SimulatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { sessionId } = parsed.data;

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, sessionId))
    .limit(1);

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  await db
    .update(sessionsTable)
    .set({ isPaid: true })
    .where(eq(sessionsTable.id, sessionId));

  const [payment] = await db
    .insert(paymentsTable)
    .values({
      sessionId,
      amount: session.totalAmount,
      status: "paid",
    })
    .returning();

  res.json({
    id: payment.id,
    sessionId: payment.sessionId,
    amount: payment.amount,
    status: payment.status,
    simulatedAt: payment.simulatedAt.toISOString(),
  });
});

router.get("/payments", async (req, res) => {
  const params = ListPaymentsQueryParams.safeParse(req.query);
  const sessionId = params.success ? params.data.sessionId : undefined;

  const payments = sessionId
    ? await db.select().from(paymentsTable).where(eq(paymentsTable.sessionId, sessionId))
    : await db.select().from(paymentsTable);

  res.json(
    payments.map((p) => ({
      id: p.id,
      sessionId: p.sessionId,
      amount: p.amount,
      status: p.status,
      simulatedAt: p.simulatedAt.toISOString(),
    }))
  );
});

export default router;
