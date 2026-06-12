"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { getLeaguePending, type PendingMember } from "@/lib/pending";
import { emailConfigured, sendEmails, type Mail } from "@/lib/email";

/** Live counts for the admin UI — recomputed whenever the league/window changes. */
export async function previewReminders(leagueId: string, withinHours: number) {
  await requireAdmin();
  if (!leagueId) return { pendingPredictions: 0, pendingQuiz: 0, total: 0 };
  const pending = await getLeaguePending(leagueId, withinHours);
  return {
    pendingPredictions: pending.filter((p) => p.missingPredictions > 0).length,
    pendingQuiz: pending.filter((p) => p.missingQuizzes > 0).length,
    total: pending.length,
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function renderEmail(
  m: PendingMember,
  opts: { wantsPred: boolean; wantsQuiz: boolean; leagueName: string; base: string; leagueId: string }
): { subject: string; html: string } {
  const { wantsPred, wantsQuiz, leagueName, base, leagueId } = opts;
  const items: string[] = [];
  if (wantsPred)
    items.push(
      `<strong>${m.missingPredictions}</strong> match prediction${m.missingPredictions === 1 ? "" : "s"} still to make`
    );
  if (wantsQuiz)
    items.push(`<strong>${m.missingQuizzes}</strong> open quiz${m.missingQuizzes === 1 ? "" : "zes"} to complete`);

  const subject =
    wantsPred && wantsQuiz
      ? "⚽ You've got predictions and a quiz waiting"
      : wantsPred
      ? "⚽ You've got match predictions waiting"
      : "🧠 You've got a quiz waiting";

  const predLink = `${base}/leagues/${leagueId}/predictions`;
  const quizLink = `${base}/leagues/${leagueId}/quiz`;
  const ctaLink = wantsPred ? predLink : quizLink;
  const ctaLabel = wantsPred && wantsQuiz ? "Open the app" : wantsPred ? "Make your predictions" : "Take the quiz";

  const html = `
  <div style="margin:0;padding:24px;background:#0b1411;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#11201a;border:1px solid rgba(212,175,55,0.25);border-radius:16px;overflow:hidden;">
      <div style="padding:22px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
        <span style="font-size:18px;font-weight:700;color:#f4f4f0;">⚽ World Cup 2026 Predictor</span>
      </div>
      <div style="padding:24px;color:#d7ddd9;font-size:15px;line-height:1.6;">
        <p style="margin:0 0 14px;">Hi ${escapeHtml(m.name)},</p>
        <p style="margin:0 0 14px;">Quick nudge for <strong style="color:#e9c45a;">${escapeHtml(leagueName)}</strong> — you've got:</p>
        <ul style="margin:0 0 20px;padding-left:20px;">
          ${items.map((i) => `<li style="margin:0 0 6px;">${i}</li>`).join("")}
        </ul>
        <p style="margin:0 0 22px;">Don't miss out on the points — picks lock at kickoff.</p>
        <a href="${ctaLink}" style="display:inline-block;background:#e9c45a;color:#0b1411;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:10px;font-size:14px;">${ctaLabel} →</a>
        ${
          wantsPred && wantsQuiz
            ? `<p style="margin:18px 0 0;font-size:13px;color:#8a948f;">Or go straight to the <a href="${quizLink}" style="color:#e9c45a;">quiz</a>.</p>`
            : ""
        }
      </div>
      <div style="padding:16px 24px;border-top:1px solid rgba(255,255,255,0.06);color:#6b756f;font-size:12px;">
        You're getting this because you're a member of ${escapeHtml(leagueName)}.
      </div>
    </div>
  </div>`;

  return { subject, html };
}

/** Email everyone in the league who has pending items in the selected categories. */
export async function sendReminders(formData: FormData) {
  await requireAdmin();
  const leagueId = formData.get("leagueId") as string;
  const includePredictions = formData.get("predictions") === "1";
  const includeQuiz = formData.get("quiz") === "1";
  const withinHours = parseInt(formData.get("withinHours") as string, 10) || 24;

  if (!leagueId) return { error: "Pick a league first." };
  if (!includePredictions && !includeQuiz) return { error: "Choose at least one reminder type." };
  if (!emailConfigured())
    return { error: "Email isn't configured yet. Set SMTP_USER, SMTP_PASS and EMAIL_FROM in the environment and redeploy." };

  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } });
  if (!league) return { error: "League not found." };

  const base = (process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
  const pending = await getLeaguePending(leagueId, withinHours);

  const mails: Mail[] = [];
  for (const m of pending) {
    const wantsPred = includePredictions && m.missingPredictions > 0;
    const wantsQuiz = includeQuiz && m.missingQuizzes > 0;
    if (!wantsPred && !wantsQuiz) continue;
    if (!m.email) continue;
    const { subject, html } = renderEmail(m, { wantsPred, wantsQuiz, leagueName: league.name, base, leagueId });
    mails.push({ to: m.email, subject, html });
  }

  if (mails.length === 0) return { error: "Nobody has pending items for the selected options." };

  const res = await sendEmails(mails);
  if (res.error) return { error: res.error };
  return { success: true, sent: res.sent };
}
