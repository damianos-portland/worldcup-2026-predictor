// Standard quiz question templates. Given a match (with team names + notable
// players) each template auto-generates the question text and answer options,
// so the admin just picks a match + a type instead of typing everything.

export type QuizMatch = {
  id: string;
  label: string; // "Brazil vs Morocco"
  home: string;
  away: string;
  homePlayers: string[];
  awayPlayers: string[];
};

export type QuestionTemplate = { key: string; label: string };

export const QUESTION_TEMPLATES: QuestionTemplate[] = [
  { key: "RESULT", label: "Match result (1X2)" },
  { key: "FIRST_TEAM", label: "First team to score" },
  { key: "TOTAL_GOALS", label: "How many total goals" },
  { key: "OU25", label: "Total goals — Over/Under 2.5" },
  { key: "BTTS", label: "Both teams to score" },
  { key: "HT_RESULT", label: "Half-time result" },
  { key: "CARDS", label: "How many cards (both teams)" },
  { key: "FIRST_SCORER", label: "First goalscorer" },
  { key: "PENALTY", label: "Will there be a penalty" },
  { key: "CLEAN_SHEET", label: "Will either team keep a clean sheet" },
  { key: "CUSTOM", label: "Custom question…" },
];

export function generateQuestion(
  key: string,
  m: QuizMatch
): { text: string; options: string[] } | null {
  const vs = `${m.home} vs ${m.away}`;
  switch (key) {
    case "RESULT":
      return { text: `Who wins ${vs}?`, options: [m.home, "Draw", m.away] };
    case "FIRST_TEAM":
      return { text: `First team to score in ${vs}?`, options: [m.home, m.away, "No goals"] };
    case "TOTAL_GOALS":
      return { text: `How many total goals in ${vs}?`, options: ["0", "1", "2", "3", "4 or more"] };
    case "OU25":
      return { text: `Total goals in ${vs}?`, options: ["Under 2.5 (0–2)", "Over 2.5 (3+)"] };
    case "BTTS":
      return { text: `Both teams to score in ${vs}?`, options: ["Yes", "No"] };
    case "HT_RESULT":
      return { text: `Half-time result of ${vs}?`, options: [`${m.home} ahead`, "Draw", `${m.away} ahead`] };
    case "CARDS":
      return { text: `How many cards (both teams) in ${vs}?`, options: ["0–2", "3–4", "5–6", "7+"] };
    case "FIRST_SCORER":
      return {
        text: `First goalscorer in ${vs}?`,
        options: [...m.homePlayers, ...m.awayPlayers, "Other / No goal"],
      };
    case "PENALTY":
      return { text: `Will there be a penalty awarded in ${vs}?`, options: ["Yes", "No"] };
    case "CLEAN_SHEET":
      return { text: `Will either team keep a clean sheet in ${vs}?`, options: ["Yes", "No"] };
    default:
      return null;
  }
}
