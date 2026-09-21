// Store global Astoria: navigasi view + statistik mahasiswa
"use client";

import { create } from "zustand";

export type ViewKey = "beranda" | "mentor" | "unggah" | "kuis" | "admin";

export interface UserStats {
  nama: string;
  xp: number;
  level: number;
  streak: number;
  totalQuiz: number;
  docCount: number;
  avgSkor: number | null;
}

interface AstoriaState {
  view: ViewKey;
  activeDocumentId: string | null;
  stats: UserStats | null;
  setView: (v: ViewKey) => void;
  setActiveDocument: (id: string | null) => void;
  setStats: (s: UserStats | null) => void;
  refreshStats: () => Promise<void>;
}

export const useAstoria = create<AstoriaState>((set) => ({
  view: "beranda",
  activeDocumentId: null,
  stats: null,
  setView: (view) => set({ view }),
  setActiveDocument: (activeDocumentId) => set({ activeDocumentId }),
  setStats: (stats) => set({ stats }),
  refreshStats: async () => {
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) return;
      const data = await res.json();
      const p = data.profile;
      set({
        stats: {
          nama: p.nama,
          xp: p.xp,
          level: p.level,
          streak: p.streak,
          totalQuiz: p.totalQuiz,
          docCount: p.docCount,
          avgSkor: p.avgSkor,
        },
      });
    } catch {
      // diamkan — statistik akan dimuat ulang saat aksi berikutnya
    }
  },
}));
