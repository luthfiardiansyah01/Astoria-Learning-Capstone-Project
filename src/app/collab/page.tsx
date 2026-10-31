import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ProjectList } from "@/components/astoria/collab/project-list";

export default async function CollabPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <ProjectList />
    </main>
  );
}
