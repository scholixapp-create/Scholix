import test from "node:test";
import assert from "node:assert/strict";
import { parentIntakeIssues, validateSignupIntake } from "./parentSignup";

const student = {
  firstName: "Riley",
  lastName: "Example",
  yearLevel: "Year 8",
  address: "10 Example Street, Sydney NSW 2000",
};

test("new parent intake requires an initial student profile with a lesson address", () => {
  assert.equal(validateSignupIntake("parent", { signupIntent: "find_tutor", parentAddress: "10 Family Street" }).ok, false);
  assert.equal(validateSignupIntake("parent", {
    parentAddress: "10 Family Street",
    signupIntent: "find_tutor",
    students: [{ ...student, address: "  " }],
  }).ok, false);

  assert.equal(validateSignupIntake("parent", {
    signupIntent: "find_tutor",
    students: [student],
  }).ok, false);
  const valid = validateSignupIntake("parent", {
    parentAddress: " 10 Family Street ",
    signupIntent: "find_tutor",
    students: [student],
  });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.intake.students.length, 1);
    assert.equal(valid.intake.parentAddress, "10 Family Street");
  }
});

test("parent intake captures a named known tutor and requires details for other", () => {
  assert.equal(validateSignupIntake("parent", {
    parentAddress: "10 Family Street",
    signupIntent: "knows_tutor",
    students: [student],
  }).ok, false);
  assert.equal(validateSignupIntake("parent", {
    parentAddress: "10 Family Street",
    signupIntent: "other",
    students: [student],
  }).ok, false);

  const valid = validateSignupIntake("parent", {
    parentAddress: "10 Family Street",
    signupIntent: "knows_tutor",
    knownTutorName: " Alex Tutor ",
    students: [student],
  });
  assert.equal(valid.ok, true);
  if (valid.ok) assert.equal(valid.intake.knownTutorName, "Alex Tutor");
});

test("parent approval intake reports missing contact address, reason, and child lesson details", () => {
  assert.deepEqual(parentIntakeIssues({
    students: [{ ...student, address: "" }],
  }), [
    "Enter the parent or guardian contact address.",
    "Choose what brought you to Scholix.",
    "Each student needs a first name, last name, year level, and lesson address.",
  ]);
});

test("tutor intake accepts business tools or a described other reason, but no student data", () => {
  const valid = validateSignupIntake("tutor", { signupIntent: "tutor_tools", students: [student] });
  assert.equal(valid.ok, true);
  if (valid.ok) assert.deepEqual(valid.intake.students, []);
  assert.equal(validateSignupIntake("tutor", { signupIntent: "find_tutor" }).ok, false);
  assert.equal(validateSignupIntake("tutor", { signupIntent: "other" }).ok, false);
});
