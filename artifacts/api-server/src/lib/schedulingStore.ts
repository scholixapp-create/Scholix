import { db, tutorsTable, availabilityTable, tutorUnavailablePeriodsTable, sessionsTable, tutorRelationshipsTable, studentsTable } from "@workspace/db";
import { and, eq, inArray, lte, gte } from "drizzle-orm";
import { BookingError, generateSlots, validDate, type LessonMode } from "./scheduling";

type Store = Pick<typeof db, "select">;
type Tutor = typeof tutorsTable.$inferSelect;

export function isDateUnavailable(date: string, periods: ReadonlyArray<{ startDate: string; endDate: string }>) {
  return periods.some((period) => period.startDate <= date && date <= period.endDate);
}

export async function tutorSlots(store: Store, tutor: Tutor, parentId: number | null,
  date: string, duration: number, requestedMode?: LessonMode, now = new Date()) {
  if (!validDate(date) || !Number.isSafeInteger(duration) || duration < 15 || duration > 480) {
    throw new BookingError("A valid date and lesson duration are required", 400);
  }
  let durations = [60, 90];
  try { if (tutor.sessionDurations) durations = JSON.parse(tutor.sessionDurations); } catch { /* use documented default */ }
  if (!Array.isArray(durations) || !durations.includes(duration)) throw new BookingError("This tutor does not offer that lesson duration", 400);
  const [relationship] = parentId ? await store.select().from(tutorRelationshipsTable)
    .where(and(eq(tutorRelationshipsTable.tutorId, tutor.id), eq(tutorRelationshipsTable.parentId, parentId))).limit(1) : [];
  const agreedMode = relationship?.lessonMode;
  const mode = requestedMode ?? (agreedMode === "in_person" ? "in_person" : agreedMode === "online" ? "online"
    : tutor.teachingMode === "in_person" ? "in_person" : "online");
  if ((agreedMode && agreedMode !== mode) || (tutor.teachingMode !== "both" && (tutor.teachingMode ?? "online") !== mode)) {
    throw new BookingError("Choose the lesson mode agreed with this tutor", 400);
  }
  const buffer = Math.max(0, relationship?.travelBufferMinutes ?? tutor.travelBufferMinutes ?? 0);
  const windows = await store.select().from(availabilityTable).where(eq(availabilityTable.tutorId, tutor.id));
  const unavailable = await store.select().from(tutorUnavailablePeriodsTable).where(and(
    eq(tutorUnavailablePeriodsTable.tutorId, tutor.id),
    lte(tutorUnavailablePeriodsTable.startDate, date),
    gte(tutorUnavailablePeriodsTable.endDate, date),
  )).limit(1);
  const sessions = await store.select({
    session: sessionsTable, legacyMode: tutorRelationshipsTable.lessonMode,
    legacyBuffer: tutorRelationshipsTable.travelBufferMinutes,
  }).from(sessionsTable)
    .innerJoin(studentsTable, eq(studentsTable.id, sessionsTable.studentId))
    .leftJoin(tutorRelationshipsTable, and(eq(tutorRelationshipsTable.tutorId, sessionsTable.tutorId),
      eq(tutorRelationshipsTable.parentId, studentsTable.parentId)))
    .where(and(eq(sessionsTable.tutorId, tutor.id), inArray(sessionsTable.status, ["pending_payment", "pending_confirmation", "scheduled"])));
  const booked = sessions.filter(({ session: s }) => s.status === "scheduled" || (s.requestExpiresAt
    ? s.requestExpiresAt > now : s.createdAt.getTime() + 15 * 60_000 > now.getTime()))
    .map(({ session: s, legacyMode, legacyBuffer }) => ({
      scheduledAt: s.scheduledAt, durationMinutes: s.durationMinutes,
      // Legacy mixed/in-person bookings have no snapshot. Conservatively retain travel.
      lessonMode: (s.lessonMode ?? legacyMode ?? (tutor.teachingMode === "online" ? "online" : "in_person")) as LessonMode,
      travelBufferMinutes: s.travelBufferMinutes ?? legacyBuffer ?? tutor.travelBufferMinutes ?? 0,
    }));
  return { ...generateSlots({ date, duration, mode, buffer, windows: isDateUnavailable(date, unavailable) ? [] : windows, booked, now }), buffer };
}
