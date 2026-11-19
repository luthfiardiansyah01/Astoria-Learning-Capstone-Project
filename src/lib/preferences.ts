export type ThemePreference = "system" | "light" | "dark";
export type FontScale = "small" | "normal" | "large" | "xlarge";

export const THEME_KEY = "sobat-theme";
export const FONT_KEY = "sobat-font";
export const MOTION_KEY = "sobat-motion";

export const FONT_PERCENT: Record<FontScale, number> = {
  small: 90,
  normal: 100,
  large: 112,
  xlarge: 125,
};

function isTheme(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

function isFontScale(value: unknown): value is FontScale {
  return value === "small" || value === "normal" || value === "large" || value === "xlarge";
}

/**
 * Terapkan preferensi tampilan ke <html> dan simpan di localStorage.
 * Ukuran teks memakai persentase agar tetap menghormati pengaturan peramban.
 */
export function applyPreferences(
  input: { theme?: string; fontScale?: string; reducedMotion?: boolean } = {}
) {
  if (typeof window === "undefined") return;

  const storedTheme = window.localStorage.getItem(THEME_KEY);
  const theme: ThemePreference = isTheme(input.theme)
    ? input.theme
    : isTheme(storedTheme)
      ? storedTheme
      : "system";

  const storedFont = window.localStorage.getItem(FONT_KEY);
  const fontScale: FontScale = isFontScale(input.fontScale)
    ? input.fontScale
    : isFontScale(storedFont)
      ? storedFont
      : "normal";

  const storedMotion = window.localStorage.getItem(MOTION_KEY) === "1";
  const reducedMotion =
    typeof input.reducedMotion === "boolean" ? input.reducedMotion : storedMotion;

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = theme === "dark" || (theme === "system" && prefersDark);

  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.fontSize = `${FONT_PERCENT[fontScale]}%`;
  root.dataset.fontScale = fontScale;
  root.dataset.reduceMotion = reducedMotion ? "true" : "false";

  window.localStorage.setItem(THEME_KEY, theme);
  window.localStorage.setItem(FONT_KEY, fontScale);
  window.localStorage.setItem(MOTION_KEY, reducedMotion ? "1" : "0");
}

/** Skrip awal agar tema dan ukuran teks tidak berkedip sebelum React hidrasi. */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}")||"system";var f=localStorage.getItem("${FONT_KEY}")||"normal";var p={small:90,normal:100,large:112,xlarge:125}[f]||100;var m=localStorage.getItem("${MOTION_KEY}")==="1";var d=document.documentElement;var dark=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(dark){d.classList.add("dark")}d.style.fontSize=p+"%";d.dataset.fontScale=f;d.dataset.reduceMotion=m?"true":"false"}catch(e){}})();`;
