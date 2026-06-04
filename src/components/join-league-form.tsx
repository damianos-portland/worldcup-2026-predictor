"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Ticket } from "lucide-react";
import { joinLeague } from "@/app/actions/leagues";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function JoinLeagueForm({ initialCode = "" }: { initialCode?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await joinLeague(null, new FormData(e.currentTarget));
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    if (result?.success && result.leagueId) {
      router.push(`/leagues/${result.leagueId}`);
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="code">League code</Label>
        <Input
          id="code"
          name="code"
          defaultValue={initialCode}
          placeholder="ABCDE-FGHIJ"
          className="font-mono uppercase tracking-widest"
          maxLength={11}
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="displayName">Display name</Label>
          <Input id="displayName" name="displayName" placeholder="Alex Striker" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="teamName">Team name</Label>
          <Input id="teamName" name="teamName" placeholder="Golden Boots FC" required />
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
        Join League
      </Button>
    </form>
  );
}
