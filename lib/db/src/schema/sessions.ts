import { pgTable, serial, integer, text, timestamp, real, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tutorsTable } from "./tutors";
import { studentsTable } from "./students";

export const sessionStatusEnum = pgEnum("session_status", ["pending_payment", "pending_confirmation", "scheduled", "completed", "cancelled"]);

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
  availabilitySlotId: integer("availability_slot_id"),
  // Snapshot the agreed mode and buffer; later profile edits must not change an existing booking.
  lessonMode: text("lesson_mode"),
  travelBufferMinutes: integer("travel_buffer_minutes"),
  requestExpiresAt: timestamp("request_expires_at", { withTimezone: true }),
  tutorConfirmedAt: timestamp("tutor_confirmed_at", { withTimezone: true }),
  cancellationReason: text("cancellation_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSessionSchema = createInsertSchema(sessionsTable).omit({ id: true, createdAt: true });
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessionsTable.$inferSelect;
