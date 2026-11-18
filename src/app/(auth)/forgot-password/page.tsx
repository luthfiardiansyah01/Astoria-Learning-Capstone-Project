import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/astoria/auth/forgot-password-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Lupa Password — SOBAT ADI",
  description: "Minta tautan reset password untuk akun SOBAT ADI.",
};

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Lupa password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Masukkan email akunmu. Kami akan mengirim tautan untuk mengatur password baru.
          </p>
          <ForgotPasswordForm />
          <p className="text-center text-sm text-muted-foreground">
            Ingat password?{" "}
            <Link href="/login" className="underline">
              Masuk
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
