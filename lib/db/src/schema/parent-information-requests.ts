import { check, index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const parentInformationRequestsTable = pgTable("parent_information_requests", {
  id: serial("id").primaryKey(),
  parentUserId: integer("parent_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  targetUserId: integer("target_user_id").notNull(),
  parentEmail: text("parent_email").notNull(),
  adminUserId: integer("admin_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  requestText: text("request_text").notNull(),
  responseText: text("response_text"),
  status: text("status").notNull().default("pending"),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  respondedAt: timestamp("responded_at"),
  closedAt: timestamp("closed_at"),
}, (table) => [
  index("parent_information_requests_parent_status_idx").on(table.parentUserId, table.status),
  check("parent_information_requests_status_check", sql`${table.status} IN ('pending', 'responded', 'closed')`),
]);

export type ParentInformationRequest = typeof parentInformationRequestsTable.$inferSelect;
