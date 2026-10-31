import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { AstoriaSessionProvider } from "@/components/providers/session-provider";
import { QueryProvider } from "@/components/providers/query-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SOBAT ADI — Solusi Belajar Terbaik, Asisten Digital Interaktif",
  description:
    "SOBAT ADI — Solusi Belajar Terbaik, Asisten Digital Interaktif: platform belajar bertenaga AI dan kolaborasi tim untuk mahasiswa pendidikan jarak jauh (PJJ) Universitas Terbuka.",
  keywords: ["SOBAT ADI", "Universitas Terbuka", "PJJ", "Mentor AI", "RAG", "gamifikasi"],
  authors: [{ name: "SOBAT ADI Team" }],
  icons: { icon: "/logo.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <AstoriaSessionProvider>
          <QueryProvider>
            {children}
            <Toaster />
            <SonnerToaster />
          </QueryProvider>
        </AstoriaSessionProvider>
      </body>
    </html>
  );
}
