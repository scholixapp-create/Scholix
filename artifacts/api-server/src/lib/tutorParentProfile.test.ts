import assert from "node:assert/strict";
import test from "node:test";
import { canTutorViewParentProfile } from "./tutorParentProfile";

const valid = {
  actorRole: "tutor",
  actorUserId: 8,
  tutorUserId: 8,
  parentRole: "parent",
  parentActive: true,
  parentArchivedAt: null,
  parentApproved: true,
  hasTutorHistory: true,
};

test("an assigned tutor can view an active approved parent's profile", () => {
  assert.equal(canTutorViewParentProfile(valid), true);
});

test("profile access rejects other roles, other tutors, and unrelated families", () => {
  assert.equal(canTutorViewParentProfile({ ...valid, actorRole: "parent" }), false);
  assert.equal(canTutorViewParentProfile({ ...valid, actorUserId: 9 }), false);
  assert.equal(canTutorViewParentProfile({ ...valid, hasTutorHistory: false }), false);
});

test("profile access rejects inactive, archived, unapproved, and non-parent accounts", () => {
  assert.equal(canTutorViewParentProfile({ ...valid, parentActive: false }), false);
  assert.equal(canTutorViewParentProfile({ ...valid, parentArchivedAt: new Date() }), false);
  assert.equal(canTutorViewParentProfile({ ...valid, parentApproved: false }), false);
  assert.equal(canTutorViewParentProfile({ ...valid, parentRole: "admin" }), false);
});
