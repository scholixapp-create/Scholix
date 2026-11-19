import { readFile } from "node:fs/promises";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  process.stderr.write("Commission waiver migration failed: DATABASE_URL is missing.\n");
  process.exit(1);
}

const migrationUrl = new URL("./migrations/0013_admin_tutor_commission_waiver.sql", import.meta.url);
const source = await readFile(migrationUrl, "utf8");
const migrationSql = source
  .replace(/^\s*BEGIN\s*;\s*/i, "")
  .replace(/\s*COMMIT\s*;\s*$/i, "");
if (migrationSql === source) {
  process.stderr.write("Commission waiver migration failed: expected transaction markers were not found.\n");
  process.exit(1);
}

const { Client } = pg;
const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 10_000 });
let connected = false;

async function getSchemaState() {
  const tables = await client.query(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_name IN ('users', 'tutors', 'admin_user_actions', 'admin_sensitive_action_attempts')`,
  );
  const tableNames = new Set(tables.rows.map((row) => row.table_name));
  const requiredBaseTables = ["users", "tutors", "admin_user_actions"];
  const missingBaseTables = requiredBaseTables.filter((table) => !tableNames.has(table));
  if (missingBaseTables.length) {
    throw new Error(`Required existing tables are missing: ${missingBaseTables.join(", ")}.`);
  }

  const columnsResult = await client.query(
    `SELECT table_name, column_name
       FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND (
          (table_name = 'tutors' AND column_name = 'commission_waived')
          OR (table_name = 'admin_user_actions' AND column_name = 'reason')
          OR (table_name = 'admin_sensitive_action_attempts'
              AND column_name IN ('user_id', 'failed_attempts', 'window_started_at'))
        )`,
  );
  const columns = new Set(columnsResult.rows.map((row) => `${row.table_name}.${row.column_name}`));
  const constraintsResult = await client.query(
    `SELECT table_name, constraint_name, constraint_type, pg_get_constraintdef(c.oid) AS definition
       FROM information_schema.table_constraints tc
       JOIN pg_class t ON t.relname = tc.table_name
       JOIN pg_namespace n ON n.oid = t.relnamespace AND n.nspname = tc.constraint_schema
       JOIN pg_constraint c ON c.conname = tc.constraint_name AND c.conrelid = t.oid
      WHERE tc.constraint_schema = current_schema()
        AND tc.table_name IN ('admin_user_actions', 'admin_sensitive_action_attempts')`,
  );
  const constraints = constraintsResult.rows;
  const actionConstraint = constraints.find((row) =>
    row.table_name === "admin_user_actions" && row.constraint_name === "admin_user_actions_action_check");
  const attemptsCheck = constraints.find((row) =>
    row.table_name === "admin_sensitive_action_attempts"
      && row.constraint_type === "CHECK"
      && String(row.definition).includes("failed_attempts"));
  const attemptsForeignKey = constraints.find((row) =>
    row.table_name === "admin_sensitive_action_attempts"
      && row.constraint_type === "FOREIGN KEY"
      && String(row.definition).includes("REFERENCES users"));

  const applied = columns.has("tutors.commission_waived")
    && columns.has("admin_user_actions.reason")
    && columns.has("admin_sensitive_action_attempts.user_id")
    && columns.has("admin_sensitive_action_attempts.failed_attempts")
    && columns.has("admin_sensitive_action_attempts.window_started_at")
    && actionConstraint
    && String(actionConstraint.definition).includes("commission_waiver_granted")
    && String(actionConstraint.definition).includes("commission_waiver_revoked")
    && attemptsCheck
    && attemptsForeignKey
    && /ON DELETE CASCADE/i.test(String(attemptsForeignKey.definition));

  const attemptsTableExists = tableNames.has("admin_sensitive_action_attempts");
  if (attemptsTableExists && !applied) {
    const attemptsColumnsPresent = [
      "admin_sensitive_action_attempts.user_id",
      "admin_sensitive_action_attempts.failed_attempts",
      "admin_sensitive_action_attempts.window_started_at",
    ].every((column) => columns.has(column));
    if (!attemptsColumnsPresent) {
      throw new Error("The sensitive-action attempts table is incomplete; refusing to guess how to repair it.");
    }
  }

  return Boolean(applied);
}

try {
  await client.connect();
  connected = true;
  await client.query("BEGIN");
  if (await getSchemaState()) {
    await client.query("COMMIT");
    process.stdout.write("Commission waiver migration 0013 is already applied and verified.\n");
  } else {
    await client.query(migrationSql);
    if (!(await getSchemaState())) {
      throw new Error("Expected commission waiver columns, audit actions, and security constraints were not found.");
    }
    await client.query("COMMIT");
    process.stdout.write("Commission waiver migration 0013 applied and verified.\n");
  }
} catch (error) {
  if (connected) await client.query("ROLLBACK").catch(() => {});
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "unknown";
  const detail = error instanceof Error ? error.message : "unknown migration error";
  process.stderr.write(`Commission waiver migration failed (${detail}; database error ${code}).\n`);
  process.exitCode = 1;
} finally {
  if (connected) await client.end().catch(() => {});
}
