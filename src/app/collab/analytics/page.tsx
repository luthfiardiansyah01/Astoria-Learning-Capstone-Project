import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NotificationBell } from "@/components/astoria/collab/notification-bell";
import { AnalyticsDashboard } from "@/components/astoria/collab/analytics-dashboard";

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/collab" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Kembali ke Tim &amp; Proyek
        </Link>
        <NotificationBell />
      </div>
      <AnalyticsDashboard />
    </main>
  );
}
