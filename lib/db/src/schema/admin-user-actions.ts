import { check, pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Intentionally no user foreign keys: the audit history must survive account changes.
export const adminUserActionsTable = pgTable("admin_user_actions", {
  id: serial("id").primaryKey(),
  actorUserId: integer("actor_user_id").notNull(),
  targetUserId: integer("target_user_id").notNull(),
  targetEmail: text("target_email"),
  action: text("action").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  check(
    "admin_user_actions_action_check",
    sql`${table.action} IN ('deactivated', 'reactivated', 'deleted')`,
  ),
]);

export type AdminUserAction = typeof adminUserActionsTable.$inferSelect;
