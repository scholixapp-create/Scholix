import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTutorCalendarIcs,
  createTutorCalendarToken,
  matchesTutorCalendarToken,
} from "./tutorCalendarFeed";

test("calendar feed tokens are scoped to tutor and revocation version", () => {
  const token = createTutorCalendarToken(12, 3, "a-secret-that-is-long-enough-for-hmac");
  assert.equal(matchesTutorCalendarToken(token, token), true);
  assert.equal(matchesTutorCalendarToken(createTutorCalendarToken(13, 3, "a-secret-that-is-long-enough-for-hmac"), token), false);
  assert.equal(matchesTutorCalendarToken(createTutorCalendarToken(12, 4, "a-secret-that-is-long-enough-for-hmac"), token), false);
  assert.equal(matchesTutorCalendarToken("not-a-calendar-token", token), false);
});

test("calendar feed exports booked and current tentative sessions without student details", () => {
  const now = new Date("2026-11-12T00:00:00.000Z");
  const feed = buildTutorCalendarIcs({
    tutorId: 7,
    now,
    sessions: [
      {
        id: 21,
        scheduledAt: new Date("2026-11-20T04:00:00.000Z"),
        durationMinutes: 60,
        status: "scheduled",
        requestExpiresAt: null,
      },
      {
        id: 22,
        scheduledAt: new Date("2026-11-21T04:00:00.000Z"),
        durationMinutes: 45,
        status: "pending_confirmation",
        requestExpiresAt: new Date("2026-11-21T00:00:00.000Z"),
      },
      {
        id: 23,
        scheduledAt: new Date("2026-11-22T04:00:00.000Z"),
        durationMinutes: 60,
        status: "pending_payment",
        requestExpiresAt: new Date("2026-11-11T00:00:00.000Z"),
      },
    ],
    unavailablePeriods: [
      { id: 5, startDate: "2026-12-24", endDate: "2026-12-26" },
      { id: 6, startDate: "2026-10-01", endDate: "2026-10-02" },
    ],
  });

  assert.match(feed, /SUMMARY:Scholix lesson/);
  assert.match(feed, /STATUS:CONFIRMED/);
  assert.match(feed, /STATUS:TENTATIVE/);
  assert.match(feed, /UID:scholix-tutor-7-session-21/);
  assert.match(feed, /UID:scholix-tutor-7-session-22/);
  assert.doesNotMatch(feed, /session-23|student|parent|address/i);
  assert.match(feed, /DTEND;VALUE=DATE:20261227/);
  assert.doesNotMatch(feed, /unavailable-6/);
  assert.ok(feed.endsWith("\r\n"));
});
