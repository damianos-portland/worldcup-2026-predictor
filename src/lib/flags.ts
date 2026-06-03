// Home-nation flags use Unicode tag sequences (not 2-letter ISO codes).
const SPECIAL_FLAGS: Record<string, string> = {
  ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  SCO: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  WAL: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
};

// Map an ISO 3166-1 alpha-2 country code to its flag emoji.
export function flagEmoji(code: string): string {
  if (code && SPECIAL_FLAGS[code.toUpperCase()]) return SPECIAL_FLAGS[code.toUpperCase()];
  if (!code || code.length !== 2) return "🏳️";
  const A = 0x1f1e6;
  const upper = code.toUpperCase();
  return String.fromCodePoint(
    A + (upper.charCodeAt(0) - 65),
    A + (upper.charCodeAt(1) - 65)
  );
}
