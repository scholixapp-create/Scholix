import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

// Intentionally no user foreign keys: the audit history must survive account changes.
export const adminUserActionsTable = pgTable("admin_user_actions", {
  id: serial("id").primaryKey(),
  actorUserId: integer("actor_user_id").notNull(),
  targetUserId: integer("target_user_id").notNull(),
  action: text("action").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AdminUserAction = typeof adminUserActionsTable.$inferSelect;
