import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";
import { logger } from "./logger";

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "scholix_salt").digest("hex");
}

export async function seedAdminUser(): Promise<void> {
  const isProduction = process.env["NODE_ENV"] === "production";
  const email = process.env["ADMIN_EMAIL"];
  const password = process.env["ADMIN_PASSWORD"];

  if (!email || !password) {
    if (isProduction) {
      logger.error(
        "FATAL: ADMIN_EMAIL and ADMIN_PASSWORD must be set in production. " +
        "The server will not start without them to prevent an insecure default admin account. " +
        "Set these environment variables and restart."
      );
      process.exit(1);
    }
    logger.warn(
      "ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin seed. " +
      "Demo admin@scholix.com account remains active (development only)."
    );
    return;
  }

  const [existing] = await db
    .select({ id: usersTable.id, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  if (existing) {
    if (existing.role !== "admin") {
      logger.warn({ email }, "A non-admin user with this email already exists — not overwriting");
    } else {
      logger.info({ email }, "Admin user already exists — no action needed");
    }
    return;
  }

  await db.insert(usersTable).values({
    email: email.toLowerCase(),
    passwordHash: hashPassword(password),
    firstName: "Admin",
    lastName: "Scholix",
    role: "admin",
    phone: null,
  });

  logger.info({ email }, "Admin user created from ADMIN_EMAIL/ADMIN_PASSWORD environment variables");
}
