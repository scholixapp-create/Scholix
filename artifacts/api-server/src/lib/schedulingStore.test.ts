import assert from "node:assert/strict";
import test from "node:test";
import { isDateUnavailable, windowsForDate } from "./schedulingStore";
import { generateSlots } from "./scheduling";

const periods = [
  { startDate: "2026-12-20", endDate: "2027-01-05" },
  { startDate: "2027-03-01", endDate: "2027-03-02" },
];

test("unavailability blocks every date in an inclusive range only", () => {
  assert.equal(isDateUnavailable("2026-12-19", periods), false);
  assert.equal(isDateUnavailable("2026-12-20", periods), true);
  assert.equal(isDateUnavailable("2027-01-05", periods), true);
  assert.equal(isDateUnavailable("2027-01-06", periods), false);
  assert.equal(isDateUnavailable("2027-03-02", periods), true);
});

test("a date-specific window replaces the recurring window only on that date", () => {
  const recurring = [{ dayOfWeek: 0, startTime: "09:00", endTime: "17:00" }];
  const overrides = [{ date: "2026-11-23", startTime: "13:00", endTime: "20:00" }];

  assert.deepEqual(windowsForDate("2026-11-23", recurring, overrides, false), [
    { dayOfWeek: 0, startTime: "13:00", endTime: "20:00" },
  ]);
  assert.deepEqual(windowsForDate("2026-11-30", recurring, overrides, false), recurring);
});

test("date-specific hours affect generated slots for one date without changing the following week", () => {
  const recurring = [{ dayOfWeek: 0, startTime: "16:00", endTime: "18:15" }];
  const overrides = [{ date: "2026-11-23", startTime: "17:00", endTime: "20:00" }];
  const date = "2026-11-23";
  const now = new Date("2026-11-20T00:00:00.000Z");
  const changedSlots = generateSlots({
    date,
    duration: 60,
    mode: "online",
    buffer: 0,
    windows: windowsForDate(date, recurring, overrides, false),
    booked: [],
    now,
  });
  const followingWeek = "2026-11-30";
  const recurringSlots = generateSlots({
    date: followingWeek,
    duration: 60,
    mode: "online",
    buffer: 0,
    windows: windowsForDate(followingWeek, recurring, overrides, false),
    booked: [],
    now,
  });

  assert.ok(changedSlots.slots.includes("17:00"));
  assert.equal(changedSlots.slots.includes("16:00"), false);
  assert.ok(recurringSlots.slots.includes("16:00"));
  assert.equal(recurringSlots.slots.includes("19:00"), false);
});

test("a full-day unavailable period still wins over a date-specific availability window", () => {
  const overrides = [{ date: "2026-11-23", startTime: "13:00", endTime: "20:00" }];
  assert.deepEqual(windowsForDate("2026-11-23", [], overrides, true), []);
});
