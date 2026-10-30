import assert from "node:assert/strict";
import test from "node:test";

// This file runs in its own test process. No database or email provider is contacted.
process.env["NODE_ENV"] = "production";
process.env["DATABASE_URL"] = "postgresql://unused.invalid/test";
delete process.env["RESEND_API_KEY"];

const { getEmailServiceStatus, sendEmail } = await import("./email");

test("missing email configuration does not enable production OTP disclosure", () => {
  const status = getEmailServiceStatus();
  assert.equal(status.resendConfigured, false);
  assert.equal(status.devMode, false);
});

test("production email failure remains a failure instead of an OTP bypass", async () => {
  const result = await sendEmail({
    to: "unused@example.invalid",
    subject: "Test",
    html: "<p>No real authentication code</p>",
  });
  assert.deepEqual(result, { delivered: false, devMode: false });
});
