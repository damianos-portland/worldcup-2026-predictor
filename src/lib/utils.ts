import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// League code generator — XXXXX-XXXXX, uppercase A-Z only (no ambiguous chars)
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";
export function generateLeagueCode(): string {
  const block = () =>
    Array.from(
      { length: 5 },
      () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
    ).join("");
  return `${block()}-${block()}`;
}

export function formatKickoff(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function classNamesForMovement(current: number, previous: number) {
  if (previous === 0 || current === previous)
    return { icon: "▬", color: "text-muted-foreground" };
  if (current < previous) return { icon: "▲", color: "text-emerald-400" };
  return { icon: "▼", color: "text-red-400" };
}

export const ROUND_LABELS: Record<string, string> = {
  GROUP: "Group Stage",
  ROUND_OF_32: "Round of 32",
  ROUND_OF_16: "Round of 16",
  QUARTER_FINAL: "Quarter Finals",
  SEMI_FINAL: "Semi Finals",
  THIRD_PLACE: "Third Place",
  FINAL: "Final",
};
