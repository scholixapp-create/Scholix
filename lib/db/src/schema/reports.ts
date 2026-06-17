import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const reportCategoryEnum = pgEnum("report_category", [
  "safety_concern",
  "inappropriate_behaviour",
  "payment_issue",
  "tutoring_quality",
  "other",
]);

export const reportStatusEnum = pgEnum("report_status", ["open", "resolved"]);

export const reportsTable = pgTable("reports", {
  id: serial("id").primaryKey(),
  reporterUserId: integer("reporter_user_id").notNull().references(() => usersTable.id),
  reportedUserId: integer("reported_user_id").references(() => usersTable.id),
  sessionId: integer("session_id"),
  category: reportCategoryEnum("category").notNull(),
  message: text("message").notNull(),
  status: reportStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
