import test from "node:test";
import assert from "node:assert/strict";
import { conflicts, dayOfWeek, generateSlots, zonedInstant, validDate, type BookingRange } from "./scheduling";

const date = "2030-11-04";
const now = new Date("2030-11-01T00:00:00Z");
const windows = [{ dayOfWeek: dayOfWeek(date), startTime: "16:00", endTime: "18:15" }];
const range = (time: string, mode: "online" | "in_person" = "in_person", buffer = 15): BookingRange => ({
  scheduledAt: zonedInstant(date, time)!, durationMinutes: 60, lessonMode: mode, travelBufferMinutes: buffer,
});
const slots = (booked: BookingRange[] = [], mode: "online" | "in_person" = "in_person", duration = 60) =>
  generateSlots({ date, duration, mode, buffer: 15, windows, booked, now });

test("60-minute slots include quarter hours and prefer a packed 4pm / 5:15pm schedule", () => {
  assert.deepEqual(slots().slots, ["16:00", "16:15", "16:30", "16:45", "17:00", "17:15"]);
  assert.deepEqual(slots().preferredSlots, ["16:00", "17:15"]);
  assert.deepEqual(slots([range("16:00")]).slots, ["17:15"]);
});
test("90-minute lessons also support quarter-hour starts", () => {
  assert.deepEqual(slots([], "in_person", 90).slots, ["16:00", "16:15", "16:30", "16:45"]);
});
test("online lessons can be back-to-back, but travel remains after in-person", () => {
  assert.deepEqual(slots([range("16:15", "online")], "online").slots, ["17:15"]);
  assert.deepEqual(slots([range("16:15", "in_person")], "online").slots, []);
});
test("travel conflicts are symmetric regardless of booking insertion order", () => {
  const first = range("16:00", "online"), second = range("17:00", "in_person");
  assert.equal(conflicts(first, second), true);
  assert.equal(conflicts(second, first), true);
  assert.equal(conflicts(range("16:00"), range("17:15")), false);
  assert.equal(conflicts(range("16:00", "in_person", 30), range("17:15")), true);
});
test("Melbourne conversion honours summer and winter, independent of browser timezone", () => {
  assert.equal(zonedInstant("2026-11-15", "16:00")?.toISOString(), "2026-11-15T05:00:00.000Z");
  assert.equal(zonedInstant("2026-07-15", "16:00")?.toISOString(), "2026-07-15T06:00:00.000Z");
  assert.equal(zonedInstant("2026-10-04", "02:15"), null);
  assert.equal(validDate("2026-02-30"), false);
});
test("past times, outside windows, and overlapping windows never create invalid or duplicate starts", () => {
  const result = generateSlots({ date, duration: 60, mode: "online", buffer: 0,
    windows: [...windows, ...windows], booked: [], now: zonedInstant(date, "17:00")! });
  assert.deepEqual(result.slots, ["17:15"]);
  assert.deepEqual(Object.keys(result.slotInstants), result.slots);
});
