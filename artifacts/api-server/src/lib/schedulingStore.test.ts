import assert from "node:assert/strict";
import test from "node:test";
import { isDateUnavailable } from "./schedulingStore";

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
