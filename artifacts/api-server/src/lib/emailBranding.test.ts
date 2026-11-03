import assert from "node:assert/strict";
import test from "node:test";
import {
  accountDeletionAdminEmailHtml,
  accountDeletionConfirmEmailHtml,
  adminReportEmailHtml,
  otpEmailHtml,
  passwordResetEmailHtml,
  paymentConfirmedEmailHtml,
  sessionBookedEmailHtml,
  sessionCompletedEmailHtml,
  sessionReminderEmailHtml,
  verificationInfoRequestedEmailHtml,
} from "./email";

const brandedEmails = [
  otpEmailHtml({ firstName: "Ari", otp: "123456" }),
  passwordResetEmailHtml({ firstName: "Ari", resetLink: "https://example.test/reset" }),
  sessionBookedEmailHtml({
    recipientName: "Ari", tutorName: "Lee Tutor", studentName: "Sam Student",
    subject: "Maths", date: "Monday", duration: 60, amount: 50,
  }),
  sessionReminderEmailHtml({
    recipientName: "Ari", tutorName: "Lee Tutor", studentName: "Sam Student",
    subject: "Maths", date: "Monday", time: "3:00 PM", duration: 60,
  }),
  sessionCompletedEmailHtml({
    recipientName: "Ari", tutorName: "Lee Tutor", studentName: "Sam Student",
    subject: "Maths", date: "Monday", duration: 60, totalAmount: 50,
  }),
  paymentConfirmedEmailHtml({
    recipientName: "Ari", tutorName: "Lee Tutor", subject: "Maths", date: "Monday", amount: 50,
  }),
  verificationInfoRequestedEmailHtml({
    recipientName: "Ari", notes: "Please update your details.", actionUrl: "https://example.test/verify",
  }),
  accountDeletionConfirmEmailHtml({ firstName: "Ari" }),
  accountDeletionAdminEmailHtml({ firstName: "Ari", lastName: "Parent", email: "ari@example.test" }),
  adminReportEmailHtml({
    category: "Other", reporterName: "Ari Parent", reporterEmail: "ari@example.test", description: "Please review.",
  }),
];

test("all email templates use the Scholix palette and shared wordmark", () => {
  for (const html of brandedEmails) {
    assert.match(html, /#faf7f0/);
    assert.match(html, /#0f2747/);
    assert.match(html, /#0e8b6b/);
    assert.match(html, /#d4a850/);
    assert.match(html, /★ Scholix/);
    assert.doesNotMatch(html, /#2563eb|#1d4ed8|#7c3aed|#1e3a5f/);
  }
});

test("user-controlled values are escaped in email HTML", () => {
  const booked = sessionBookedEmailHtml({
    recipientName: "<img src=x>", tutorName: "Tutor", studentName: "Student",
    subject: "<script>alert(1)</script>", date: "Today", duration: 60, amount: 50,
  });
  const report = adminReportEmailHtml({
    category: "Other", reporterName: "Reporter", reporterEmail: "reporter@example.test",
    description: "<script>alert(1)</script>",
  });
  const deletion = accountDeletionAdminEmailHtml({
    firstName: "Test", lastName: "User", email: "test@example.test",
    reason: "<script>alert(1)</script>",
  });

  for (const html of [booked, report, deletion]) {
    assert.doesNotMatch(html, /<script>/);
    assert.match(html, /&lt;script&gt;/);
  }
});
