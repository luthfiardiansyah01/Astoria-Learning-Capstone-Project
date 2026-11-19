"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { BellRing, Palette, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { applyPreferences, type FontScale, type ThemePreference } from "@/lib/preferences";
import { PushSettings } from "@/components/astoria/push-settings";

type Settings = {
  name: string;
  email: string | null;
  theme: ThemePreference;
  fontScale: FontScale;
  reducedMotion: boolean;
  emailReminders: boolean;
};

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "Ikuti sistem" },
  { value: "light", label: "Terang" },
  { value: "dark", label: "Gelap" },
];

const FONT_OPTIONS: { value: FontScale; label: string }[] = [
  { value: "small", label: "Kecil (90%)" },
  { value: "normal", label: "Normal (100%)" },
  { value: "large", label: "Besar (112%)" },
  { value: "xlarge", label: "Sangat besar (125%)" },
];

function Switch({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p id={`${id}-label`} className="text-sm font-medium">
          {label}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          checked ? "border-primary bg-primary" : "border-input bg-muted"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-background shadow transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

export function AccountSettings() {
  const { update } = useSession();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile/settings")
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as Settings & { error?: string };
        if (!res.ok) throw new Error(body.error || "Gagal memuat pengaturan.");
        return body;
      })
      .then((data) => {
        if (!cancelled) setSettings(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Gagal memuat pengaturan.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function patch<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
    setMessage(null);
  }

  /** Pratinjau tema langsung, tanpa menunggu tombol Simpan. */
  function previewTheme(theme: ThemePreference) {
    patch("theme", theme);
    applyPreferences({ theme, reducedMotion: settings?.reducedMotion });
  }

  /** Pratinjau gerak minimal langsung. */
  function previewMotion(reducedMotion: boolean) {
    patch("reducedMotion", reducedMotion);
    applyPreferences({ theme: settings?.theme, reducedMotion });
  }

  /** Pratinjau ukuran teks langsung. */
  function previewFont(fontScale: FontScale) {
    patch("fontScale", fontScale);
    applyPreferences({
      theme: settings?.theme,
      fontScale,
      reducedMotion: settings?.reducedMotion,
    });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!settings) return;
    setError(null);
    setMessage(null);

    const name = settings.name.trim();
    if (!name) {
      setError("Nama tidak boleh kosong.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profile/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          theme: settings.theme,
          fontScale: settings.fontScale,
          reducedMotion: settings.reducedMotion,
          emailReminders: settings.emailReminders,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as Settings & { error?: string };
      if (!res.ok) throw new Error(body.error || "Gagal menyimpan pengaturan.");

      setSettings(body);
      applyPreferences({
        theme: body.theme,
        fontScale: body.fontScale,
        reducedMotion: body.reducedMotion,
      });
      if (body.name !== settings.name) {
        await update({ name: body.name });
      }
      setMessage("Pengaturan berhasil disimpan.");
      toast.success("Pengaturan disimpan.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan pengaturan.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <p role="status" className="text-sm text-muted-foreground">
            Memuat pengaturan…
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="py-6">
          <p role="alert" className="text-sm text-destructive">
            {error ?? "Pengaturan tidak tersedia."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={save} className="space-y-5" aria-label="Pengaturan akun">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserRound className="h-4 w-4 text-primary" /> Profil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="settings-name">Nama tampilan</Label>
            <Input
              id="settings-name"
              value={settings.name}
              maxLength={80}
              autoComplete="name"
              required
              onChange={(event) => patch("name", event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-email">Email</Label>
            <Input id="settings-email" value={settings.email ?? "-"} readOnly disabled />
            <p className="text-xs text-muted-foreground">
              Email tidak dapat diubah di sini. Hubungi admin bila perlu mengganti email.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4 text-primary" /> Tampilan dan aksesibilitas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Tema tampilan</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {THEMES.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    settings.theme === option.value
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name="theme"
                    value={option.value}
                    checked={settings.theme === option.value}
                    onChange={() => previewTheme(option.value)}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  {option.label}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Pilihan &ldquo;Ikuti sistem&rdquo; menyesuaikan mode terang atau gelap perangkat.
              Perubahan langsung terlihat; klik Simpan pengaturan untuk menyimpannya.
            </p>
          </fieldset>

          <Switch
            id="settings-motion"
            label="Kurangi animasi"
            description="Matikan animasi dan transisi agar tampilan lebih tenang."
            checked={settings.reducedMotion}
            onChange={(value) => previewMotion(value)}
          />

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Ukuran teks</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {FONT_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    settings.fontScale === option.value
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name="fontScale"
                    value={option.value}
                    checked={settings.fontScale === option.value}
                    onChange={() => previewFont(option.value)}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  {option.label}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Pratinjau: teks ini mengikuti ukuran yang Anda pilih. Ukuran disimpan per akun dan
              dihormati di seluruh halaman.
            </p>
          </fieldset>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BellRing className="h-4 w-4 text-primary" /> Notifikasi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Switch
            id="settings-reminders"
            label="Email pengingat tenggat"
            description="Kirim ringkasan tugas yang mendekati atau melewati tenggat. Notifikasi di aplikasi tetap aktif."
            checked={settings.emailReminders}
            onChange={(value) => patch("emailReminders", value)}
          />
          <PushSettings />
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
          {message}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Menyimpan…" : "Simpan pengaturan"}
        </Button>
      </div>
    </form>
  );
}
