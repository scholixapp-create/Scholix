import { pgTable, serial, integer, text, timestamp, unique } from "drizzle-orm/pg-core";
import { tutorsTable } from "./tutors";
import { usersTable } from "./users";

export const tutorRelationshipsTable = pgTable("tutor_relationships", {
  id: serial("id").primaryKey(),
  tutorId: integer("tutor_id").notNull().references(() => tutorsTable.id),
  parentId: integer("parent_id").notNull().references(() => usersTable.id),
  // Per-relationship lesson mode override: "online" | "in_person"
  lessonMode: text("lesson_mode"),
  // Per-relationship travel buffer override in minutes (null = use tutor default)
  travelBufferMinutes: integer("travel_buffer_minutes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  unique("tutor_relationships_tutor_parent_unique").on(t.tutorId, t.parentId),
]);

export type TutorRelationship = typeof tutorRelationshipsTable.$inferSelect;
