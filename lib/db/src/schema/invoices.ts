import { pgTable, serial, integer, real, timestamp, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sessionsTable } from "./sessions";

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => sessionsTable.id),
  totalAmount: real("total_amount").notNull(),
  platformCommission: real("platform_commission").notNull(),
  tutorEarnings: real("tutor_earnings").notNull(),
  commissionRate: real("commission_rate").notNull().default(0.3),
  commissionTier: text("commission_tier"),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true, generatedAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;
