"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!res.ok) throw new Error(body.error || "Gagal mengirim tautan reset.");
      setMessage(
        body.message ??
          "Jika email terdaftar, tautan reset password sudah dikirim. Periksa kotak masuk dan folder spam."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim tautan reset.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="forgot-email">Email</Label>
        <Input
          id="forgot-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nama@email.com"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && <p className="text-sm text-emerald-700 dark:text-emerald-400">{message}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Mengirim…" : "Kirim tautan reset"}
      </Button>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Demi keamanan, kami tidak memberi tahu apakah sebuah email terdaftar atau tidak.
      </p>
    </form>
  );
}
