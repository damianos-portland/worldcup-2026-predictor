import { Mail } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { emailConfigured } from "@/lib/email";
import { ReminderSender } from "@/components/admin/reminder-sender";

export const dynamic = "force-dynamic";

export default async function RemindersPage() {
  await requireAdmin();
  const leagues = await prisma.league.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <Mail className="h-5 w-5 text-gold" /> Email Reminders
        </h2>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Nudge the members of a league who still owe predictions for upcoming matches or haven&apos;t finished an open
          quiz. Only people with something pending are emailed — one email each, even if they&apos;re missing both.
        </p>
      </div>

      <ReminderSender leagues={leagues} emailReady={emailConfigured()} />
    </div>
  );
}
