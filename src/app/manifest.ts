import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SOBAT ADI — Solusi Belajar Terbaik, Asisten Digital Interaktif",
    short_name: "SOBAT ADI",
    description:
      "Platform belajar bertenaga AI untuk mahasiswa Pendidikan Jarak Jauh: Mentor AI berbasis modul, kuis otomatis, dan kolaborasi tim.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7faf8",
    theme_color: "#0b5d3b",
    lang: "id",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/logo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
