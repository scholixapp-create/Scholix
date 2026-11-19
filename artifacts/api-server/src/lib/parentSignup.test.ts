import test from "node:test";
import assert from "node:assert/strict";
import { validateSignupIntake } from "./parentSignup";

const student = {
  firstName: "Riley",
  lastName: "Example",
  yearLevel: "Year 8",
  address: "10 Example Street, Sydney NSW 2000",
};

test("new parent intake requires an initial student profile with a lesson address", () => {
  assert.equal(validateSignupIntake("parent", { signupIntent: "find_tutor" }).ok, false);
  assert.equal(validateSignupIntake("parent", {
    signupIntent: "find_tutor",
    students: [{ ...student, address: "  " }],
  }).ok, false);

  const valid = validateSignupIntake("parent", { signupIntent: "find_tutor", students: [student] });
  assert.equal(valid.ok, true);
  if (valid.ok) assert.equal(valid.intake.students.length, 1);
});

test("parent intake captures a named known tutor and requires details for other", () => {
  assert.equal(validateSignupIntake("parent", {
    signupIntent: "knows_tutor",
    students: [student],
  }).ok, false);
  assert.equal(validateSignupIntake("parent", {
    signupIntent: "other",
    students: [student],
  }).ok, false);

  const valid = validateSignupIntake("parent", {
    signupIntent: "knows_tutor",
    knownTutorName: " Alex Tutor ",
    students: [student],
  });
  assert.equal(valid.ok, true);
  if (valid.ok) assert.equal(valid.intake.knownTutorName, "Alex Tutor");
});

test("tutor intake accepts business tools or a described other reason, but no student data", () => {
  const valid = validateSignupIntake("tutor", { signupIntent: "tutor_tools", students: [student] });
  assert.equal(valid.ok, true);
  if (valid.ok) assert.deepEqual(valid.intake.students, []);
  assert.equal(validateSignupIntake("tutor", { signupIntent: "find_tutor" }).ok, false);
  assert.equal(validateSignupIntake("tutor", { signupIntent: "other" }).ok, false);
});
