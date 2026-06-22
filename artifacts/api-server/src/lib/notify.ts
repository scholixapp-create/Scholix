import { db, notificationsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sendEmail } from "./email";
import { logger } from "./logger";

type NotificationType =
  | "session_booked"
  | "payment_confirmed"
  | "session_completed"
  | "session_cancelled"
  | "session_reminder"
  | "action_confirm_session"
  | "action_upload_notes"
  | "action_rate_session"
  | "whatsapp_connect"
  | "invoice_generated";

export async function createNotification(opts: {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  emailHtml?: string;
  emailSubject?: string;
}) {
  try {
    await db.insert(notificationsTable).values({
      userId: opts.userId,
      type: opts.type,
      title: opts.title,
      message: opts.message,
      actionUrl: opts.actionUrl ?? null,
      actionLabel: opts.actionLabel ?? null,
    });

    if (opts.emailHtml && opts.emailSubject) {
      const [user] = await db
        .select({ email: usersTable.email, emailNotificationsEnabled: usersTable.emailNotificationsEnabled })
        .from(usersTable)
        .where(eq(usersTable.id, opts.userId))
        .limit(1);

      if (user?.email && user?.emailNotificationsEnabled) {
        await sendEmail({
          to: user.email,
          subject: opts.emailSubject,
          html: opts.emailHtml,
        });
      } else if (user && !user.emailNotificationsEnabled) {
        logger.info({ userId: opts.userId }, "Email skipped — user has notifications disabled");
      }
    }
  } catch (err) {
    logger.error({ err }, "Failed to create notification");
  }
}
