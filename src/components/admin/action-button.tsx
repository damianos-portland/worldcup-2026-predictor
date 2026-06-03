"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Generic button that submits a hidden-field server action with a confirm + refresh. */
export function ActionButton({
  action,
  fields,
  children,
  variant = "secondary",
  className,
}: {
  action: (fd: FormData) => Promise<any>;
  fields: Record<string, string>;
  children: React.ReactNode;
  variant?: "gold" | "secondary" | "danger";
  className?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onClick() {
    const fd = new FormData();
    Object.entries(fields).forEach(([k, v]) => fd.set(k, v));
    start(async () => {
      await action(fd);
      router.refresh();
    });
  }

  const styles = {
    gold: "btn-gold",
    secondary: "bg-white/10 hover:bg-white/20 text-foreground",
    danger: "bg-red-500/15 text-red-300 hover:bg-red-500/25 border border-red-500/30",
  };

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className={cn("flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50", styles[variant], className)}
    >
      {pending && <Loader2 className="h-3 w-3 animate-spin" />}
      {children}
    </button>
  );
}
