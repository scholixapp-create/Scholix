import { Router } from "express";
import { db, paymentsTable, sessionsTable, tutorsTable, usersTable, studentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { SimulatePaymentBody, ListPaymentsQueryParams } from "@workspace/api-zod";
import { createNotification } from "../lib/notify";
import { paymentConfirmedEmailHtml } from "../lib/email";
import { format } from "date-fns";

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

  // Notify parent: find student → parentId is the parent's userId
  const [student] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.id, session.studentId))
    .limit(1);

  const [tutorRow] = await db
    .select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
    .from(tutorsTable)
    .innerJoin(usersTable, eq(tutorsTable.userId, usersTable.id))
    .where(eq(tutorsTable.id, session.tutorId))
    .limit(1);

  if (student?.parentId) {
    const tutorName = tutorRow ? `${tutorRow.firstName} ${tutorRow.lastName}` : "your tutor";
    const dateStr = format(session.scheduledAt, "EEE, MMM d 'at' h:mm a");

    const [parentUser] = await db
      .select({ firstName: usersTable.firstName })
      .from(usersTable)
      .where(eq(usersTable.id, student.parentId))
      .limit(1);

    await createNotification({
      userId: student.parentId,
      type: "payment_confirmed",
      title: "Payment confirmed",
      message: `Your ${session.subject} session with ${tutorName} on ${dateStr} is confirmed`,
      emailSubject: `Payment confirmed — ${session.subject} with ${tutorName}`,
      emailHtml: paymentConfirmedEmailHtml({
        recipientName: parentUser?.firstName ?? "there",
        tutorName,
        subject: session.subject,
        date: dateStr,
        amount: session.totalAmount,
      }),
    });
  }

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
