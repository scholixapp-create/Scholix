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
