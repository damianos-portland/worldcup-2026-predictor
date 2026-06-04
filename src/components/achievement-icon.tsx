"use client";

import {
  Target, Crosshair, Award, Crown, Footprints, Trophy, Sparkles, Star, Flame, Zap, Brain,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Target, Crosshair, Award, Crown, Footprints, Trophy, Sparkles, Star, Flame, Zap, Brain,
};

export function AchievementIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Award;
  return <Icon className={className} />;
}
