import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { logger } from "./logger";

export async function seedAdminUser(): Promise<void> {
  const isProduction = process.env["NODE_ENV"] === "production";
  const email = process.env["ADMIN_EMAIL"]?.trim();
  const password = process.env["ADMIN_PASSWORD"]?.trim();

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

  logger.info({ email }, "Seeding admin user...");

  const passwordHash = await bcrypt.hash(password, 10);

  const [existing] = await db
    .select({ id: usersTable.id, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  if (existing) {
    if (existing.role !== "admin") {
      logger.warn({ email }, "A non-admin user with this email already exists — not overwriting");
      return;
    }
    // Upsert: refresh the password hash in case ADMIN_PASSWORD changed
    await db
      .update(usersTable)
      .set({ passwordHash })
      .where(eq(usersTable.id, existing.id));
    logger.info({ email }, "Admin user already exists — password hash refreshed");
    return;
  }

  await db.insert(usersTable).values({
    email: email.toLowerCase(),
    passwordHash,
    firstName: "Admin",
    lastName: "Scholix",
    role: "admin",
    phone: null,
  });

  logger.info({ email }, "Admin user created from ADMIN_EMAIL/ADMIN_PASSWORD environment variables");
}
