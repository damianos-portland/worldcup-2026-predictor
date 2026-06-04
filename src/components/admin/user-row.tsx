"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Trash2, Shield, ShieldOff, Loader2, Check } from "lucide-react";
import { resetUserPassword, setUserRole, deleteUser } from "@/app/actions/users";
import { Badge } from "@/components/ui/badge";

type U = { id: string; name: string; email: string; role: "ADMIN" | "MEMBER"; leagues: number; isSelf: boolean };

export function UserRow({ user }: { user: U }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [resetting, setResetting] = useState(false);
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");

  function run(fn: () => Promise<any>, ok = "Done") {
    start(async () => {
      const res = await fn();
      setMsg(res?.error ?? ok);
      setTimeout(() => setMsg(""), 2500);
      router.refresh();
    });
  }

  function doReset() {
    if (pw.length < 6) { setMsg("Min 6 chars"); return; }
    const fd = new FormData(); fd.set("userId", user.id); fd.set("password", pw);
    run(() => resetUserPassword(fd), "Password reset");
    setResetting(false); setPw("");
  }

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            {user.name}
            {user.role === "ADMIN" && <Badge variant="gold">Admin</Badge>}
          </div>
          <div className="text-xs text-muted-foreground">{user.email} · {user.leagues} leagues</div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {!resetting ? (
            <button onClick={() => setResetting(true)} disabled={pending}
              className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold hover:bg-white/20">
              <KeyRound className="h-3 w-3" /> Reset password
            </button>
          ) : (
            <span className="flex items-center gap-1">
              <input value={pw} onChange={(e) => setPw(e.target.value)} type="text" placeholder="new password"
                className="h-8 w-32 rounded-lg border border-input bg-black/30 px-2 text-xs focus-visible:outline-none" />
              <button onClick={doReset} disabled={pending} className="rounded-lg btn-gold px-2 py-1 text-xs font-semibold">Save</button>
              <button onClick={() => { setResetting(false); setPw(""); }} className="rounded-lg bg-white/10 px-2 py-1 text-xs">✕</button>
            </span>
          )}
          {user.role === "MEMBER" ? (
            <button onClick={() => { const fd = new FormData(); fd.set("userId", user.id); fd.set("role", "ADMIN"); run(() => setUserRole(fd), "Promoted"); }}
              disabled={pending} className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold hover:bg-white/20">
              <Shield className="h-3 w-3" /> Make admin
            </button>
          ) : (
            !user.isSelf && (
              <button onClick={() => { const fd = new FormData(); fd.set("userId", user.id); fd.set("role", "MEMBER"); run(() => setUserRole(fd), "Demoted"); }}
                disabled={pending} className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold hover:bg-white/20">
                <ShieldOff className="h-3 w-3" /> Remove admin
              </button>
            )
          )}
          {!user.isSelf && (
            <button onClick={() => { if (confirm(`Delete ${user.name} and all their data?`)) { const fd = new FormData(); fd.set("userId", user.id); run(() => deleteUser(fd), "Deleted"); } }}
              disabled={pending} className="flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/20">
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          )}
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-gold" />}
          {msg && <span className="flex items-center gap-1 text-xs text-gold"><Check className="h-3 w-3" />{msg}</span>}
        </div>
      </div>
    </div>
  );
}
