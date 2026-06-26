import { pgTable, serial, integer, text, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const tutorsTable = pgTable("tutors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  bio: text("bio"),
  subjects: text("subjects").array().notNull().default([]),
  hourlyRate: real("hourly_rate").notNull().default(65),
  isApproved: boolean("is_approved").notNull().default(false),
  verificationStatus: text("verification_status").notNull().default("pending"),
  wwccNumber: text("wwcc_number"),
  wwccExpiry: text("wwcc_expiry"),
  educationDetails: text("education_details"),
  firstStudentId: integer("first_student_id"),
  abn: text("abn"),
  // Allowed session durations offered by the tutor, stored as JSON array e.g. "[60,90]"
  sessionDurations: text("session_durations"),
  // Teaching mode: "online" | "in_person" | "both"
  teachingMode: text("teaching_mode").notNull().default("online"),
  // Default travel buffer in minutes (0 = none). Only applied when mode is in_person/both.
  travelBufferMinutes: integer("travel_buffer_minutes").notNull().default(0),
  // Verification audit trail
  wwccVerifiedBy: integer("wwcc_verified_by"),
  wwccVerifiedAt: timestamp("wwcc_verified_at"),
  wwccVerificationMethod: text("wwcc_verification_method"),
  wwccVerificationNotes: text("wwcc_verification_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTutorSchema = createInsertSchema(tutorsTable).omit({ id: true, createdAt: true });
export type InsertTutor = z.infer<typeof insertTutorSchema>;
export type Tutor = typeof tutorsTable.$inferSelect;
