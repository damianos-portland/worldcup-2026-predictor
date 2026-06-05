"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListChecks,
  Trophy,
  User,
  GitCompareArrows,
  Medal,
  Network,
  Radio,
  Brain,
  Swords,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "", label: "Overview", icon: LayoutDashboard },
  { href: "/live", label: "Live", icon: Radio },
  { href: "/predictions", label: "Predictions", icon: ListChecks },
  { href: "/powerpick", label: "Power Pick", icon: Star },
  { href: "/quiz", label: "Quiz", icon: Brain },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/h2h", label: "H2H", icon: Swords },
  { href: "/bracket", label: "Bracket", icon: Network },
  { href: "/profile", label: "My Profile", icon: User },
  { href: "/achievements", label: "Achievements", icon: Medal },
  { href: "/compare", label: "Compare", icon: GitCompareArrows },
];

export function LeagueNav({ leagueId }: { leagueId: string }) {
  const pathname = usePathname();
  const base = `/leagues/${leagueId}`;

  return (
    <div className="sticky top-16 z-30 -mx-6 mb-6 border-b border-white/5 bg-pitch-900/60 px-6 backdrop-blur-xl">
      <nav className="flex gap-1 overflow-x-auto py-2 scrollbar-none">
        {TABS.map((t) => {
          const href = base + t.href;
          const active = t.href === "" ? pathname === base : pathname.startsWith(href);
          return (
            <Link
              key={t.href}
              href={href}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-gold/15 text-gold"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
