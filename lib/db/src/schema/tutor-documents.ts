import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { tutorsTable } from "./tutors";

export const tutorDocumentsTable = pgTable("tutor_documents", {
  id: serial("id").primaryKey(),
  tutorId: integer("tutor_id").notNull().references(() => tutorsTable.id),
  docType: text("doc_type").notNull(), // 'wwcc' | 'education'
  originalName: text("original_name").notNull(),
  filePath: text("file_path").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export type TutorDocument = typeof tutorDocumentsTable.$inferSelect;
