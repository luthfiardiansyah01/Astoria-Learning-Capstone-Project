import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b5d3b",
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
        <a href="#konten-utama" className="skip-link">
          Lewati ke konten utama
        </a>
        <div id="konten-utama" tabIndex={-1}>
          {children}
        </div>
      </body>
    </html>
  );
}
