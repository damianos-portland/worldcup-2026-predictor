import Link from "next/link";
import { Trophy } from "lucide-react";
import { getSession } from "@/lib/session";
import { Button } from "@/components/ui/button";

export async function SiteHeader() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-pitch-900/70 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl btn-gold">
            <Trophy className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-sm font-bold tracking-tight">
              WORLD CUP <span className="gold-text">2026</span>
            </div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Predictor League
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          {session?.user ? (
            <>
              <Link href="/leagues">
                <Button variant="ghost" size="sm">My Leagues</Button>
              </Link>
              {session.user.role === "ADMIN" && (
                <Link href="/admin">
                  <Button variant="outline" size="sm">Admin</Button>
                </Link>
              )}
              <Link href="/api/auth/signout">
                <Button variant="secondary" size="sm">Sign out</Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">Log in</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Get Started</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
