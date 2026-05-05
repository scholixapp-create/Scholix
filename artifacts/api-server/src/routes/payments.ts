import { Router } from "express";
import { db, paymentsTable, sessionsTable, tutorsTable, usersTable, studentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { SimulatePaymentBody, ListPaymentsQueryParams } from "@workspace/api-zod";
import { createNotification } from "../lib/notify";
import { paymentConfirmedEmailHtml, sessionBookedEmailHtml } from "../lib/email";
import { format } from "date-fns";

const router = Router();

/** Format an Australian mobile for a WhatsApp wa.me link.
 *  Converts 04XXXXXXXX → 614XXXXXXXX
 */
function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("04") && digits.length === 10) {
    return "61" + digits.slice(1);
  }
  return digits;
}

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

  // Confirm the session: pending_payment → scheduled, mark as paid
  await db
    .update(sessionsTable)
    .set({ isPaid: true, status: "scheduled" })
    .where(eq(sessionsTable.id, sessionId));

  const [payment] = await db
    .insert(paymentsTable)
    .values({
      sessionId,
      amount: session.totalAmount,
      status: "paid",
    })
    .returning();

  const [student] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.id, session.studentId))
    .limit(1);

  const [tutorRow] = await db
    .select({ userId: tutorsTable.userId, firstName: usersTable.firstName, lastName: usersTable.lastName, phone: usersTable.phone })
    .from(tutorsTable)
    .innerJoin(usersTable, eq(tutorsTable.userId, usersTable.id))
    .where(eq(tutorsTable.id, session.tutorId))
    .limit(1);

  const tutorName = tutorRow ? `${tutorRow.firstName} ${tutorRow.lastName}` : "your tutor";
  const dateStr = format(session.scheduledAt, "EEE, MMM d 'at' h:mm a");

  // ── Notify parent: payment confirmed ──────────────────────────────────
  if (student?.parentId) {
    const [parentUser] = await db
      .select({ firstName: usersTable.firstName, phone: usersTable.phone })
      .from(usersTable)
      .where(eq(usersTable.id, student.parentId))
      .limit(1);

    await createNotification({
      userId: student.parentId,
      type: "payment_confirmed",
      title: "Session confirmed — payment received",
      message: `Your ${session.subject} session with ${tutorName} on ${dateStr} is locked in`,
      actionUrl: "/parent/sessions",
      actionLabel: "View session",
      emailSubject: `Payment confirmed — ${session.subject} with ${tutorName}`,
      emailHtml: paymentConfirmedEmailHtml({
        recipientName: parentUser?.firstName ?? "there",
        tutorName,
        subject: session.subject,
        date: dateStr,
        amount: session.totalAmount,
      }),
    });

    // WhatsApp connection suggestion — both need phones
    const parentPhone = parentUser?.phone ?? null;
    const tutorPhone = tutorRow?.phone ?? null;

    if (parentPhone && tutorPhone) {
      const tutorWaLink = `https://wa.me/${toWhatsAppNumber(tutorPhone)}`;
      await createNotification({
        userId: student.parentId,
        type: "whatsapp_connect",
        title: "Connect with your tutor on WhatsApp",
        message: `Message ${tutorName} directly to confirm logistics, share resources, or ask questions`,
        actionUrl: tutorWaLink,
        actionLabel: "Open WhatsApp",
      });
    }
  }

  // ── Notify tutor: new booking confirmed ───────────────────────────────
  if (tutorRow) {
    const studentName = student ? `${student.firstName} ${student.lastName}` : "A student";

    await createNotification({
      userId: tutorRow.userId,
      type: "session_booked",
      title: "New session confirmed",
      message: `${studentName} booked ${session.subject} on ${dateStr} — payment received`,
      actionUrl: "/tutor/sessions",
      actionLabel: "View sessions",
      emailSubject: `New session confirmed — ${session.subject}`,
      emailHtml: sessionBookedEmailHtml({
        recipientName: tutorRow.firstName,
        tutorName,
        studentName,
        subject: session.subject,
        date: dateStr,
        duration: session.durationMinutes,
        amount: session.totalAmount,
      }),
    });

    // WhatsApp connection suggestion for tutor
    const parentPhone = student?.parentId
      ? await db
          .select({ phone: usersTable.phone })
          .from(usersTable)
          .where(eq(usersTable.id, student.parentId))
          .limit(1)
          .then((r) => r[0]?.phone ?? null)
      : null;

    if (tutorRow.phone && parentPhone) {
      const parentWaLink = `https://wa.me/${toWhatsAppNumber(parentPhone)}`;
      const parentFirstName = student?.parentId
        ? await db
            .select({ firstName: usersTable.firstName })
            .from(usersTable)
            .where(eq(usersTable.id, student.parentId))
            .limit(1)
            .then((r) => r[0]?.firstName ?? "the parent")
        : "the parent";

      await createNotification({
        userId: tutorRow.userId,
        type: "whatsapp_connect",
        title: "Connect with the parent on WhatsApp",
        message: `Say hello to ${parentFirstName} — introduce yourself and confirm any session details`,
        actionUrl: parentWaLink,
        actionLabel: "Open WhatsApp",
      });
    }
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
