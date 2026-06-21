import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const ACADEMY_CATEGORIES = [
  "ABN Basics",
  "Tax Responsibilities",
  "GST Explained",
  "Superannuation Basics",
  "Setting Aside Tax",
  "Pricing Strategy",
  "Professional Tutoring Tips",
  "Business Growth",
  "Student Acquisition",
  "Teaching Methods",
] as const;

export type AcademyCategory = (typeof ACADEMY_CATEGORIES)[number];

export const tutorArticlesTable = pgTable("tutor_articles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  category: text("category").notNull(),
  summary: text("summary").notNull().default(""),
  content: text("content").notNull().default(""),
  type: text("type").notNull().default("article"),
  videoUrl: text("video_url"),
  isPublished: boolean("is_published").notNull().default(false),
  authorId: integer("author_id").references(() => usersTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type TutorArticle = typeof tutorArticlesTable.$inferSelect;
export type InsertTutorArticle = typeof tutorArticlesTable.$inferInsert;
