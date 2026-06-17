import { logger } from "./logger";
import { config } from "./config";

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

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const resend = await getResend();
  if (!resend) {
    logger.info(
      { to: payload.to, subject: payload.subject },
      `[EMAIL MOCK] To: ${payload.to} | Subject: ${payload.subject}`
    );
    return;
  }
  try {
    await resend.emails.send({
      from: "Scholix <notifications@scholix.app>",
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });
    logger.info({ to: payload.to, subject: payload.subject }, "Email sent");
  } catch (err) {
    logger.error({ err, to: payload.to }, "Failed to send email");
  }
}

function emailWrapper(headerColor: string, headerText: string, body: string) {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:32px 20px;background:#f1f5f9">
      <div style="background:${headerColor};border-radius:14px;padding:28px 24px;margin-bottom:20px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;letter-spacing:-0.3px">${headerText}</h1>
      </div>
      <div style="background:#fff;border-radius:14px;padding:28px 24px;border:1px solid #e2e8f0">
        ${body}
      </div>
      <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:20px;margin-bottom:0">
        © Scholix Tutoring Platform · You're receiving this because you have email notifications enabled.
      </p>
    </div>
  `;
}

function detailsTable(rows: { label: string; value: string; accent?: boolean }[]) {
  return `
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      ${rows.map((r, i) => `
        <tr style="${i > 0 ? "border-top:1px solid #f1f5f9" : ""}">
          <td style="padding:9px 0;color:#64748b;font-size:14px">${r.label}</td>
          <td style="padding:9px 0;font-weight:600;color:${r.accent ? "#2563eb" : "#0f172a"};text-align:right;font-size:14px">${r.value}</td>
        </tr>
      `).join("")}
    </table>
  `;
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
  const body = `
    <p style="color:#374151;margin-top:0;margin-bottom:4px">Hi <strong>${opts.recipientName}</strong>,</p>
    <p style="color:#64748b;margin-top:0;margin-bottom:0">A tutoring session has been confirmed.</p>
    ${detailsTable([
      { label: "Student", value: opts.studentName },
      { label: "Tutor", value: opts.tutorName },
      { label: "Subject", value: opts.subject },
      { label: "Date & time", value: opts.date },
      { label: "Duration", value: `${opts.duration} min` },
      { label: "Amount", value: `$${opts.amount.toFixed(2)}`, accent: true },
    ])}
    <p style="color:#64748b;font-size:13px;margin-bottom:0">Log in to Scholix to view your session details.</p>
  `;
  return emailWrapper("#2563eb", "📚 Session Booked", body);
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
  const body = `
    <p style="color:#374151;margin-top:0;margin-bottom:4px">Hi <strong>${opts.recipientName}</strong>,</p>
    <p style="color:#64748b;margin-top:0;margin-bottom:0">You have a session coming up <strong>tomorrow</strong>.</p>
    ${detailsTable([
      { label: "Student", value: opts.studentName },
      { label: "Tutor", value: opts.tutorName },
      { label: "Subject", value: opts.subject },
      { label: "Date", value: opts.date },
      { label: "Time", value: opts.time },
      { label: "Duration", value: `${opts.duration} min` },
    ])}
    <p style="color:#64748b;font-size:13px;margin-bottom:0">Make sure you're prepared and ready to go!</p>
  `;
  return emailWrapper("#7c3aed", "🔔 Session Tomorrow", body);
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
}) {
  const earningsRow = opts.tutorEarnings !== undefined
    ? [{ label: "Your earnings", value: `$${opts.tutorEarnings.toFixed(2)}`, accent: true }]
    : [{ label: "Total amount", value: `$${opts.totalAmount.toFixed(2)}`, accent: true }];

  const freeTag = opts.isCommissionFree
    ? `<div style="background:#d1fae5;border:1px solid #a7f3d0;border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:13px;color:#065f46;font-weight:500">
        ✨ Platform fee waived — you keep 100% of this session.
      </div>`
    : "";

  const body = `
    <p style="color:#374151;margin-top:0;margin-bottom:4px">Hi <strong>${opts.recipientName}</strong>,</p>
    <p style="color:#64748b;margin-top:0;margin-bottom:12px">Your session has been completed successfully.</p>
    ${freeTag}
    ${detailsTable([
      { label: "Student", value: opts.studentName },
      { label: "Tutor", value: opts.tutorName },
      { label: "Subject", value: opts.subject },
      { label: "Date", value: opts.date },
      { label: "Duration", value: `${opts.duration} min` },
      ...earningsRow,
    ])}
    <p style="color:#64748b;font-size:13px;margin-bottom:0">Your invoice is available in your Scholix account.</p>
  `;
  return emailWrapper("#059669", "✅ Session Completed", body);
}

export function paymentConfirmedEmailHtml(opts: {
  recipientName: string;
  tutorName: string;
  subject: string;
  date: string;
  amount: number;
}) {
  const body = `
    <p style="color:#374151;margin-top:0;margin-bottom:4px">Hi <strong>${opts.recipientName}</strong>,</p>
    <p style="color:#64748b;margin-top:0;margin-bottom:0">Your payment has been confirmed and your session is locked in!</p>
    ${detailsTable([
      { label: "Tutor", value: opts.tutorName },
      { label: "Subject", value: opts.subject },
      { label: "Session date", value: opts.date },
      { label: "Amount paid", value: `$${opts.amount.toFixed(2)}`, accent: true },
    ])}
    <p style="color:#64748b;font-size:13px;margin-bottom:0">See you at the session! Log in to Scholix to view details.</p>
  `;
  return emailWrapper("#059669", "✅ Payment Confirmed", body);
}

export function passwordResetEmailHtml(opts: { firstName: string; resetLink: string }) {
  const body = `
    <p style="color:#374151;margin-top:0;margin-bottom:4px">Hi <strong>${opts.firstName}</strong>,</p>
    <p style="color:#64748b;margin-top:0;margin-bottom:20px">We received a request to reset your Scholix password. Click the button below to choose a new password.</p>
    <div style="text-align:center;margin:24px 0">
      <a href="${opts.resetLink}" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;font-size:15px;display:inline-block">
        Reset my password
      </a>
    </div>
    <p style="color:#94a3b8;font-size:13px;margin-top:20px;margin-bottom:0">This link expires in <strong>30 minutes</strong>. If you didn't request a password reset, you can safely ignore this email — your password won't change.</p>
  `;
  return emailWrapper("#2563eb", "🔐 Reset your password", body);
}

export function otpEmailHtml(opts: { firstName: string; otp: string }) {
  const body = `
    <p style="color:#374151;margin-top:0;margin-bottom:4px">Hi <strong>${opts.firstName}</strong>,</p>
    <p style="color:#64748b;margin-top:0;margin-bottom:20px">Use the code below to complete your sign-in to Scholix. It expires in <strong>10 minutes</strong>.</p>
    <div style="text-align:center;margin:24px 0">
      <div style="display:inline-block;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:14px;padding:20px 40px">
        <p style="margin:0;font-size:36px;font-weight:700;letter-spacing:10px;color:#0f172a;font-family:monospace">${opts.otp}</p>
      </div>
    </div>
    <p style="color:#94a3b8;font-size:13px;margin-top:20px;margin-bottom:0">Never share this code with anyone. Scholix staff will never ask for it.</p>
  `;
  return emailWrapper("#1d4ed8", "🔑 Your sign-in code", body);
}

export function accountDeletionConfirmEmailHtml(opts: { firstName: string }) {
  const body = `
    <p style="color:#374151;margin-top:0;margin-bottom:4px">Hi <strong>${opts.firstName}</strong>,</p>
    <p style="color:#64748b;margin-top:0;margin-bottom:12px">We've received your request to delete your Scholix account. Here's what happens next:</p>
    <ul style="color:#64748b;font-size:14px;padding-left:20px;margin:0 0 16px">
      <li style="margin-bottom:8px">Our team will review your request within 2 business days</li>
      <li style="margin-bottom:8px">Financial records (invoices, payments) are kept for 7 years as required by Australian law</li>
      <li style="margin-bottom:8px">You'll receive a confirmation email once your account has been removed</li>
    </ul>
    <p style="color:#94a3b8;font-size:13px;margin-bottom:0">If you submitted this by mistake, please contact us at <a href="mailto:support@scholix.app" style="color:#2563eb">support@scholix.app</a> as soon as possible.</p>
  `;
  return emailWrapper("#dc2626", "⚠️ Deletion Request Received", body);
}
