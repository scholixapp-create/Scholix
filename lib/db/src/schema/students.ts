import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const studentsTable = pgTable("students", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  email: text("email"),
  gradeLevel: text("grade_level"),
  school: text("school"),
  subjects: text("subjects"),
  goals: text("goals"),
  parentId: integer("parent_id"),
  dateOfBirth: text("date_of_birth"),
  isIdentityVerified: boolean("is_identity_verified").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStudentSchema = createInsertSchema(studentsTable).omit({ id: true, createdAt: true });
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof studentsTable.$inferSelect;
