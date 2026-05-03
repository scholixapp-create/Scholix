import { db, sessionsTable, tutorsTable, studentsTable } from "@workspace/db";
import { and, eq, gte, lte } from "drizzle-orm";
import { createNotification } from "./notify";
import { logger } from "./logger";

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export async function sendSessionReminders(): Promise<void> {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const upcomingSessions = await db
      .select({
        sessionId: sessionsTable.id,
        scheduledAt: sessionsTable.scheduledAt,
        subject: sessionsTable.subject,
        durationMinutes: sessionsTable.durationMinutes,
        tutorUserId: tutorsTable.userId,
        studentUserId: studentsTable.userId,
        studentFirstName: studentsTable.firstName,
        studentLastName: studentsTable.lastName,
      })
      .from(sessionsTable)
      .innerJoin(tutorsTable, eq(sessionsTable.tutorId, tutorsTable.id))
      .innerJoin(studentsTable, eq(sessionsTable.studentId, studentsTable.id))
      .where(
        and(
          eq(sessionsTable.status, "scheduled"),
          eq(sessionsTable.reminderSent, false),
          gte(sessionsTable.scheduledAt, windowStart),
          lte(sessionsTable.scheduledAt, windowEnd),
        ),
      );

    if (upcomingSessions.length === 0) return;

    logger.info({ count: upcomingSessions.length }, "Sending session reminders");

    for (const session of upcomingSessions) {
      const dateStr = formatDate(session.scheduledAt);
      const timeStr = formatTime(session.scheduledAt);

      // Notify tutor
      await createNotification({
        userId: session.tutorUserId,
        type: "session_reminder",
        title: "Session tomorrow",
        message: `Reminder: you have a ${session.subject} session with ${session.studentFirstName} ${session.studentLastName} tomorrow at ${timeStr}.`,
        emailSubject: `Reminder: ${session.subject} session tomorrow`,
        emailHtml: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
            <h2 style="color:#1e3a5f;margin-bottom:8px">Session Reminder</h2>
            <p style="color:#374151;margin-bottom:16px">
              You have an upcoming session scheduled for <strong>${dateStr}</strong> at <strong>${timeStr}</strong>.
            </p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
              <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Student</td><td style="padding:8px 0;font-size:14px;font-weight:600">${session.studentFirstName} ${session.studentLastName}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Subject</td><td style="padding:8px 0;font-size:14px;font-weight:600">${session.subject}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Duration</td><td style="padding:8px 0;font-size:14px;font-weight:600">${session.durationMinutes} minutes</td></tr>
            </table>
            <p style="color:#6b7280;font-size:13px">Scholix Tutoring Platform</p>
          </div>`,
      });

      // Notify student (only if they have a user account)
      if (session.studentUserId != null) {
        await createNotification({
          userId: session.studentUserId,
          type: "session_reminder",
          title: "Session tomorrow",
          message: `Reminder: you have a ${session.subject} session tomorrow at ${timeStr}. Don't forget to prepare!`,
          emailSubject: `Reminder: ${session.subject} session tomorrow`,
          emailHtml: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
              <h2 style="color:#1e3a5f;margin-bottom:8px">Session Reminder</h2>
              <p style="color:#374151;margin-bottom:16px">
                You have an upcoming <strong>${session.subject}</strong> session scheduled for <strong>${dateStr}</strong> at <strong>${timeStr}</strong>.
              </p>
              <p style="color:#374151;margin-bottom:24px">Make sure you're ready to go — have your notes and materials prepared ahead of time!</p>
              <p style="color:#6b7280;font-size:13px">Scholix Tutoring Platform</p>
            </div>`,
        });
      }

      // Mark reminder as sent
      await db
        .update(sessionsTable)
        .set({ reminderSent: true })
        .where(eq(sessionsTable.id, session.sessionId));

      logger.info({ sessionId: session.sessionId }, "Reminder sent for session");
    }
  } catch (err) {
    logger.error({ err }, "Session reminder job failed");
  }
}

const INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export function startScheduler(): void {
  logger.info("Scheduler started — session reminders will check every hour");

  // Run once on startup to catch any sessions we might have missed
  void sendSessionReminders();

  setInterval(() => {
    void sendSessionReminders();
  }, INTERVAL_MS);
}
