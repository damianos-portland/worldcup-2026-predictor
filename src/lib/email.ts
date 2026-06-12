import { Resend } from "resend";

// Email is optional infra: if RESEND_API_KEY isn't set, sends are a no-op and the
// admin UI shows a "not configured" banner. Set EMAIL_FROM to a verified-domain
// sender (e.g. "World Cup Predictor <noreply@yourdomain.com>"); the resend.dev
// onboarding address works for testing only.
const API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM || "World Cup Predictor <onboarding@resend.dev>";

export function emailConfigured(): boolean {
  return !!API_KEY;
}

export type Mail = { to: string; subject: string; html: string };

/** Send a batch of (already personalised) emails. Chunks at Resend's 100/call limit. */
export async function sendEmails(mails: Mail[]): Promise<{ sent: number; error?: string }> {
  if (!API_KEY) return { sent: 0, error: "Email is not configured (RESEND_API_KEY missing)." };
  if (mails.length === 0) return { sent: 0 };

  const resend = new Resend(API_KEY);
  let sent = 0;
  for (let i = 0; i < mails.length; i += 100) {
    const chunk = mails.slice(i, i + 100).map((m) => ({
      from: FROM,
      to: m.to,
      subject: m.subject,
      html: m.html,
    }));
    const res = await resend.batch.send(chunk);
    if (res.error) return { sent, error: res.error.message ?? "Resend error" };
    sent += chunk.length;
  }
  return { sent };
}
