import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/astoria/auth/reset-password-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Atur Password Baru - SOBAT ADI",
  description: "Atur password baru untuk akun SOBAT ADI.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Atur password baru</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {token ? (
            <>
              <p className="text-sm text-muted-foreground">
                Password baru minimal 8 karakter. Tautan ini hanya bisa dipakai sekali.
              </p>
              <ResetPasswordForm token={token} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Tautan tidak lengkap. Minta tautan baru dari halaman{" "}
              <Link href="/forgot-password" className="underline">
                lupa password
              </Link>
              .
            </p>
          )}
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="underline">
              Kembali ke halaman masuk
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
