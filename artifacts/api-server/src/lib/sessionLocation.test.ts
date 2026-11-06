import test from "node:test";
import assert from "node:assert/strict";
import { visibleSessionLocation } from "./sessionLocation";

const inPersonLesson = {
  viewerRole: "tutor",
  viewerId: 12,
  tutorUserId: 12,
  status: "scheduled",
  lessonMode: "in_person",
  parentAddress: "10 Example Street, Melbourne",
  studentActive: true,
  parentActive: true,
  parentApproved: true,
};

test("assigned tutor can see the address for a scheduled in-person lesson", () => {
  assert.equal(visibleSessionLocation(inPersonLesson), "10 Example Street, Melbourne");
});

test("address stays private for other viewers, online lessons, and unconfirmed requests", () => {
  assert.equal(visibleSessionLocation({ ...inPersonLesson, viewerId: 13 }), null);
  assert.equal(visibleSessionLocation({ ...inPersonLesson, viewerRole: "parent" }), null);
  assert.equal(visibleSessionLocation({ ...inPersonLesson, status: "pending_confirmation" }), null);
  assert.equal(visibleSessionLocation({ ...inPersonLesson, lessonMode: "online" }), null);
  assert.equal(visibleSessionLocation({ ...inPersonLesson, studentActive: false }), null);
  assert.equal(visibleSessionLocation({ ...inPersonLesson, parentActive: false }), null);
  assert.equal(visibleSessionLocation({ ...inPersonLesson, parentApproved: false }), null);
});

test("missing addresses stay unavailable rather than returning a blank location", () => {
  assert.equal(visibleSessionLocation({ ...inPersonLesson, parentAddress: " " }), null);
});
