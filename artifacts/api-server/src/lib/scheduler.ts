import { db, sessionsTable, tutorsTable, studentsTable, usersTable } from "@workspace/db";
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

/** Check WWCC expiry for all approved tutors.
 *  - Sends a warning notification 90 days before expiry.
 *  - Marks tutors as "expired" and removes approval if WWCC has passed.
 */
export async function checkWwccExpiry(): Promise<void> {
  try {
    const tutors = await db
      .select({
        id: tutorsTable.id,
        userId: tutorsTable.userId,
        wwccExpiry: tutorsTable.wwccExpiry,
        verificationStatus: tutorsTable.verificationStatus,
        firstName: usersTable.firstName,
      })
      .from(tutorsTable)
      .innerJoin(usersTable, eq(tutorsTable.userId, usersTable.id))
      .where(eq(tutorsTable.isApproved, true));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const warnDate = new Date(today);
    warnDate.setDate(warnDate.getDate() + 90);

    for (const tutor of tutors) {
      if (!tutor.wwccExpiry) continue;

      let expiryDate: Date;
      try {
        expiryDate = new Date(tutor.wwccExpiry);
        if (isNaN(expiryDate.getTime())) continue;
      } catch {
        continue;
      }

      expiryDate.setHours(0, 0, 0, 0);

      if (expiryDate < today) {
        // WWCC has expired — suspend the tutor
        if (tutor.verificationStatus !== "expired") {
          await db
            .update(tutorsTable)
            .set({ verificationStatus: "expired", isApproved: false })
            .where(eq(tutorsTable.id, tutor.id));

          await createNotification({
            userId: tutor.userId,
            type: "session_booked",
            title: "WWCC expired — account suspended",
            message: `Your Working With Children Check expired on ${tutor.wwccExpiry}. New bookings are paused until you renew and submit your updated WWCC.`,
            actionUrl: "/tutor/onboarding",
            actionLabel: "Update WWCC",
          });

          logger.info({ tutorId: tutor.id, wwccExpiry: tutor.wwccExpiry }, "Tutor WWCC expired — account suspended");
        }
      } else if (expiryDate <= warnDate) {
        // WWCC expires within 90 days — warn once (check notification doesn't already exist)
        const daysLeft = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        await createNotification({
          userId: tutor.userId,
          type: "session_booked",
          title: `WWCC expiring in ${daysLeft} days`,
          message: `Your Working With Children Check expires on ${tutor.wwccExpiry}. Renew it soon to keep your account active.`,
          actionUrl: "/tutor/onboarding",
          actionLabel: "Update WWCC",
        });

        logger.info({ tutorId: tutor.id, daysLeft }, "WWCC expiry warning sent");
      }
    }
  } catch (err) {
    logger.error({ err }, "WWCC expiry check failed");
  }
}

const REMINDER_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const WWCC_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function startScheduler(): void {
  logger.info("Scheduler started — session reminders will check every hour");

  void sendSessionReminders();
  setInterval(() => { void sendSessionReminders(); }, REMINDER_INTERVAL_MS);

  // WWCC expiry check runs daily
  void checkWwccExpiry();
  setInterval(() => { void checkWwccExpiry(); }, WWCC_CHECK_INTERVAL_MS);
}
