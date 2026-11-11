import { logger } from "./logger";
import { config } from "./config";

// IMPORTANT: Resend requires a verified sender domain.
// Without domain verification Resend returns HTTP 403 "domain is not verified"
// as a RESOLVED promise — it does NOT throw. Always inspect result.error.
// Verify the sender domain at https://resend.com/domains before going to production.

let resendClient: any = null;

async function getResend() {
  if (resendClient) return resendClient;
  const apiKey = config.resendApiKey;
  if (!apiKey) return null;
  try {
    const { Resend } = await import("resend");
    resendClient = new Resend(apiKey);
    return resendClient;
  } catch {
    return null;
  }
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export interface SendEmailResult {
  delivered: boolean;
  devMode: boolean;
}

export interface EmailServiceStatus {
  resendConfigured: boolean;
  devMode: boolean;
  fromAddress: string;
  lastEmailError: { message: string; statusCode?: number; name?: string; time: string } | null;
  environment: string;
}

let lastEmailError: { message: string; statusCode?: number; name?: string; time: string } | null = null;

export function getEmailServiceStatus(): EmailServiceStatus {
  const resendConfigured = !!config.resendApiKey;
  const devMode = config.nodeEnv === "development" || config.nodeEnv === "test";
  return {
    resendConfigured,
    devMode,
    fromAddress: "notifications@send.scholix.com.au",
    lastEmailError,
    environment: config.nodeEnv,
  };
}

export async function sendEmail(payload: EmailPayload): Promise<SendEmailResult> {
  // Missing email configuration must never expose an authentication code in production.
  const devMode = config.nodeEnv === "development" || config.nodeEnv === "test";

  if (devMode) {
    logger.info(
      { to: payload.to, subject: payload.subject },
      "EMAIL_DEV_MODE — Resend not called; OTP will be returned in API response"
    );
    return { delivered: false, devMode: true };
  }

  const resend = await getResend();
  if (!resend) {
    const errInfo = { message: "Email delivery is not configured or could not initialise", time: new Date().toISOString() };
    lastEmailError = errInfo;
    logger.error({ to: payload.to }, "EMAIL_SEND_FAILED — Resend client could not be initialised");
    return { delivered: false, devMode: false };
  }

  try {
    const result = await resend.emails.send({
      from: "Scholix <notifications@send.scholix.com.au>",
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });

    if (result.error) {
      const errInfo = {
        message: result.error.message ?? "Unknown Resend error",
        statusCode: result.error.statusCode,
        name: result.error.name,
        time: new Date().toISOString(),
      };
      lastEmailError = errInfo;
      logger.error(
        {
          to: payload.to,
          statusCode: result.error.statusCode,
          errorName: result.error.name,
          message: result.error.message,
        },
        "EMAIL_SEND_FAILED"
      );
      if (
        result.error.statusCode === 403 &&
        typeof result.error.message === "string" &&
        result.error.message.toLowerCase().includes("domain")
      ) {
        logger.error(
          { fromAddress: "notifications@send.scholix.com.au" },
          "EMAIL_CONFIG_ERROR — Resend sender domain is not verified. " +
            "Go to https://resend.com/domains to add and verify send.scholix.com.au before production use."
        );
      }
      return { delivered: false, devMode: false };
    }

    lastEmailError = null;
    logger.info(
      { to: payload.to, subject: payload.subject, resendId: result.data?.id },
      "EMAIL_SEND_SUCCESS"
    );
    return { delivered: true, devMode: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    lastEmailError = { message, time: new Date().toISOString() };
    logger.error({ err, to: payload.to }, "EMAIL_SEND_FAILED — unexpected exception");
    return { delivered: false, devMode: false };
  }
}

const EMAIL_PALETTE = {
  cream: "#faf7f0",
  navy: "#0f2747",
  turquoise: "#0e8b6b",
  gold: "#d4a850",
  ink: "#25364a",
  muted: "#607086",
  border: "#e6e0d5",
  white: "#ffffff",
} as const;

function emailWrapper(headerText: string, body: string) {
  const title = escapeHtml(headerText);
  const logoUrl = escapeHtml(`${config.frontendUrl.replace(/\/+$/, "")}/brand/Scholix-star.svg`);
  return `
    <div style="margin:0;padding:24px 12px;background:${EMAIL_PALETTE.cream};font-family:Arial,Helvetica,sans-serif;color:${EMAIL_PALETTE.ink}">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;border-collapse:separate;border-spacing:0">
        <tr>
          <td align="center" style="padding:22px 20px 20px;background:${EMAIL_PALETTE.navy};border-radius:14px 14px 0 0">
            <p style="margin:0 0 8px;color:${EMAIL_PALETTE.white};font-size:22px;font-weight:700;letter-spacing:.2px">
              <img src="${logoUrl}" width="24" height="24" alt="" style="vertical-align:middle;margin-right:7px">
              Scholix
            </p>
            <h1 style="margin:0;color:${EMAIL_PALETTE.white};font-size:18px;line-height:1.35;font-weight:700">${title}</h1>
          </td>
        </tr>
        <tr>
          <td style="height:4px;background:${EMAIL_PALETTE.turquoise};font-size:0;line-height:0">&nbsp;</td>
        </tr>
        <tr>
          <td style="padding:24px;background:${EMAIL_PALETTE.white};border:1px solid ${EMAIL_PALETTE.border};border-top:0;border-radius:0 0 14px 14px">
            <div style="font-size:15px;line-height:1.6;color:${EMAIL_PALETTE.ink}">${body}</div>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:16px 10px 0;color:${EMAIL_PALETTE.muted};font-size:12px;line-height:1.5">
            Scholix automated email · Sign in to your account for details.
          </td>
        </tr>
      </table>
    </div>
  `;
}

export function bookingStatusEmailHtml(opts: { title: string; message: string; actionUrl: string }) {
  return emailWrapper(opts.title, `<p>${escapeHtml(opts.message)}</p>
    <p><a href="${escapeHtml(opts.actionUrl)}" style="display:inline-block;background:${EMAIL_PALETTE.turquoise};color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none">View booking</a></p>
    <p style="font-size:13px;color:${EMAIL_PALETTE.muted}">Scholix beta: authorisations, captures and releases are simulated. No real card is charged.</p>`);
}

function detailsTable(rows: { label: string; value: string; accent?: boolean }[]) {
  return `
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      ${rows.map((r, i) => `
        <tr style="${i > 0 ? `border-top:1px solid ${EMAIL_PALETTE.cream}` : ""}">
          <td style="padding:9px 0;color:${EMAIL_PALETTE.muted};font-size:14px">${escapeHtml(r.label)}</td>
          <td style="padding:9px 0;font-weight:600;color:${r.accent ? EMAIL_PALETTE.turquoise : EMAIL_PALETTE.navy};text-align:right;font-size:14px">${escapeHtml(r.value)}</td>
        </tr>
      `).join("")}
    </table>
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function verificationInfoRequestedEmailHtml(opts: {
  recipientName: string;
  notes?: string;
  actionUrl: string;
}) {
  const recipientName = escapeHtml(opts.recipientName);
  const notes = opts.notes?.trim()
    ? `<div style="background:${EMAIL_PALETTE.cream};border:1px solid ${EMAIL_PALETTE.border};border-radius:8px;padding:14px;margin:16px 0;color:${EMAIL_PALETTE.ink};font-size:14px;line-height:1.5;white-space:pre-wrap">${escapeHtml(opts.notes.trim())}</div>`
    : "";
  const actionUrl = escapeHtml(opts.actionUrl);
  const body = `
    <p style="color:${EMAIL_PALETTE.ink};margin-top:0;margin-bottom:4px">Hi <strong>${recipientName}</strong>,</p>
    <p style="color:${EMAIL_PALETTE.muted};margin-top:0;margin-bottom:0">Our verification team needs some more information before we can complete your tutor application.</p>
    ${notes}
    <p style="margin:20px 0 0">
      <a href="${actionUrl}" style="display:inline-block;background:${EMAIL_PALETTE.turquoise};color:#fff;text-decoration:none;padding:11px 18px;border-radius:8px;font-size:14px;font-weight:600">Update your application</a>
    </p>
    <p style="color:${EMAIL_PALETTE.muted};font-size:13px;margin:16px 0 0">You can also sign in to Scholix and open your verification page.</p>
  `;
  return emailWrapper("More information required", body);
}

export function sessionBookedEmailHtml(opts: {
  recipientName: string;
  tutorName: string;
  studentName: string;
  subject: string;
  date: string;
  duration: number;
  amount: number;
}) {
  const recipientName = escapeHtml(opts.recipientName);
  const body = `
    <p style="color:${EMAIL_PALETTE.ink};margin-top:0;margin-bottom:4px">Hi <strong>${recipientName}</strong>,</p>
    <p style="color:${EMAIL_PALETTE.muted};margin-top:0;margin-bottom:0">A tutoring session has been confirmed.</p>
    ${detailsTable([
      { label: "Student", value: opts.studentName },
      { label: "Tutor", value: opts.tutorName },
      { label: "Subject", value: opts.subject },
      { label: "Date & time", value: opts.date },
      { label: "Duration", value: `${opts.duration} min` },
      { label: "Amount", value: `$${opts.amount.toFixed(2)}`, accent: true },
    ])}
    <p style="color:${EMAIL_PALETTE.muted};font-size:13px;margin-bottom:0">Log in to Scholix to view your session details.</p>
  `;
  return emailWrapper("Session booked", body);
}

export function sessionReminderEmailHtml(opts: {
  recipientName: string;
  tutorName: string;
  studentName: string;
  subject: string;
  date: string;
  time: string;
  duration: number;
}) {
  const recipientName = escapeHtml(opts.recipientName);
  const body = `
    <p style="color:${EMAIL_PALETTE.ink};margin-top:0;margin-bottom:4px">Hi <strong>${recipientName}</strong>,</p>
    <p style="color:${EMAIL_PALETTE.muted};margin-top:0;margin-bottom:0">You have a session coming up <strong>tomorrow</strong>.</p>
    ${detailsTable([
      { label: "Student", value: opts.studentName },
      { label: "Tutor", value: opts.tutorName },
      { label: "Subject", value: opts.subject },
      { label: "Date", value: opts.date },
      { label: "Time", value: opts.time },
      { label: "Duration", value: `${opts.duration} min` },
    ])}
    <p style="color:${EMAIL_PALETTE.muted};font-size:13px;margin-bottom:0">Make sure you're prepared and ready to go!</p>
  `;
  return emailWrapper("Session tomorrow", body);
}

export function sessionCompletedEmailHtml(opts: {
  recipientName: string;
  tutorName: string;
  studentName: string;
  subject: string;
  date: string;
  duration: number;
  totalAmount: number;
  tutorEarnings?: number;
  commissionTier?: string;
  isCommissionFree?: boolean;
  reviewUrl?: string;
}) {
  const earningsRow = opts.tutorEarnings !== undefined
    ? [{ label: "Your earnings", value: `$${opts.tutorEarnings.toFixed(2)}`, accent: true }]
    : [{ label: "Total amount", value: `$${opts.totalAmount.toFixed(2)}`, accent: true }];

  const freeTag = opts.isCommissionFree
    ? `<div style="background:${EMAIL_PALETTE.cream};border:1px solid ${EMAIL_PALETTE.gold};border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:13px;color:${EMAIL_PALETTE.navy};font-weight:500">
        Platform fee waived. You keep 100% of this session.
      </div>`
    : "";

  const recipientName = escapeHtml(opts.recipientName);
  const body = `
    <p style="color:${EMAIL_PALETTE.ink};margin-top:0;margin-bottom:4px">Hi <strong>${recipientName}</strong>,</p>
    <p style="color:${EMAIL_PALETTE.muted};margin-top:0;margin-bottom:12px">Your session has been completed successfully.</p>
    ${freeTag}
    ${detailsTable([
      { label: "Student", value: opts.studentName },
      { label: "Tutor", value: opts.tutorName },
      { label: "Subject", value: opts.subject },
      { label: "Date", value: opts.date },
      { label: "Duration", value: `${opts.duration} min` },
      ...earningsRow,
    ])}
    <p style="color:${EMAIL_PALETTE.muted};font-size:13px;margin-bottom:0">Your invoice is available in your Scholix account.</p>
    ${opts.reviewUrl ? `
      <p style="color:${EMAIL_PALETTE.ink};font-size:14px;margin-top:20px">How was your experience with this tutor? You can leave one review per tutor.</p>
      <p style="margin:16px 0"><a href="${escapeHtml(opts.reviewUrl)}" style="display:inline-block;background:${EMAIL_PALETTE.turquoise};color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">Leave a review</a></p>
    ` : ""}
  `;
  return emailWrapper("Session completed", body);
}

export function paymentConfirmedEmailHtml(opts: {
  recipientName: string;
  tutorName: string;
  subject: string;
  date: string;
  amount: number;
}) {
  const recipientName = escapeHtml(opts.recipientName);
  const body = `
    <p style="color:${EMAIL_PALETTE.ink};margin-top:0;margin-bottom:0">Hi <strong>${recipientName}</strong>,</p>
    <p style="color:${EMAIL_PALETTE.muted};margin-top:0;margin-bottom:0">Your payment has been confirmed and your session is locked in!</p>
    ${detailsTable([
      { label: "Tutor", value: opts.tutorName },
      { label: "Subject", value: opts.subject },
      { label: "Session date", value: opts.date },
      { label: "Amount paid", value: `$${opts.amount.toFixed(2)}`, accent: true },
    ])}
    <p style="color:${EMAIL_PALETTE.muted};font-size:13px;margin-bottom:0">See you at the session! Log in to Scholix to view details.</p>
  `;
  return emailWrapper("Payment confirmed", body);
}

export function passwordResetEmailHtml(opts: { firstName: string; resetLink: string }) {
  const firstName = escapeHtml(opts.firstName);
  const resetLink = escapeHtml(opts.resetLink);
  const body = `
    <p style="color:${EMAIL_PALETTE.ink};margin-top:0;margin-bottom:4px">Hi <strong>${firstName}</strong>,</p>
    <p style="color:${EMAIL_PALETTE.muted};margin-top:0;margin-bottom:20px">We received a request to reset your Scholix password. Click the button below to choose a new password.</p>
    <div style="text-align:center;margin:24px 0">
      <a href="${resetLink}" style="background:${EMAIL_PALETTE.turquoise};color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;font-size:15px;display:inline-block">
        Reset my password
      </a>
    </div>
    <p style="color:${EMAIL_PALETTE.muted};font-size:13px;margin-top:20px;margin-bottom:0">This link expires in <strong>30 minutes</strong>. If you didn't request a password reset, you can safely ignore this email. Your password won't change.</p>
  `;
  return emailWrapper("Reset your password", body);
}

export function otpEmailHtml(opts: { firstName: string; otp: string; reapplication?: boolean }) {
  const firstName = escapeHtml(opts.firstName);
  const otp = escapeHtml(opts.otp);
  const body = `
    <p style="color:${EMAIL_PALETTE.ink};margin-top:0;margin-bottom:4px">Hi <strong>${firstName}</strong>,</p>
    <p style="color:${EMAIL_PALETTE.muted};margin-top:0;margin-bottom:20px">${opts.reapplication ? "Use this code to verify your account reapplication. This does not reactivate your account; an administrator must approve it." : "Use the code below to complete your sign-in to Scholix."} It expires in <strong>10 minutes</strong>.</p>
    <div style="text-align:center;margin:24px 0">
      <div style="display:inline-block;background:${EMAIL_PALETTE.cream};border:1px solid ${EMAIL_PALETTE.gold};border-radius:14px;padding:20px 40px">
        <p style="margin:0;font-size:36px;font-weight:700;letter-spacing:10px;color:${EMAIL_PALETTE.navy};font-family:monospace">${otp}</p>
      </div>
    </div>
    <p style="color:${EMAIL_PALETTE.muted};font-size:13px;margin-top:20px;margin-bottom:0">Never share this code with anyone. Scholix staff will never ask for it.</p>
  `;
  return emailWrapper(opts.reapplication ? "Verify your reapplication" : "Your sign-in code", body);
}

export function accountDeletionConfirmEmailHtml(opts: { firstName: string }) {
  const firstName = escapeHtml(opts.firstName);
  const body = `
    <p style="color:${EMAIL_PALETTE.ink};margin-top:0;margin-bottom:4px">Hi <strong>${firstName}</strong>,</p>
    <p style="color:${EMAIL_PALETTE.muted};margin-top:0;margin-bottom:12px">We've received your request to delete your Scholix account. Here's what happens next:</p>
    <ul style="color:${EMAIL_PALETTE.muted};font-size:14px;padding-left:20px;margin:0 0 16px">
      <li style="margin-bottom:8px">Our team will review your request within 2 business days</li>
      <li style="margin-bottom:8px">Financial records (invoices, payments) are kept for 7 years as required by Australian law</li>
      <li style="margin-bottom:8px">You'll receive a confirmation email once your account has been removed</li>
    </ul>
    <p style="color:${EMAIL_PALETTE.muted};font-size:13px;margin-bottom:0">If you submitted this by mistake, please contact us at <a href="mailto:support@scholix.app" style="color:${EMAIL_PALETTE.turquoise}">support@scholix.app</a> as soon as possible.</p>
  `;
  return emailWrapper("Deletion request received", body);
}

export function accountDeletionAdminEmailHtml(opts: {
  firstName: string;
  lastName: string;
  email: string;
  reason?: string;
}) {
  const reason = opts.reason?.trim()
    ? `<div style="margin-top:18px"><p style="margin:0 0 6px;font-size:13px;font-weight:700;color:${EMAIL_PALETTE.navy}">Reason</p><div style="padding:12px;background:${EMAIL_PALETTE.cream};border:1px solid ${EMAIL_PALETTE.border};border-radius:8px;white-space:pre-wrap">${escapeHtml(opts.reason.trim())}</div></div>`
    : "";
  const body = `
    <p style="margin-top:0;color:${EMAIL_PALETTE.ink}">An account deletion request was submitted.</p>
    ${detailsTable([
      { label: "Name", value: `${opts.firstName} ${opts.lastName}` },
      { label: "Email", value: opts.email },
    ])}
    ${reason}
  `;
  return emailWrapper("Account deletion request", body);
}

export function adminReportEmailHtml(opts: {
  category: string;
  reporterName: string;
  reporterEmail: string;
  reportedUserId?: number;
  sessionId?: number;
  description: string;
}) {
  const description = escapeHtml(opts.description);
  const body = `
    <p style="margin-top:0;color:${EMAIL_PALETTE.ink}">A new report was submitted on Scholix.</p>
    ${detailsTable([
      { label: "Category", value: opts.category },
      { label: "Reporter", value: opts.reporterName },
      { label: "Reporter email", value: opts.reporterEmail },
      ...(opts.reportedUserId === undefined ? [] : [{ label: "Reported user ID", value: String(opts.reportedUserId) }]),
      ...(opts.sessionId === undefined ? [] : [{ label: "Session ID", value: String(opts.sessionId) }]),
    ])}
    <p style="margin:18px 0 6px;color:${EMAIL_PALETTE.navy};font-weight:700">Description</p>
    <div style="padding:12px;background:${EMAIL_PALETTE.cream};border:1px solid ${EMAIL_PALETTE.border};border-radius:8px;white-space:pre-wrap;color:${EMAIL_PALETTE.ink}">${description}</div>
    <p style="margin-bottom:0;color:${EMAIL_PALETTE.muted};font-size:13px">Log in to the Scholix admin panel to review this report.</p>
  `;
  return emailWrapper("New report submitted", body);
}
