"use client";

import { useEffect, useState } from "react";
import { Megaphone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Stats = { users: number; devices: number; subscribers: number };

export function AdminBroadcast() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/broadcast")
      .then(async (res) => (res.ok ? ((await res.json()) as Stats) : null))
      .then((data) => setStats(data))
      .catch(() => null);
  }, []);

  async function send() {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        users?: number;
        devices?: number;
        sent?: number;
        failed?: number;
        pushSkipped?: boolean;
      };
      if (!res.ok) throw new Error(data.error || "Gagal mengirim siaran.");
      setMessage(
        `Terkirim ke ${data.users ?? 0} pengguna. Push: ${data.sent ?? 0} berhasil` +
          (data.failed ? `, ${data.failed} gagal` : "") +
          (data.pushSkipped ? " (Web Push belum dikonfigurasi)" : "") +
          "."
      );
      setTitle("");
      setBody("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengirim siaran.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Megaphone className="h-4 w-4 text-primary" /> Siaran notifikasi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Kirim pengumuman ke seluruh mahasiswa. Notifikasi masuk ke aplikasi; push hanya sampai
          ke perangkat yang sudah mengaktifkan notifikasi.
        </p>
        {stats && (
          <p className="text-xs text-muted-foreground">
            {stats.users} pengguna · {stats.subscribers} pengguna dengan push ·{" "}
            {stats.devices} perangkat terdaftar
          </p>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!title.trim() || !body.trim()) return;
            setConfirmOpen(true);
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="broadcast-title">Judul</Label>
            <Input
              id="broadcast-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              required
              placeholder="Mis. Jadwal pemeliharaan layanan"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="broadcast-body">Isi pesan</Label>
            <Textarea
              id="broadcast-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={200}
              rows={3}
              required
              placeholder="Tulis pengumuman singkat."
            />
            <p className="text-xs text-muted-foreground">{body.length}/200 karakter</p>
          </div>
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
          <Button type="submit" disabled={busy || !title.trim() || !body.trim()}>
            <Send className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {busy ? "Mengirim…" : "Kirim siaran"}
          </Button>
        </form>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Kirim siaran ke semua pengguna?</AlertDialogTitle>
              <AlertDialogDescription>
                &ldquo;{title}&rdquo; akan dikirim ke {stats?.users ?? "seluruh"} mahasiswa.
                Notifikasi dalam aplikasi selalu terkirim; push hanya ke perangkat yang sudah
                mengaktifkan notifikasi.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setConfirmOpen(false);
                  void send();
                }}
              >
                Kirim sekarang
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
