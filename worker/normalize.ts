// Normalise team names so our DB names line up with ESPN's.
const ALIASES: Record<string, string> = {
  usa: "united states",
  "korea republic": "south korea",
  "korea dpr": "north korea",
  "ir iran": "iran",
  "cabo verde": "cape verde",
  "czech republic": "czechia",
  turkiye: "turkey",
  "congo dr": "dr congo",
  "cote divoire": "ivory coast",
  "china pr": "china",
  "bosnia herzegovina": "bosnia and herzegovina", // ESPN: "Bosnia-Herzegovina"
};

export function canon(name: string): string {
  let s = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return ALIASES[s] ?? s;
}

/** Order-insensitive key for a fixture, so home/away orientation doesn't matter. */
export function pairKey(home: string, away: string): string {
  return [canon(home), canon(away)].sort().join(" | ");
}
