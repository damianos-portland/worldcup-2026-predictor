import { ROUND_LABELS } from "@/lib/utils";

/**
 * A "matchday" groups the fixtures a Power Pick / Manager-of-the-Matchday
 * award applies to: each group-stage matchday number, and each knockout round.
 */
export function matchdayKey(m: {
  phase: string;
  matchday: number;
  round: string;
}): string {
  return m.phase === "GROUP" ? `GROUP-${m.matchday}` : `KO-${m.round}`;
}

export function matchdayLabel(key: string): string {
  if (key.startsWith("GROUP-")) {
    return `Group Stage · Matchday ${key.split("-")[1]}`;
  }
  const round = key.slice(3);
  return ROUND_LABELS[round] ?? round;
}
