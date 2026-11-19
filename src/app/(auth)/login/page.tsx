import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/astoria/auth/login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Masuk - SOBAT ADI",
  description: "Masuk ke SOBAT ADI untuk melanjutkan belajar bersama Mentor AI.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Masuk ke SOBAT ADI</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {reason === "sesi-berakhir" && (
            <div
              role="alert"
              className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
            >
              Sesi Anda diakhiri karena akun ini baru saja masuk di perangkat lain. Satu akun hanya
              dapat digunakan pada satu perangkat.
            </div>
          )}
          <LoginForm />
          <p className="text-center text-sm">
            <Link href="/forgot-password" className="text-primary underline hover:text-primary/80">
              Lupa password?
            </Link>
          </p>
          <p className="text-sm text-muted-foreground text-center">
            Belum punya akun?{" "}
            <Link href="/register" className="underline">
              Daftar
            </Link>
          </p>
          <p className="text-center text-xs">
            <Link href="/produk" className="text-primary underline hover:text-primary/80">
              Pelajari paket & harga
            </Link>
          </p>
          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
            Dengan masuk, Anda menyetujui{" "}
            <Link href="/legal/syarat-ketentuan" className="underline hover:text-foreground">
              Syarat & Ketentuan
            </Link>{" "}
            dan{" "}
            <Link href="/legal/kebijakan-produk" className="underline hover:text-foreground">
              Kebijakan Produk
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
