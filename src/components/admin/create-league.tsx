"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Copy, Check } from "lucide-react";
import { createLeague } from "@/app/actions/admin";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function CreateLeague() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await createLeague(fd);
      if (res?.code) setCode(res.code);
      (e.target as HTMLFormElement).reset();
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <form onSubmit={onSubmit} className="flex gap-2">
        <Input name="name" placeholder="New league name (e.g. Office Legends)" required />
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create
        </Button>
      </form>
      {code && (
        <div className="flex items-center justify-between rounded-xl border border-gold/30 bg-gold/5 px-4 py-3">
          <div>
            <div className="text-xs text-muted-foreground">New league code — share it with your members</div>
            <div className="font-mono text-lg font-bold text-gold tracking-widest">{code}</div>
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}
