"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardList, Globe2, Users, Brain, UserCog, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/matches", label: "Match Center", icon: ClipboardList },
  { href: "/admin/quiz", label: "Quizzes", icon: Brain },
  { href: "/admin/tournament", label: "Tournament", icon: Globe2 },
  { href: "/admin/leagues", label: "Leagues", icon: Users },
  { href: "/admin/users", label: "Users", icon: UserCog },
  { href: "/admin/reminders", label: "Reminders", icon: Mail },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <div className="sticky top-16 z-30 -mx-6 mb-6 border-b border-white/5 bg-pitch-900/60 px-6 backdrop-blur-xl">
      <nav className="flex gap-1 overflow-x-auto py-2">
        {TABS.map((t) => {
          const active = t.href === "/admin" ? pathname === "/admin" : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
                active ? "bg-gold/15 text-gold" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              )}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
