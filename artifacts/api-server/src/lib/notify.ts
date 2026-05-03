import { db, notificationsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sendEmail } from "./email";
import { logger } from "./logger";

type NotificationType = "session_booked" | "payment_confirmed" | "session_completed" | "session_cancelled" | "session_reminder";

export async function createNotification(opts: {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  emailHtml?: string;
  emailSubject?: string;
}) {
  try {
    await db.insert(notificationsTable).values({
      userId: opts.userId,
      type: opts.type,
      title: opts.title,
      message: opts.message,
    });

    if (opts.emailHtml && opts.emailSubject) {
      const [user] = await db
        .select({ email: usersTable.email })
        .from(usersTable)
        .where(eq(usersTable.id, opts.userId))
        .limit(1);

      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: opts.emailSubject,
          html: opts.emailHtml,
        });
      }
    }
  } catch (err) {
    logger.error({ err }, "Failed to create notification");
  }
}
