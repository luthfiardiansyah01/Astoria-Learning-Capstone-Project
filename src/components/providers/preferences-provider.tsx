"use client";

import { useEffect } from "react";
import { applyPreferences, FONT_KEY, MOTION_KEY, THEME_KEY } from "@/lib/preferences";

/**
 * Menyelaraskan preferensi dari server (lintas perangkat) dan mengikuti
 * perubahan tema sistem saat pengguna memilih "Sistem".
 */
export function PreferencesProvider() {
  useEffect(() => {
    let cancelled = false;

    fetch("/api/profile/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { theme?: string; fontScale?: string; reducedMotion?: boolean } | null) => {
        if (!cancelled && data) {
          applyPreferences({
            theme: data.theme,
            fontScale: data.fontScale,
            reducedMotion: data.reducedMotion,
          });
        }
      })
      .catch(() => null);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSchemeChange = () => {
      const stored = window.localStorage.getItem(THEME_KEY);
      if (!stored || stored === "system") applyPreferences({});
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_KEY || event.key === FONT_KEY || event.key === MOTION_KEY) {
        applyPreferences({});
      }
    };

    media.addEventListener?.("change", onSchemeChange);
    window.addEventListener("storage", onStorage);

    return () => {
      cancelled = true;
      media.removeEventListener?.("change", onSchemeChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}
