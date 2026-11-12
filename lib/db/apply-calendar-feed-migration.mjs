import { readFile } from "node:fs/promises";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  process.stderr.write("Calendar feed migration failed: DATABASE_URL is missing.\n");
  process.exit(1);
}

const migrationUrl = new URL("./migrations/0010_tutor_calendar_feed.sql", import.meta.url);
const migrationSql = await readFile(migrationUrl, "utf8");
const { Client } = pg;
const client = new Client({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 10_000,
});

let connected = false;
try {
  await client.connect();
  connected = true;
  await client.query("BEGIN");
  await client.query(migrationSql);
  const result = await client.query(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'tutors'
        AND column_name IN ('calendar_feed_enabled', 'calendar_feed_version')`,
  );
  const columns = new Set(result.rows.map((row) => row.column_name));
  if (!columns.has("calendar_feed_enabled") || !columns.has("calendar_feed_version")) {
    throw new Error("Expected calendar feed columns were not found after migration.");
  }
  await client.query("COMMIT");
  process.stdout.write("Calendar feed migration 0010 applied and verified.\n");
} catch (error) {
  if (connected) await client.query("ROLLBACK").catch(() => {});
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "unknown";
  process.stderr.write(`Calendar feed migration 0010 failed (database error ${code}).\n`);
  process.exitCode = 1;
} finally {
  if (connected) await client.end().catch(() => {});
}
