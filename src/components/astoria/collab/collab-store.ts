"use client";
// UI-only state for Astoria Collab (server data goes through React Query, not here).

import { create } from "zustand";

interface CollabState {
  activeTaskId: string | null;
  setActiveTask: (id: string | null) => void;
}

export const useCollabUi = create<CollabState>((set) => ({
  activeTaskId: null,
  setActiveTask: (activeTaskId) => set({ activeTaskId }),
}));
