import { pgTable, serial, integer, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tutorsTable } from "./tutors";

export const availabilityTable = pgTable("availability", {
  id: serial("id").primaryKey(),
  tutorId: integer("tutor_id").notNull().references(() => tutorsTable.id),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
});

export const insertAvailabilitySchema = createInsertSchema(availabilityTable).omit({ id: true });
export type InsertAvailability = z.infer<typeof insertAvailabilitySchema>;
export type Availability = typeof availabilityTable.$inferSelect;
