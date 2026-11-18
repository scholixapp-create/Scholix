import { db, tutorAvailabilityOverridesTable, tutorUnavailablePeriodsTable } from "@workspace/db";
import { and, eq, lt, sql } from "drizzle-orm";
import { localDate } from "./scheduling";
import { logger } from "./logger";

const warnedMissingTables = new Set<string>();

export async function cleanupExpiredTutorDateSettings(now = new Date(), tutorId?: number) {
  const today = localDate(now);
  const schemaResult = await db.execute(sql`SELECT
    to_regclass('public.tutor_availability_overrides') is not null AS "hasOverrides",
    to_regclass('public.tutor_unavailable_periods') is not null AS "hasUnavailablePeriods"`);
  const schema = schemaResult.rows[0] as { hasOverrides: boolean; hasUnavailablePeriods: boolean } | undefined;
  const missingTables = [
    !schema?.hasOverrides && "tutor_availability_overrides",
    !schema?.hasUnavailablePeriods && "tutor_unavailable_periods",
  ].filter((table): table is string => Boolean(table));
  for (const table of missingTables) {
    if (!warnedMissingTables.has(table)) {
      logger.warn({ table }, "Tutor date settings cleanup is waiting for its database migration");
      warnedMissingTables.add(table);
    }
  }
  if (schema?.hasOverrides) warnedMissingTables.delete("tutor_availability_overrides");
  if (schema?.hasUnavailablePeriods) warnedMissingTables.delete("tutor_unavailable_periods");

  const overrideFilter = tutorId === undefined
    ? lt(tutorAvailabilityOverridesTable.date, today)
    : and(eq(tutorAvailabilityOverridesTable.tutorId, tutorId), lt(tutorAvailabilityOverridesTable.date, today));
  const unavailableFilter = tutorId === undefined
    ? lt(tutorUnavailablePeriodsTable.endDate, today)
    : and(eq(tutorUnavailablePeriodsTable.tutorId, tutorId), lt(tutorUnavailablePeriodsTable.endDate, today));

  const overrides = schema?.hasOverrides
    ? await db.delete(tutorAvailabilityOverridesTable).where(overrideFilter)
      .returning({ id: tutorAvailabilityOverridesTable.id })
    : [];
  const unavailablePeriods = schema?.hasUnavailablePeriods
    ? await db.delete(tutorUnavailablePeriodsTable).where(unavailableFilter)
      .returning({ id: tutorUnavailablePeriodsTable.id })
    : [];
  return { overrides: overrides.length, unavailablePeriods: unavailablePeriods.length };
}
