import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { canReapply, canRequestCode } from "./reapplicationPolicy";
import { isBookableTutor } from "./bookableTutor";
import { otpEmailHtml } from "./email";

test("only inactive parents and tutors can reapply with their existing role", () => {
  for (const role of ["parent", "tutor"]) {
    assert.equal(canReapply({ isActive: false, role }, role), true);
    assert.equal(canReapply({ isActive: true, role }, role), false);
    assert.equal(canReapply({ isActive: false, role }, role === "parent" ? "tutor" : "parent"), false);
  }
  for (const role of ["admin", "student"]) assert.equal(canReapply({ isActive: false, role }, role), false);
});

test("reapplication requests allow at most three emails in a ten-minute window", () => {
  const now = new Date("2026-11-05T03:00:00Z");
  assert.equal(canRequestCode(undefined, now), true);
  assert.equal(canRequestCode({ sends: 2, windowStartedAt: now }, now), true);
  assert.equal(canRequestCode({ sends: 3, windowStartedAt: now }, now), false);
  assert.equal(canRequestCode({ sends: 3, windowStartedAt: new Date(now.getTime() - 600_000) }, now), true);
});

test("inactive, unapproved, pending or expired tutors cannot accept bookings or payments", () => {
  const active = { isActive: true, isApproved: true, verificationStatus: "verified" };
  assert.equal(isBookableTutor(active), true);
  assert.equal(isBookableTutor(undefined), false);
  assert.equal(isBookableTutor({ ...active, isActive: false }), false);
  assert.equal(isBookableTutor({ ...active, isApproved: false }), false);
  for (const verificationStatus of ["pending", "expired", "rejected", "info_requested"]) {
    assert.equal(isBookableTutor({ ...active, verificationStatus }), false);
  }
});

test("reapplication emails explain that email verification does not reactivate the account", () => {
  const html = otpEmailHtml({ firstName: "<User>", otp: "123456", reapplication: true });
  assert.match(html, /an administrator must approve/);
  assert.match(html, /Verify your reapplication/);
  assert.match(html, /&lt;User&gt;/);
  assert.doesNotMatch(html, /complete your sign-in/);
});

test("reapplication verification locks state, limits attempts, consumes once and never issues a token", () => {
  const source = readFileSync(new URL("./reapplications.ts", import.meta.url), "utf8");
  assert.match(source, /previous\?\.verifiedAt\) return "pending"/);
  assert.match(source, /request\.attempts >= 5/);
  assert.match(source, /request\.verifiedAt\) return "submitted"/);
  assert.match(source, /set\(\{ verifiedAt: new Date\(\), otpHash: null \}\)/);
  assert.match(source, /\.for\("update"\)/);
  assert.doesNotMatch(source, /issueAccessToken|isActive: true|update\(usersTable\)/);
});

test("admin reactivation applies only verified proposals and always invalidates older authentication versions", () => {
  const store = readFileSync(new URL("./adminUserManagementStore.ts", import.meta.url), "utf8");
  assert.match(store, /isActive && application\?\.verifiedAt/);
  assert.match(store, /authVersion: sql`\$\{usersTable\.authVersion\} \+ 1`/);
  assert.match(store, /passwordHash: application\.passwordHash/);
  assert.match(store, /delete\(authOtpTokensTable\)/);
  assert.match(store, /delete\(passwordResetTokensTable\)/);
  const middleware = readFileSync(new URL("./authMiddleware.ts", import.meta.url), "utf8");
  assert.match(middleware, /user\.authVersion !== claims\.authVersion/);
  assert.match(middleware, /user\.authVersion === claims\.authVersion/);
});

test("session creation and payment confirmation hold the bookability lock through the write", () => {
  for (const route of ["sessions", "payments"]) {
    const source = readFileSync(new URL(`../routes/${route}.ts`, import.meta.url), "utf8");
    assert.match(source, /db\.transaction\(async \(tx\) => \{[\s\S]*?lockBookableTutor\(tx,/);
  }
  const source = readFileSync(new URL("../routes/tutors.ts", import.meta.url), "utf8");
  assert.match(source, /eq\(usersTable\.isActive, true\)/);
  assert.equal((source.match(/if \(!await isPublicTutor\(tutorId\)\)/g) ?? []).length, 3);
});

test("admin confirmation captures the intended status rather than toggling newly refreshed data", () => {
  const source = readFileSync(new URL("../../../scholix/src/pages/admin/Users.tsx", import.meta.url), "utf8");
  assert.match(source, /setConfirmIsActive\(!selectedUser\.isActive\)/);
  assert.match(source, /data: \{ isActive: confirmIsActive \}/);
  assert.doesNotMatch(source, /data: \{ isActive: !selectedUser\.isActive \}/);
});
