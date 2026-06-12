import nodemailer from "nodemailer";

// Free email path: send through an existing mailbox over SMTP (e.g. a dedicated
// Gmail account using an App Password) — no domain, no paid service. Defaults are
// Gmail's SMTP. If SMTP_USER/SMTP_PASS aren't set, sends are a no-op and the admin
// UI shows a "not configured" banner.
//
//   SMTP_USER  = the full sending address (e.g. wcpredictor2026@gmail.com)
//   SMTP_PASS  = a 16-char Google App Password (NOT the normal password)
//   EMAIL_FROM = "World Cup Predictor <wcpredictor2026@gmail.com>"  (same address)
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "465", 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM = process.env.EMAIL_FROM || (SMTP_USER ? `World Cup Predictor <${SMTP_USER}>` : "");

export function emailConfigured(): boolean {
  return !!(SMTP_USER && SMTP_PASS);
}

export type Mail = { to: string; subject: string; html: string };

/** Send a batch of (already personalised) emails over SMTP, one at a time. */
export async function sendEmails(mails: Mail[]): Promise<{ sent: number; error?: string }> {
  if (!emailConfigured()) return { sent: 0, error: "Email is not configured (SMTP_USER / SMTP_PASS missing)." };
  if (mails.length === 0) return { sent: 0 };

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // 465 = implicit TLS; 587 = STARTTLS
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  let sent = 0;
  for (const m of mails) {
    try {
      await transporter.sendMail({ from: FROM, to: m.to, subject: m.subject, html: m.html });
      sent++;
    } catch (e) {
      return { sent, error: `Send failed after ${sent}: ${(e as Error).message}` };
    }
  }
  return { sent };
}
