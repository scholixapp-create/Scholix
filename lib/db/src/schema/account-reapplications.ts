import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// Temporary authentication state, not business history. Administrative decisions
// are retained independently in the append-only admin action log.
export const accountReapplicationsTable = pgTable("account_reapplications", {
  userId: integer("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  passwordHash: text("password_hash").notNull(),
  otpHash: text("otp_hash"),
  expiresAt: timestamp("expires_at").notNull(),
  verifiedAt: timestamp("verified_at"),
  attempts: integer("attempts").notNull().default(0),
  sends: integer("sends").notNull().default(1),
  windowStartedAt: timestamp("window_started_at").notNull().defaultNow(),
});
