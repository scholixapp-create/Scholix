import { logger } from "./logger";

let resendClient: any = null;

async function getResend() {
  if (resendClient) return resendClient;
  const apiKey = process.env["RESEND_API_KEY"];
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
    logger.info({ to: payload.to, subject: payload.subject }, "Email skipped (RESEND_API_KEY not set)");
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

export function sessionBookedEmailHtml(opts: {
  recipientName: string;
  studentName: string;
  subject: string;
  date: string;
  duration: number;
  amount: number;
}) {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f8fafc">
      <div style="background:#2563eb;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700">📚 New Session Booked</h1>
      </div>
      <div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #e2e8f0">
        <p style="color:#374151;margin-top:0">Hi <strong>${opts.recipientName}</strong>,</p>
        <p style="color:#374151">A new tutoring session has been booked:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Student</td><td style="padding:8px 0;font-weight:600;color:#111827;text-align:right">${opts.studentName}</td></tr>
          <tr style="border-top:1px solid #f3f4f6"><td style="padding:8px 0;color:#6b7280;font-size:14px">Subject</td><td style="padding:8px 0;font-weight:600;color:#111827;text-align:right">${opts.subject}</td></tr>
          <tr style="border-top:1px solid #f3f4f6"><td style="padding:8px 0;color:#6b7280;font-size:14px">Date</td><td style="padding:8px 0;font-weight:600;color:#111827;text-align:right">${opts.date}</td></tr>
          <tr style="border-top:1px solid #f3f4f6"><td style="padding:8px 0;color:#6b7280;font-size:14px">Duration</td><td style="padding:8px 0;font-weight:600;color:#111827;text-align:right">${opts.duration} min</td></tr>
          <tr style="border-top:1px solid #f3f4f6"><td style="padding:8px 0;color:#6b7280;font-size:14px">Amount</td><td style="padding:8px 0;font-weight:700;color:#2563eb;text-align:right">$${opts.amount.toFixed(2)}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:13px;margin-bottom:0">Log in to Scholix to view your session details.</p>
      </div>
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:16px">© Scholix Tutoring Platform</p>
    </div>
  `;
}

export function paymentConfirmedEmailHtml(opts: {
  recipientName: string;
  tutorName: string;
  subject: string;
  date: string;
  amount: number;
}) {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f8fafc">
      <div style="background:#059669;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700">✅ Payment Confirmed</h1>
      </div>
      <div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #e2e8f0">
        <p style="color:#374151;margin-top:0">Hi <strong>${opts.recipientName}</strong>,</p>
        <p style="color:#374151">Your payment has been confirmed and your session is locked in!</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Tutor</td><td style="padding:8px 0;font-weight:600;color:#111827;text-align:right">${opts.tutorName}</td></tr>
          <tr style="border-top:1px solid #f3f4f6"><td style="padding:8px 0;color:#6b7280;font-size:14px">Subject</td><td style="padding:8px 0;font-weight:600;color:#111827;text-align:right">${opts.subject}</td></tr>
          <tr style="border-top:1px solid #f3f4f6"><td style="padding:8px 0;color:#6b7280;font-size:14px">Session date</td><td style="padding:8px 0;font-weight:600;color:#111827;text-align:right">${opts.date}</td></tr>
          <tr style="border-top:1px solid #f3f4f6"><td style="padding:8px 0;color:#6b7280;font-size:14px">Amount paid</td><td style="padding:8px 0;font-weight:700;color:#059669;text-align:right">$${opts.amount.toFixed(2)}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:13px;margin-bottom:0">See you at the session! Log in to Scholix to view details.</p>
      </div>
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:16px">© Scholix Tutoring Platform</p>
    </div>
  `;
}
