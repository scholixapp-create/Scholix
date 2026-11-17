import test from "node:test";
import assert from "node:assert/strict";
import { CreateStudentBody, UpdateStudentBody } from "@workspace/api-zod";
import { cleanStudentAddress } from "./studentAddress";

test("creating a student profile requires a non-empty lesson address", () => {
  assert.equal(CreateStudentBody.safeParse({ firstName: "Avery" }).success, false);
  assert.equal(cleanStudentAddress("   "), null);
  assert.equal(CreateStudentBody.safeParse({ firstName: "Avery", address: "10 Example Street" }).success, true);
});

test("student profile updates can add but cannot blank the lesson address", () => {
  assert.equal(UpdateStudentBody.safeParse({ address: "" }).success, false);
  assert.equal(UpdateStudentBody.safeParse({ address: "10 Example Street" }).success, true);
  assert.equal(cleanStudentAddress("  10 Example Street  "), "10 Example Street");
});
