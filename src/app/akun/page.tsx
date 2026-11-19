"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { ArrowLeft, Download, KeyRound, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AccountSettings } from "@/components/astoria/account-settings";

export default function AkunPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [deletePassword, setDeletePassword] = useState("");
  const [deleteAck, setDeleteAck] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    if (newPassword.length < 8) {
      setPasswordError("Password baru minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Konfirmasi password tidak sama.");
      return;
    }

    setPasswordBusy(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error || "Gagal mengganti password.");
      setPasswordMessage("Password berhasil diganti.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Gagal mengganti password.");
    } finally {
      setPasswordBusy(false);
    }
  }

  async function exportData() {
    setExportError(null);
    setExportBusy(true);
    try {
      const res = await fetch("/api/profile/export");
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || "Gagal mengekspor data.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sobat-adi-data.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Gagal mengekspor data.");
    } finally {
      setExportBusy(false);
    }
  }

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setDeleteError(null);

    if (!deleteAck) {
      setDeleteError("Centang pernyataan sebelum menghapus akun.");
      return;
    }
    if (!window.confirm("Hapus akun secara permanen? Tindakan ini tidak bisa dibatalkan.")) {
      return;
    }

    setDeleteBusy(true);
    try {
      const res = await fetch("/api/profile", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error || "Gagal menghapus akun.");
      await signOut({ callbackUrl: "/login" });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Gagal menghapus akun.");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Akun & Pengaturan</h1>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Kembali
            </Link>
          </Button>
        </div>

        <AccountSettings />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-primary" /> Ganti password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={changePassword} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="current-password">Password saat ini</Label>
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">Password baru</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password">Ulangi password baru</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
              {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
              {passwordMessage && (
                <p className="text-sm text-emerald-700 dark:text-emerald-400">{passwordMessage}</p>
              )}
              <Button type="submit" disabled={passwordBusy}>
                {passwordBusy ? "Menyimpan…" : "Simpan password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="h-4 w-4 text-primary" /> Ekspor data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Unduh salinan data akunmu (profil, dokumen, chat, kuis, pembayaran, tim) dalam
              format JSON.
            </p>
            {exportError && <p className="text-sm text-destructive">{exportError}</p>}
            <Button variant="outline" onClick={exportData} disabled={exportBusy}>
              {exportBusy ? "Menyiapkan…" : "Unduh data saya"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <Trash2 className="h-4 w-4" /> Hapus akun
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={deleteAccount} className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Akun dan data belajarmu akan dihapus permanen. Akun dengan riwayat pembayaran
                tidak dapat dihapus otomatis; ajukan ke admin agar catatan pembayaran tetap
                sesuai kewajiban audit.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="delete-password">Konfirmasi dengan password</Label>
                <Input
                  id="delete-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                />
              </div>
              <label className="flex items-start gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4"
                  checked={deleteAck}
                  onChange={(e) => setDeleteAck(e.target.checked)}
                />
                <span>Saya memahami bahwa penghapusan akun bersifat permanen.</span>
              </label>
              {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
              <Button type="submit" variant="destructive" disabled={deleteBusy}>
                {deleteBusy ? "Menghapus…" : "Hapus akun saya"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
