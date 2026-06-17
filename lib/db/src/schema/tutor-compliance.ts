import { pgTable, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { tutorsTable } from "./tutors";

export const tutorComplianceTable = pgTable("tutor_compliance", {
  id: serial("id").primaryKey(),
  tutorId: integer("tutor_id").notNull().unique().references(() => tutorsTable.id, { onDelete: "cascade" }),
  wwccDeclared: boolean("wwcc_declared").notNull().default(false),
  codeOfConductAccepted: boolean("code_of_conduct_accepted").notNull().default(false),
  acceptedAt: timestamp("accepted_at"),
});
