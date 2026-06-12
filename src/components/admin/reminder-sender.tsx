"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Send, CheckCircle2, AlertTriangle, ListChecks, Brain } from "lucide-react";
import { previewReminders, sendReminders } from "@/app/actions/reminders";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type League = { id: string; name: string };
type Preview = { pendingPredictions: number; pendingQuiz: number; total: number };

const WINDOWS = [
  { value: 24, label: "Next 24 hours" },
  { value: 48, label: "Next 48 hours" },
  { value: 168, label: "Next 7 days" },
  { value: 8760, label: "All upcoming" },
];

export function ReminderSender({ leagues, emailReady }: { leagues: League[]; emailReady: boolean }) {
  const [leagueId, setLeagueId] = useState(leagues[0]?.id ?? "");
  const [withinHours, setWithinHours] = useState(24);
  const [predictions, setPredictions] = useState(true);
  const [quiz, setQuiz] = useState(true);

  const [preview, setPreview] = useState<Preview | null>(null);
  const [loadingPreview, startPreview] = useTransition();
  const [sending, startSend] = useTransition();
  const [result, setResult] = useState<{ ok?: string; err?: string } | null>(null);

  // Refresh the pending counts whenever the league or window changes.
  useEffect(() => {
    if (!leagueId) return;
    setResult(null);
    startPreview(async () => setPreview(await previewReminders(leagueId, withinHours)));
  }, [leagueId, withinHours]);

  // How many distinct people will be emailed given the selected categories.
  // `total` is the union (missing predictions OR quiz), so it's the right count
  // when both are selected.
  const recipients =
    preview == null
      ? null
      : predictions && quiz
      ? preview.total
      : predictions
      ? preview.pendingPredictions
      : quiz
      ? preview.pendingQuiz
      : 0;

  function send() {
    setResult(null);
    const fd = new FormData();
    fd.set("leagueId", leagueId);
    fd.set("withinHours", String(withinHours));
    fd.set("predictions", predictions ? "1" : "0");
    fd.set("quiz", quiz ? "1" : "0");
    startSend(async () => {
      const res = await sendReminders(fd);
      if (res?.error) setResult({ err: res.error });
      else setResult({ ok: `Sent ${res?.sent ?? 0} reminder email${res?.sent === 1 ? "" : "s"}.` });
    });
  }

  const nothingSelected = !predictions && !quiz;
  const disabled = sending || !leagueId || nothingSelected || !emailReady || recipients === 0;

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        {!emailReady && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Email isn't configured yet. Set <code className="text-amber-100">SMTP_USER</code>,{" "}
              <code className="text-amber-100">SMTP_PASS</code> and <code className="text-amber-100">EMAIL_FROM</code> in
              the environment and redeploy to enable sending.
            </span>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">League</span>
            <select
              value={leagueId}
              onChange={(e) => setLeagueId(e.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-black/30 px-3 text-sm focus-visible:outline-none"
            >
              {leagues.length === 0 && <option value="">No leagues</option>}
              {leagues.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Prediction window</span>
            <select
              value={withinHours}
              onChange={(e) => setWithinHours(parseInt(e.target.value, 10))}
              className="h-11 w-full rounded-xl border border-input bg-black/30 px-3 text-sm focus-visible:outline-none"
            >
              {WINDOWS.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <Toggle
            on={predictions}
            onClick={() => setPredictions((v) => !v)}
            icon={<ListChecks className="h-4 w-4" />}
            label="Pending predictions"
            count={preview?.pendingPredictions}
            loading={loadingPreview}
          />
          <Toggle
            on={quiz}
            onClick={() => setQuiz((v) => !v)}
            icon={<Brain className="h-4 w-4" />}
            label="Pending quiz answers"
            count={preview?.pendingQuiz}
            loading={loadingPreview}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4">
          <p className="text-sm text-muted-foreground">
            {nothingSelected ? (
              "Select at least one reminder type."
            ) : loadingPreview || recipients == null ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Counting…
              </span>
            ) : (
              <>
                This will email <span className="font-semibold text-foreground">{recipients}</span>{" "}
                {recipients === 1 ? "person" : "people"}.
              </>
            )}
          </p>
          <button
            onClick={send}
            disabled={disabled}
            className="inline-flex items-center gap-2 rounded-xl btn-gold px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send reminders
          </button>
        </div>

        {result?.ok && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-200">
            <CheckCircle2 className="h-4 w-4" /> {result.ok}
          </div>
        )}
        {result?.err && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">
            <AlertTriangle className="h-4 w-4" /> {result.err}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Toggle({
  on,
  onClick,
  icon,
  label,
  count,
  loading,
}: {
  on: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
  loading: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-between rounded-xl border px-3.5 py-3 text-left text-sm transition-colors",
        on ? "border-gold/50 bg-gold/10 text-foreground" : "border-white/10 text-muted-foreground hover:border-white/20"
      )}
    >
      <span className="flex items-center gap-2 font-medium">
        <span className={cn(on ? "text-gold" : "")}>{icon}</span>
        {label}
      </span>
      <span className={cn("text-xs", on ? "text-gold" : "text-muted-foreground")}>
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : count != null ? `${count} pending` : ""}
      </span>
    </button>
  );
}
