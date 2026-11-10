import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  CreditCard,
  GraduationCap,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

export const metadata: Metadata = {
  title: "SOBAT ADI Premium — Paket, Harga, dan Cara Berlangganan",
  description:
    "SOBAT ADI adalah platform belajar bertenaga AI untuk mahasiswa PJJ Universitas Terbuka. Lihat fitur, harga Premium Rp19.000/30 hari, dan cara berlangganan.",
  keywords: ["SOBAT ADI", "Premium", "Mentor AI", "PJJ", "Universitas Terbuka"],
};

const premiumFeatures = [
  "AI 300 request/hari",
  "Dokumen hingga 20.000 karakter",
  "PDF maksimal 5 MB",
  "10 tim, 10 proyek, 100 tugas",
  "Maksimal 30 anggota tim",
];

const freeFeatures = [
  "AI 30 request/hari",
  "Dokumen hingga 8.000 karakter",
  "PDF maksimal 2 MB",
  "1 tim, 2 proyek, 10 tugas",
  "Maksimal 3 anggota tim",
];

export default function ProdukPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/produk" className="flex items-center gap-2.5" aria-label="SOBAT ADI">
            <span className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 p-2 shadow-sm">
              <GraduationCap className="h-5 w-5 text-white" />
            </span>
            <span className="text-left">
              <span className="block text-sm font-bold leading-none">SOBAT ADI</span>
              <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.18em] text-primary/75">
                Belajar Tanpa Jarak
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/login" className="rounded-full px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground">
              Masuk
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90"
            >
              Daftar
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Platform belajar PJJ berbasis AI
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-5xl">
            Belajar lebih terarah bersama Mentor AI
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            SOBAT ADI membantu mahasiswa Pendidikan Jarak Jauh memahami modul, berlatih kuis,
            dan berkolaborasi dalam tim. Unggah modul, tanya Mentor AI, lalu raih XP dan lencana.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Mulai Gratis
            </Link>
            <Link
              href="#premium"
              className="rounded-full border px-6 py-3 text-sm font-semibold hover:bg-muted"
            >
              Lihat Paket Premium
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Akun baru mendapat trial Premium 7 hari setelah verifikasi email.
          </p>
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: BookOpen, title: "Unggah modul", body: "PDF/TXT diekstrak menjadi materi yang bisa ditanyakan." },
            { icon: Sparkles, title: "Mentor AI", body: "Jawaban berbasis isi dokumen dengan referensi bagian." },
            { icon: Users, title: "Kolaborasi tim", body: "Tim, proyek, tugas Kanban, dan undangan anggota." },
            { icon: ShieldCheck, title: "Aman & terverifikasi", body: "Email terverifikasi dan akses dokumen terkontrol." },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border bg-card p-4">
              <item.icon className="h-5 w-5 text-primary" />
              <h2 className="mt-3 text-sm font-semibold">{item.title}</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="premium" className="border-y bg-muted/30 py-14">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">Paket & Harga</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Mulai gratis, upgrade saat butuh kapasitas lebih. Pembayaran diproses oleh Midtrans.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border bg-card p-6">
              <p className="text-sm font-semibold">Free</p>
              <p className="mt-2 text-3xl font-bold">Rp0</p>
              <p className="text-xs text-muted-foreground">selamanya</p>
              <ul className="mt-5 space-y-2.5 text-sm">
                {freeFeatures.map((f) => (
                  <li key={f} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="mt-6 block rounded-full border px-4 py-2.5 text-center text-sm font-semibold hover:bg-muted"
              >
                Mulai Gratis
              </Link>
            </div>

            <div className="relative rounded-2xl border-2 border-primary bg-card p-6 shadow-sm">
              <span className="absolute -top-3 right-5 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                Populer
              </span>
              <p className="text-sm font-semibold">Premium</p>
              <p className="mt-2 text-3xl font-bold">Rp19.000</p>
              <p className="text-xs text-muted-foreground">per 30 hari</p>
              <ul className="mt-5 space-y-2.5 text-sm">
                {premiumFeatures.map((f) => (
                  <li key={f} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className="mt-6 block rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Masuk untuk Upgrade
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">Cara Berlangganan</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { step: "1", title: "Daftar", body: "Buat akun dengan email aktif." },
            { step: "2", title: "Verifikasi email", body: "Klik tautan verifikasi untuk mengaktifkan trial." },
            { step: "3", title: "Pilih Premium", body: "Buka Paket SOBAT ADI lalu klik Upgrade." },
            { step: "4", title: "Bayar via Midtrans", body: "Pilih QRIS, transfer bank, atau e-wallet." },
          ].map((item) => (
            <div key={item.step} className="rounded-2xl border bg-card p-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {item.step}
              </span>
              <h3 className="mt-3 text-sm font-semibold">{item.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
          <p className="flex items-start gap-2">
            <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              Metode pembayaran yang didukung melalui Midtrans: <strong>GoPay QRIS</strong>,{" "}
              <strong>transfer bank</strong>, <strong>GoPay e-money</strong>, dan{" "}
              <strong>BSI Virtual Account</strong>. Produk adalah langganan digital; tidak ada
              pengiriman barang.
            </span>
          </p>
          <p className="mt-3 flex items-start gap-2">
            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              Masa aktif Premium 30 hari. Pembatalan sebelum pembayaran tidak dikenakan biaya.
              Pengembalian dana mengikuti kebijakan yang tersedia di halaman legal.
            </span>
          </p>
        </div>
      </section>

      <footer className="border-t bg-muted/30">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>SOBAT ADI — platform belajar bertenaga AI untuk mahasiswa PJJ Universitas Terbuka.</p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/legal/syarat-ketentuan" className="hover:text-foreground">
              Syarat & Ketentuan
            </Link>
            <Link href="/legal/kebijakan-produk" className="hover:text-foreground">
              Kebijakan Produk
            </Link>
            <Link href="/legal/kebijakan-pengembalian-dana" className="hover:text-foreground">
              Pengembalian Dana
            </Link>
            <a href="mailto:admin1@moedatrace.com" className="inline-flex items-center gap-1 hover:text-foreground">
              <Mail className="h-3.5 w-3.5" /> Kontak
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
