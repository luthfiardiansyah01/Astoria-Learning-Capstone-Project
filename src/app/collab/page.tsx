import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ProjectList } from "@/components/astoria/collab/project-list";
import { PendingInvites } from "@/components/astoria/collab/pending-invites";
import { BackButton } from "@/components/astoria/collab/back-button";
import { PageTransition } from "@/components/astoria/page-transition";

export default async function CollabPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-3">
        <BackButton href="/" label="Beranda" />
      </div>
      <PageTransition>
        <div className="space-y-4">
          <PendingInvites />
          <ProjectList />
        </div>
      </PageTransition>
    </main>
  );
}
