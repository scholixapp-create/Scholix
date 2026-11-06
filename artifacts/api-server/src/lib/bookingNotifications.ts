import { db, tutorsTable, usersTable, studentsTable, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createNotification } from "./notify";
import { bookingStatusEmailHtml } from "./email";
import { config } from "./config";
import { localDate, localTime } from "./scheduling";

export async function notifyBookingState(session: typeof sessionsTable.$inferSelect,
  event: "requested" | "accepted" | "declined" | "withdrawn" | "expired") {
  const [tutor] = await db.select({
    userId: tutorsTable.userId, firstName: usersTable.firstName, lastName: usersTable.lastName, phone: usersTable.phone,
  }).from(tutorsTable).innerJoin(usersTable, eq(usersTable.id, tutorsTable.userId)).where(eq(tutorsTable.id, session.tutorId));
  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, session.studentId));
  if (!tutor || !student?.parentId) return;
  const titles = {
    requested: "Booking request awaiting tutor confirmation",
    accepted: "Booking confirmed by tutor",
    declined: "Booking request declined",
    withdrawn: "Booking cancelled",
    expired: "Booking request expired",
  };
  const paymentMessage = event === "requested" ? "A beta payment hold is simulated only. No money has been taken."
    : event === "accepted" ? "The beta payment capture is simulated only. No money has been taken."
    : "Any simulated hold has been released. Scholix has not processed any real charge or refund. Direct payment arrangements are separate.";
  const detail = `${session.subject} for ${student.firstName} with ${tutor.firstName} ${tutor.lastName}, `
    + `${localDate(session.scheduledAt)} at ${localTime(session.scheduledAt)} (Australia/Melbourne), ${session.durationMinutes} minutes.`;
  const deadline = event === "requested" && session.requestExpiresAt
    ? ` Respond before ${session.requestExpiresAt.toLocaleString("en-AU", { timeZone: "Australia/Melbourne" })} (Melbourne time).` : "";
  for (const recipient of [
    { id: tutor.userId, path: "/tutor/sessions" },
    { id: student.parentId, path: "/parent/dashboard" },
  ]) {
    const message = `${detail} ${paymentMessage}${deadline}`;
    await createNotification({
      userId: recipient.id, type: event === "requested" ? "action_confirm_session"
        : event === "accepted" ? "session_booked" : "session_cancelled",
      title: titles[event], message, actionUrl: recipient.path, actionLabel: "View booking",
      emailSubject: titles[event],
      emailHtml: bookingStatusEmailHtml({
        title: titles[event], message,
        actionUrl: new URL(recipient.path, config.frontendUrl).toString(),
      }),
    });
  }
  // Preserve the existing post-confirmation introduction links.
  if (event === "accepted") {
    const [parent] = await db.select({ phone: usersTable.phone }).from(usersTable).where(eq(usersTable.id, student.parentId));
    const whatsapp = (phone: string) => {
      const digits = phone.replace(/\D/g, "");
      return `https://wa.me/${digits.startsWith("04") && digits.length === 10 ? `61${digits.slice(1)}` : digits}`;
    };
    if (tutor.phone && parent?.phone) {
      await createNotification({ userId: tutor.userId, type: "whatsapp_connect", title: "Connect with the parent",
        message: "Your session is confirmed. You can now discuss lesson logistics.", actionUrl: whatsapp(parent.phone), actionLabel: "Open WhatsApp" });
      await createNotification({ userId: student.parentId, type: "whatsapp_connect", title: "Connect with your tutor",
        message: "Your session is confirmed. You can now discuss lesson logistics.", actionUrl: whatsapp(tutor.phone), actionLabel: "Open WhatsApp" });
    }
  }
}
