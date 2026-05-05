import { pgTable, serial, integer, text, timestamp, real, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tutorsTable } from "./tutors";
import { studentsTable } from "./students";

export const sessionStatusEnum = pgEnum("session_status", ["pending_payment", "scheduled", "completed", "cancelled"]);

export const sessionsTable = pgTable("sessions", {
  id: serial("id").primaryKey(),
  tutorId: integer("tutor_id").notNull().references(() => tutorsTable.id),
  studentId: integer("student_id").notNull().references(() => studentsTable.id),
  subject: text("subject").notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  status: sessionStatusEnum("status").notNull().default("pending_payment"),
  isPaid: boolean("is_paid").notNull().default(false),
  totalAmount: real("total_amount").notNull().default(0),
  reminderSent: boolean("reminder_sent").notNull().default(false),
  isCommissionFree: boolean("is_commission_free").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSessionSchema = createInsertSchema(sessionsTable).omit({ id: true, createdAt: true });
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessionsTable.$inferSelect;
