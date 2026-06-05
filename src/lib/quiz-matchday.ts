// Quiz matchdays: CHRONOLOGICAL bunches of 4–8 matches, aligned to Greek evenings.
//
// Greece is UTC+3 (EEST) in June/July. World Cup kickoffs run from ~19:00 Greek
// through the early hours. We put the matchday boundary at NOON Greek (09:00 UTC)
// so each matchday starts with an evening game and absorbs that night's late/
// overnight matches — never starting "after midnight". Low-match days are then
// bunched with the next so every quiz covers 4–8 matches. Group-stage and
// knockout matches are bucketed separately so a quiz never mixes the two.

const GREEK_OFFSET_H = 3; // EEST
const CUTOFF_H = 12; // matchday starts at noon Greek time
const SHIFT_MS = (CUTOFF_H - GREEK_OFFSET_H) * 3600 * 1000; // 9h

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function greekDayKey(kickoff: Date): string {
  return new Date(kickoff.getTime() - SHIFT_MS).toISOString().slice(0, 10);
}

function fmtDay(key: string): string {
  const [y, mo, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return `${DOW[dt.getUTCDay()]} ${d} ${MON[mo - 1]}`;
}

export type QuizMatchday = { key: string; label: string; matchIds: string[]; count: number };

type Min = { id: string; kickoff: Date; phase: string };

function bucketPhase(matches: Min[]): QuizMatchday[] {
  const sorted = [...matches].sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime());

  // Group by Greek matchday.
  const byDay = new Map<string, Min[]>();
  for (const m of sorted) {
    const day = greekDayKey(m.kickoff);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(m);
  }
  const days = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));

  // Greedily merge consecutive days into buckets of 4–8 matches.
  const buckets: { days: string[]; matches: Min[] }[] = [];
  let cur: { days: string[]; matches: Min[] } | null = null;
  for (const [day, ms] of days) {
    if (cur && cur.matches.length >= 4 && cur.matches.length + ms.length > 8) {
      buckets.push(cur);
      cur = null;
    }
    if (!cur) cur = { days: [], matches: [] };
    cur.days.push(day);
    cur.matches.push(...ms);
    if (cur.matches.length >= 4) {
      buckets.push(cur);
      cur = null;
    }
  }
  if (cur) {
    // Leftover (<4) — fold into the previous bucket if there is one.
    if (buckets.length) {
      buckets[buckets.length - 1].days.push(...cur.days);
      buckets[buckets.length - 1].matches.push(...cur.matches);
    } else {
      buckets.push(cur);
    }
  }

  return buckets.map((b) => ({
    key: `QMD-${b.days[0]}`, // stable, content-based (first Greek day)
    label: b.days.length === 1 ? fmtDay(b.days[0]) : `${fmtDay(b.days[0])} – ${fmtDay(b.days[b.days.length - 1])}`,
    matchIds: b.matches.map((m) => m.id),
    count: b.matches.length,
  }));
}

/** All quiz matchdays in chronological order (group stage, then knockouts). */
export function computeQuizMatchdays(matches: Min[]): QuizMatchday[] {
  const group = bucketPhase(matches.filter((m) => m.phase === "GROUP"));
  const knockout = bucketPhase(matches.filter((m) => m.phase === "KNOCKOUT"));
  return [...group, ...knockout];
}
