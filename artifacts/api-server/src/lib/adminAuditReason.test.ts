import assert from "node:assert/strict";
import test from "node:test";
import { isSafeAdminAuditReason } from "./adminAuditReason";

test("audit reasons reject password material, tokens, and likely OTPs", () => {
  assert.equal(isSafeAdminAuditReason("Password: hunter2 was shared with the tutor."), false);
  assert.equal(isSafeAdminAuditReason("Authorization token=abc123 was pasted."), false);
  assert.equal(isSafeAdminAuditReason("Use code 123456 to verify this action."), false);
  assert.equal(isSafeAdminAuditReason("Keep this value eyJabcdefgh.abcdefghij.abcdefghij private."), false);
  assert.equal(isSafeAdminAuditReason("Approved after review. github_pat_12345678901234567890"), false);
});

test("audit reasons reject the current admin password without rejecting normal reasons", () => {
  assert.equal(isSafeAdminAuditReason("Approved under the partnership agreement.", "my-password"), true);
  assert.equal(isSafeAdminAuditReason("The password my-password was shared.", "my-password"), false);
  assert.equal(isSafeAdminAuditReason("Approved after a compliance review.", "abcd"), true);
});
