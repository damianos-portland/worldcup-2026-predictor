import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-gold/40 bg-gold/10 text-gold",
        secondary: "border-white/10 bg-white/5 text-muted-foreground",
        success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
        danger: "border-red-500/30 bg-red-500/10 text-red-300",
        live: "border-red-500/40 bg-red-500/15 text-red-300 animate-pulse",
        gold: "border-gold/50 bg-gold/15 text-gold",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
