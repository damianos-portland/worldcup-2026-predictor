// A "matchday" is a CALENDAR DAY of fixtures — e.g. all matches on 11 June are
// one matchday, 12 June is the next. Power Pick, Manager of the Matchday, the
// Matchday Quiz and H2H all group fixtures by this date key (UTC).

export function matchdayKey(m: { kickoff: Date }): string {
  return m.kickoff.toISOString().slice(0, 10); // YYYY-MM-DD
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function matchdayLabel(key: string): string {
  const [y, mo, d] = key.split("-").map(Number);
  if (!y || !mo || !d) return key;
  const date = new Date(Date.UTC(y, mo - 1, d));
  return `${DAYS[date.getUTCDay()]} ${d} ${MONTHS[mo - 1]} ${y}`;
}

/** UTC [start, end) range for the calendar day a kickoff falls on. */
export function dayRange(kickoff: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(kickoff.getUTCFullYear(), kickoff.getUTCMonth(), kickoff.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}
