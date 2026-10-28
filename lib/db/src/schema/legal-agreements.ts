import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const legalAgreementsTable = pgTable("legal_agreements", {
  id: serial("id").primaryKey(),
  // Retained agreement evidence may be anonymized from an account on deletion.
  userId: integer("user_id").references(() => usersTable.id),
  agreementType: text("agreement_type").notNull().default("terms"),
  agreementVersion: text("agreement_version").notNull().default("2.0"),
  acceptedAt: timestamp("accepted_at").defaultNow().notNull(),
  ipAddress: text("ip_address"),
});

export type LegalAgreement = typeof legalAgreementsTable.$inferSelect;
