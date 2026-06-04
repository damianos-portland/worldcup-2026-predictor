// A "matchday" is a CALENDAR DAY of fixtures in the host (US) timezone — e.g.
// all matches on 11 June (US Eastern) are one matchday. Using the local US date
// matters because a 9pm ET kickoff is ~01:00 UTC the next day; we still want it
// counted on its US date. Timezone is configurable via MATCHDAY_TZ.

const TZ = process.env.MATCHDAY_TZ || "America/New_York";

// en-CA formats as YYYY-MM-DD; with timeZone it gives the local calendar date.
const keyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function matchdayKey(m: { kickoff: Date }): string {
  return keyFormatter.format(m.kickoff); // e.g. "2026-06-11"
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function matchdayLabel(key: string): string {
  const [y, mo, d] = key.split("-").map(Number);
  if (!y || !mo || !d) return key;
  // Weekday of that calendar date (date-only, timezone-independent).
  const date = new Date(Date.UTC(y, mo - 1, d));
  return `${DAYS[date.getUTCDay()]} ${d} ${MONTHS[mo - 1]} ${y}`;
}
