import { readFile } from "node:fs/promises";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  process.stderr.write("Parent intake migration failed: DATABASE_URL is missing.\n");
  process.exit(1);
}

const migrationUrl = new URL("./migrations/0014_parent_signup_and_information_requests.sql", import.meta.url);
const source = await readFile(migrationUrl, "utf8");
const migrationSql = source
  .replace(/^\s*BEGIN\s*;\s*/i, "")
  .replace(/\s*COMMIT\s*;\s*$/i, "");
if (migrationSql === source) {
  process.stderr.write("Parent intake migration failed: expected transaction markers were not found.\n");
  process.exit(1);
}

const { Client } = pg;
const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 10_000 });
let connected = false;

async function isApplied() {
  const result = await client.query(
    `SELECT table_name, column_name
       FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND (
          (table_name = 'users' AND column_name IN ('signup_intent', 'signup_intent_details', 'known_tutor_name'))
          OR (table_name = 'parent_information_requests'
              AND column_name IN ('id', 'parent_user_id', 'parent_email', 'admin_user_id', 'request_text',
                'target_user_id', 'response_text', 'status', 'requested_at', 'responded_at', 'closed_at'))
        )`,
  );
  const columns = new Set(result.rows.map((row) => `${row.table_name}.${row.column_name}`));
  const requiredColumns = [
    "users.signup_intent", "users.signup_intent_details", "users.known_tutor_name",
    "parent_information_requests.id", "parent_information_requests.parent_user_id",
    "parent_information_requests.target_user_id",
    "parent_information_requests.parent_email", "parent_information_requests.admin_user_id",
    "parent_information_requests.request_text", "parent_information_requests.response_text",
    "parent_information_requests.status", "parent_information_requests.requested_at",
    "parent_information_requests.responded_at", "parent_information_requests.closed_at",
  ];
  const typeResult = await client.query(
    `SELECT e.enumlabel
       FROM pg_type t
       JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname = 'notification_type'`,
  );
  const actionResult = await client.query(
    `SELECT pg_get_constraintdef(c.oid) AS definition
       FROM pg_constraint c
       JOIN pg_class t ON t.oid = c.conrelid
       JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = current_schema()
        AND t.relname = 'admin_user_actions'
        AND c.conname = 'admin_user_actions_action_check'`,
  );
  const statusResult = await client.query(
    `SELECT pg_get_constraintdef(c.oid) AS definition
       FROM pg_constraint c
       JOIN pg_class t ON t.oid = c.conrelid
       JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = current_schema()
        AND t.relname = 'parent_information_requests'
        AND c.conname = 'parent_information_requests_status_check'`,
  );
  const actionDefinition = String(actionResult.rows[0]?.definition ?? "");
  const statusDefinition = String(statusResult.rows[0]?.definition ?? "");

  return requiredColumns.every((column) => columns.has(column))
    && typeResult.rows.some((row) => row.enumlabel === "parent_information_requested")
    && actionDefinition.includes("parent_information_requested")
    && actionDefinition.includes("parent_information_closed")
    && statusDefinition.includes("pending")
    && statusDefinition.includes("responded")
    && statusDefinition.includes("closed");
}

try {
  await client.connect();
  connected = true;
  await client.query("BEGIN");
  if (await isApplied()) {
    await client.query("COMMIT");
    process.stdout.write("Parent intake migration 0014 is already applied and verified.\n");
  } else {
    await client.query(migrationSql);
    if (!(await isApplied())) {
      throw new Error("Expected signup fields, information-request table, and action constraints were not found.");
    }
    await client.query("COMMIT");
    process.stdout.write("Parent intake migration 0014 applied and verified.\n");
  }
} catch (error) {
  if (connected) await client.query("ROLLBACK").catch(() => {});
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "unknown";
  const detail = error instanceof Error ? error.message : "unknown migration error";
  process.stderr.write(`Parent intake migration failed (${detail}; database error ${code}).\n`);
  process.exitCode = 1;
} finally {
  if (connected) await client.end().catch(() => {});
}
