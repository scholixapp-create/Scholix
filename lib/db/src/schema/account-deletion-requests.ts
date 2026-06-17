import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const deletionRequestStatusEnum = pgEnum("deletion_request_status", [
  "pending",
  "approved",
  "rejected",
]);

export const accountDeletionRequestsTable = pgTable("account_deletion_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  reason: text("reason"),
  status: deletionRequestStatusEnum("status").notNull().default("pending"),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: integer("reviewed_by").references(() => usersTable.id),
});
