import Link from "next/link";
import { ArrowLeft, GraduationCap } from "lucide-react";
import type { ReactNode } from "react";

const LEGAL_LINKS = [
  { href: "/legal/syarat-ketentuan", label: "Syarat & Ketentuan" },
  { href: "/legal/kebijakan-pengembalian-dana", label: "Pengembalian Dana" },
  { href: "/legal/kebijakan-produk", label: "Kebijakan Produk" },
];

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="space-y-2 text-muted-foreground">{children}</div>
    </section>
  );
}

export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1 pl-5">{children}</ul>;
}

export function LegalPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-4xl items-center gap-3 px-4">
          <Link href="/" className="flex items-center gap-2.5" aria-label="SOBAT ADI — beranda">
            <span className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 p-2 shadow-sm">
              <GraduationCap className="h-5 w-5 text-white" />
            </span>
            <span className="text-left">
              <span className="block text-sm font-bold leading-none tracking-tight">SOBAT ADI</span>
              <span className="mt-1 block text-[9px] font-semibold uppercase leading-none tracking-[0.18em] text-primary/75">
                Belajar Tanpa Jarak
              </span>
            </span>
          </Link>
          <Link
            href="/"
            className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Dokumen Legal
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Versi 1.0 · Berlaku 4 November 2026
          </p>
        </div>

        <article className="space-y-6 rounded-2xl border bg-card p-5 text-sm leading-relaxed shadow-sm sm:p-8">
          {children}
        </article>

        <footer className="mt-8 border-t pt-5 text-xs text-muted-foreground">
          <nav className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Dokumen legal">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-foreground hover:underline">
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="mt-3">
            Pertanyaan:{" "}
            <a href="mailto:admin@sobat-adi.id" className="underline hover:text-foreground">
              admin@sobat-adi.id
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
