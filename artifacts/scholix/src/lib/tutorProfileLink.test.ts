import test from "node:test";
import assert from "node:assert/strict";
import { parseTutorProfileId, tutorProfilePath, tutorProfilePathFromDisplayName, tutorProfileSlug } from "./tutorProfileLink";

test("tutor profile links use a name-derived slug and stable tutor ID", () => {
  const tutor = { id: 42, firstName: "Olivia", lastName: "Williams" };
  assert.equal(tutorProfileSlug(tutor), "owil-42");
  assert.equal(tutorProfilePath(tutor), "/tutor/owil-42");
  assert.equal(parseTutorProfileId("owil-42"), 42);
});

test("profile routes continue accepting numeric legacy links and reject malformed IDs", () => {
  assert.equal(parseTutorProfileId("42"), 42);
  assert.equal(parseTutorProfileId("owil-0"), null);
  assert.equal(parseTutorProfileId("owil-not-an-id"), null);
});

test("name-derived URLs safely handle accents and missing name parts", () => {
  assert.equal(tutorProfileSlug({ id: 8, firstName: "Émile", lastName: "O'Neil" }), "eone-8");
  assert.equal(tutorProfileSlug({ id: 9, firstName: "", lastName: "" }), "tutor-9");
  assert.equal(tutorProfilePathFromDisplayName(11, "Anna Van der Meer"), "/tutor/avan-11");
});
