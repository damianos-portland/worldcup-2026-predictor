import { ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/session";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="container py-8">
        <div className="mb-2 flex items-center gap-3">
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
            <ShieldCheck className="h-6 w-6 text-gold" /> Admin Dashboard
          </h1>
          <Badge variant="gold">Tournament Director</Badge>
        </div>
        <AdminNav />
        {children}
      </div>
    </div>
  );
}
