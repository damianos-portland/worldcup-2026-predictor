"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";

/** Copies a shareable invite link (prefills the join form with the code). */
export function CopyInvite({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    const url = `${window.location.origin}/leagues?code=${encodeURIComponent(code)}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold hover:bg-white/20"
      title="Copy a shareable invite link"
    >
      {copied ? <Check className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
      {copied ? "Copied" : "Invite link"}
    </button>
  );
}
