import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Astoria Learning — Platform Belajar AI untuk Mahasiswa PJJ UT",
  description:
    "Platform belajar bertenaga AI untuk mahasiswa pendidikan jarak jauh (PJJ) Universitas Terbuka: Mentor AI berbasis dokumen, kuis gamifikasi XP & badge, serta moderasi konten.",
  keywords: ["Astoria", "Astoria Learning", "Universitas Terbuka", "PJJ", "Mentor AI", "RAG", "gamifikasi"],
  authors: [{ name: "Astoria Learning Team" }],
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
        {children}
        <Toaster />
      </body>
    </html>
  );
}
