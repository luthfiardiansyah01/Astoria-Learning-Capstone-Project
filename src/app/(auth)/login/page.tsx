import Link from "next/link";
import { LoginForm } from "@/components/astoria/auth/login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Masuk ke SOBAT ADI</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <LoginForm />
          <p className="text-sm text-muted-foreground text-center">
            Belum punya akun?{" "}
            <Link href="/register" className="underline">
              Daftar
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
