import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";

// No identity FKs or credentials; evidence survives account/profile removal.
export const accountLifecycleActionsTable = pgTable("account_lifecycle_actions", {
  id: serial("id").primaryKey(),
  actorUserId: integer("actor_user_id").notNull(),
  targetUserId: integer("target_user_id"),
  studentId: integer("student_id"),
  requestId: integer("request_id"),
  action: text("action").notNull(),
  retainedHistory: boolean("retained_history").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
