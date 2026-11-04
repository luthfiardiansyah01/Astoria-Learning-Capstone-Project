import Link from "next/link";
import { RegisterForm } from "@/components/astoria/auth/register-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Buat Akun SOBAT ADI</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RegisterForm />
          <p className="text-sm text-muted-foreground text-center">
            Sudah punya akun?{" "}
            <Link href="/login" className="underline">
              Masuk
            </Link>
          </p>
          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
            Dengan mendaftar, Anda menyetujui{" "}
            <Link href="/legal/syarat-ketentuan" className="underline hover:text-foreground">
              Syarat & Ketentuan
            </Link>
            ,{" "}
            <Link
              href="/legal/kebijakan-pengembalian-dana"
              className="underline hover:text-foreground"
            >
              Kebijakan Pengembalian Dana
            </Link>
            , dan{" "}
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
