import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const subjectRequestsTable = pgTable("subject_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  tutorId: integer("tutor_id").notNull(),
  requestedSubject: text("requested_subject").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSubjectRequestSchema = createInsertSchema(subjectRequestsTable).omit({ id: true, createdAt: true });
export type InsertSubjectRequest = z.infer<typeof insertSubjectRequestSchema>;
export type SubjectRequest = typeof subjectRequestsTable.$inferSelect;
