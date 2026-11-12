import assert from "node:assert/strict";
import test from "node:test";
import { buildDayTimeline } from "./calendarTimeline";

const melbourneSession = (
  id: number,
  time: string,
  durationMinutes: number,
  lessonMode: "online" | "in_person",
  travelBufferMinutes: number,
  status = "scheduled",
  date = "2026-11-16",
) => ({
  id,
  subject: "Mathematics",
  studentName: "Student",
  scheduledAt: `${date}T${time}:00+11:00`,
  durationMinutes,
  lessonMode,
  travelBufferMinutes,
  status,
});

test("weekly timeline reserves travel between in-person lessons and displays session durations", () => {
  const blocks = buildDayTimeline([
    melbourneSession(1, "16:00", 60, "in_person", 15),
    melbourneSession(2, "17:15", 60, "online", 15),
  ], "2026-11-16");

  assert.deepEqual(blocks.map((block) => [block.kind, block.startMinute, block.durationMinutes]), [
    ["session", 16 * 60, 60],
    ["travel", 17 * 60, 15],
    ["session", 17 * 60 + 15, 60],
  ]);
});

test("online lessons have no travel block between them", () => {
  const blocks = buildDayTimeline([
    melbourneSession(1, "16:00", 60, "online", 30),
    melbourneSession(2, "17:00", 60, "online", 30),
  ], "2026-11-16");

  assert.equal(blocks.filter((block) => block.kind === "travel").length, 0);
});

test("travel is not inferred for another day or a cancelled session", () => {
  const blocks = buildDayTimeline([
    melbourneSession(1, "16:00", 60, "in_person", 15),
    melbourneSession(2, "17:15", 60, "in_person", 15, "cancelled"),
    melbourneSession(3, "16:00", 60, "in_person", 15, "scheduled", "2026-11-17"),
  ], "2026-11-16");

  assert.deepEqual(blocks.map((block) => block.kind), ["session"]);
});

test("a short gap still shows the full reserved travel buffer", () => {
  const blocks = buildDayTimeline([
    melbourneSession(1, "16:00", 60, "in_person", 15),
    melbourneSession(2, "17:10", 60, "online", 15),
  ], "2026-11-16");

  const travel = blocks.find((block) => block.kind === "travel");
  assert.equal(travel?.durationMinutes, 15);
});
