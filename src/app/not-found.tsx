import Link from "next/link";
import { FileQuestion, Home, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CONTACT_EMAIL } from "@/lib/contact";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <FileQuestion className="h-6 w-6 text-primary" />
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          404
        </p>
        <h1 className="mt-1 text-xl font-bold">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Alamat ini tidak tersedia atau sudah dipindahkan. Periksa kembali tautannya.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" /> Kembali ke Beranda
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <a href={`mailto:${CONTACT_EMAIL}`}>
              <LifeBuoy className="mr-2 h-4 w-4" /> Hubungi Admin
            </a>
          </Button>
        </div>
      </div>
    </main>
  );
}
