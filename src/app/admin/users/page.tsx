import { UserCog, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { UserRow } from "@/components/admin/user-row";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({ searchParams }: { searchParams: { q?: string } }) {
  const session = await getSession();
  const q = (searchParams.q ?? "").trim();

  const users = await prisma.user.findMany({
    where: q
      ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] }
      : undefined,
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: { _count: { select: { memberships: true } } },
  });

  return (
    <div className="space-y-6">
      <Card className="glass-strong">
        <CardContent className="p-5">
          <h3 className="mb-1 flex items-center gap-2 font-display font-bold">
            <UserCog className="h-5 w-5 text-gold" /> User Management
          </h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Reset passwords (no email required), promote/demote admins, or remove accounts.
          </p>
          <form className="flex items-center gap-2" action="/admin/users">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input name="q" defaultValue={q} placeholder="Search by name or email…"
                className="h-11 w-full rounded-xl border border-input bg-black/30 pl-9 pr-3 text-sm focus-visible:outline-none" />
            </div>
            <button className="rounded-xl btn-gold px-4 text-sm font-semibold">Search</button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {users.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No users found.</CardContent></Card>
        ) : (
          users.map((u) => (
            <UserRow
              key={u.id}
              user={{
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                leagues: u._count.memberships,
                isSelf: u.id === (session?.user as any)?.id,
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
