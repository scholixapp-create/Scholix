import { check, integer, pgTable, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const adminSensitiveActionAttemptsTable = pgTable("admin_sensitive_action_attempts", {
  userId: integer("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  windowStartedAt: timestamp("window_started_at").notNull().defaultNow(),
}, (table) => [
  check("admin_sensitive_action_attempts_count_check", sql`${table.failedAttempts} BETWEEN 0 AND 5`),
]);

export type AdminSensitiveActionAttempts = typeof adminSensitiveActionAttemptsTable.$inferSelect;
