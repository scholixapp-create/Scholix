import { pgTable, serial, integer, text, boolean, date as pgDate, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tutorsTable } from "./tutors";

// Each row is a recurring weekly availability window for a tutor.
// dayOfWeek: 0=Mon, 1=Tue, ..., 6=Sun
// startTime / endTime: "HH:MM" (24h)
export const availabilityTable = pgTable("availability", {
  id: serial("id").primaryKey(),
  tutorId: integer("tutor_id").notNull().references(() => tutorsTable.id),
  dayOfWeek: integer("day_of_week"),      // 0=Mon … 6=Sun; nullable for legacy rows
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  timezone: text("timezone").notNull().default("Australia/Melbourne"),
  // Legacy columns — kept so existing rows don't break; not used for new records
  date: text("date"),
  isBooked: boolean("is_booked").default(false),
});

export const tutorUnavailablePeriodsTable = pgTable("tutor_unavailable_periods", {
  id: serial("id").primaryKey(),
  tutorId: integer("tutor_id").notNull().references(() => tutorsTable.id, { onDelete: "cascade" }),
  startDate: pgDate("start_date", { mode: "string" }).notNull(),
  endDate: pgDate("end_date", { mode: "string" }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("tutor_unavailable_periods_tutor_dates_idx").on(table.tutorId, table.startDate, table.endDate),
]);

export const insertAvailabilitySchema = createInsertSchema(availabilityTable).omit({ id: true });
export type InsertAvailability = z.infer<typeof insertAvailabilitySchema>;
export type Availability = typeof availabilityTable.$inferSelect;
