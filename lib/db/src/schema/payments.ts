import { pgTable, serial, integer, real, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sessionsTable } from "./sessions";

export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid", "refunded"]);

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => sessionsTable.id),
  amount: real("amount").notNull(),
  status: paymentStatusEnum("status").notNull().default("pending"),
  simulatedAt: timestamp("simulated_at").defaultNow().notNull(),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, simulatedAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
