import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sessionsTable } from "./sessions";
import { tutorsTable } from "./tutors";
import { studentsTable } from "./students";

export const studentProgressTable = pgTable("student_progress", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => sessionsTable.id),
  tutorId: integer("tutor_id").notNull().references(() => tutorsTable.id),
  studentId: integer("student_id").notNull().references(() => studentsTable.id),
  score: integer("score").notNull().default(5),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStudentProgressSchema = createInsertSchema(studentProgressTable).omit({ id: true, createdAt: true });
export type InsertStudentProgress = z.infer<typeof insertStudentProgressSchema>;
export type StudentProgress = typeof studentProgressTable.$inferSelect;
