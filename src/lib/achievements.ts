export type AchievementDef = {
  key: string;
  title: string;
  description: string;
  icon: string; // lucide icon name rendered client-side
};

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: "PERFECT_PREDICTOR", title: "Perfect Predictor", description: "Land your first exact score", icon: "Target" },
  { key: "EXACT_10", title: "10 Exact Scores", description: "Predict 10 exact scores", icon: "Crosshair" },
  { key: "EXACT_25", title: "25 Exact Scores", description: "Predict 25 exact scores", icon: "Award" },
  { key: "KING_OF_KNOCKOUTS", title: "King of Knockouts", description: "5 exact scores in the knockout stage", icon: "Crown" },
  { key: "TOP_SCORER_EXPERT", title: "Top Scorer Expert", description: "Correctly pick the tournament top scorer", icon: "Footprints" },
  { key: "CHAMPION_HUNTER", title: "Champion Hunter", description: "Correctly pick the World Cup winner", icon: "Trophy" },
  { key: "JOKER_MASTER", title: "Joker Master", description: "Earn 20+ points on a single joker match", icon: "Sparkles" },
  { key: "GOLDEN_MATCH_SPECIALIST", title: "Golden Match Specialist", description: "Nail the exact score of a Golden Match", icon: "Star" },
  { key: "STREAK_3", title: "On Fire", description: "3 exact scores in a row", icon: "Flame" },
  { key: "STREAK_5", title: "Unstoppable", description: "5 exact scores in a row", icon: "Zap" },
  { key: "PERFECT_ROUND", title: "Quiz Genius", description: "Score 10/10 on a matchday quiz", icon: "Brain" },
];

export const ACHIEVEMENT_MAP = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.key, a])
);
