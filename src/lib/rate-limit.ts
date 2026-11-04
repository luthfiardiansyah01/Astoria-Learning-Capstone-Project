// src/lib/rate-limit.ts
// Pembatas laju request. Produksi: Upstash Redis (REST). Lokal/tanpa env: memori proses.
// Catatan: memori tidak dibagi antar-instance serverless, jadi hanya untuk pengembangan.

import { NextResponse } from "next/server";
import { PLAN_LIMITS, type Plan } from "./plans";

export const LIMITS = {
  register: { max: 5, windowSec: 3600 },
  login: { max: 10, windowSec: 900 },
  aiPerMinute: { max: 20, windowSec: 60 },
  aiPerDay: { max: 300, windowSec: 86400 },
  upload: { max: 10, windowSec: 3600 },
} as const;

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfter: number;
};

export type RateLimitStatus = {
  used: number;
  remaining: number;
  limit: number;
  resetAt: number;
};

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Tanggal kalender WIB (YYYY-MM-DD), dipakai sebagai bagian kunci kuota harian. */
export function wibDayKey(date = new Date()): string {
  return new Date(date.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

/** Detik menuju tengah malam WIB berikutnya. */
export function secondsUntilWibMidnight(date = new Date()): number {
  const wib = new Date(date.getTime() + WIB_OFFSET_MS);
  const nextMidnight = Date.UTC(
    wib.getUTCFullYear(),
    wib.getUTCMonth(),
    wib.getUTCDate() + 1
  );
  return Math.max(1, Math.ceil((nextMidnight - wib.getTime()) / 1000));
}

/** Nama counter kuota AI harian; berubah otomatis saat tanggal WIB berganti. */
export function aiDayCounterName(date = new Date()): string {
  return `ai-day:${wibDayKey(date)}`;
}

type MemoryEntry = { count: number; reset: number };

const globalForRateLimit = globalThis as unknown as {
  __sobadiRateLimit?: Map<string, MemoryEntry>;
  __sobadiRateLimitWarned?: boolean;
};

const memory = (globalForRateLimit.__sobadiRateLimit ??= new Map<string, MemoryEntry>());

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim().replace(/\/+$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  return url && token ? { url, token } : null;
}

function memoryHit(key: string, max: number, windowSec: number): RateLimitResult {
  cleanupMemory();
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || entry.reset <= now) {
    memory.set(key, { count: 1, reset: now + windowSec * 1000 });
    return { ok: true, remaining: max - 1, retryAfter: windowSec };
  }
  entry.count += 1;
  return {
    ok: entry.count <= max,
    remaining: Math.max(0, max - entry.count),
    retryAfter: Math.max(1, Math.ceil((entry.reset - now) / 1000)),
  };
}

function cleanupMemory() {
  if (memory.size < 5000) return;
  const now = Date.now();
  for (const [k, v] of memory) if (v.reset <= now) memory.delete(k);
}

/**
 * Hitung satu request. Jendela tetap (fixed window): kunci kedaluwarsa sendiri.
 * Bila Upstash gagal, jatuh ke memori agar aplikasi tetap bisa dipakai.
 */
export async function rateLimit(
  name: string,
  id: string,
  max: number,
  windowSec: number
): Promise<RateLimitResult> {
  const key = `sobadi:rl:${name}:${id}`;
  const cfg = redisConfig();
  if (!cfg) {
    if (process.env.NODE_ENV === "production" && !globalForRateLimit.__sobadiRateLimitWarned) {
      globalForRateLimit.__sobadiRateLimitWarned = true;
      console.warn("[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN kosong; memakai memori proses (tidak efektif di serverless).");
    }
    return memoryHit(key, max, windowSec);
  }

  try {
    const res = await fetch(`${cfg.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, windowSec, "NX"],
        ["TTL", key],
      ]),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Upstash ${res.status}`);

    const data = (await res.json()) as { result?: number | string | null; error?: string }[];
    if (data.some((d) => d.error)) throw new Error(data.find((d) => d.error)?.error);

    const count = Number(data[0]?.result ?? 0);
    const ttl = Number(data[2]?.result ?? 0);
    return {
      ok: count <= max,
      remaining: Math.max(0, max - count),
      retryAfter: ttl > 0 ? ttl : windowSec,
    };
  } catch (e) {
    console.error("[rate-limit] Upstash gagal, jatuh ke memori:", e instanceof Error ? e.message : e);
    return memoryHit(key, max, windowSec);
  }
}

/** IP klien dari header proxy Vercel. */
export function clientIp(headers: Headers | Record<string, string | undefined> | undefined): string {
  if (!headers) return "unknown";
  const get = (name: string) =>
    headers instanceof Headers ? headers.get(name) : headers[name] ?? headers[name.toLowerCase()];
  const forwarded = get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || get("x-real-ip") || "unknown";
}

export function tooManyRequests(result: RateLimitResult) {
  return NextResponse.json(
    {
      error: `Terlalu banyak permintaan. Coba lagi dalam ${result.retryAfter} detik.`,
      code: "rate_limited",
    },
    { status: 429, headers: { "Retry-After": String(result.retryAfter) } }
  );
}

function memoryStatus(key: string, max: number, windowSec: number): RateLimitStatus {
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || entry.reset <= now) {
    return { used: 0, remaining: max, limit: max, resetAt: now + windowSec * 1000 };
  }
  return {
    used: entry.count,
    remaining: Math.max(0, max - entry.count),
    limit: max,
    resetAt: entry.reset,
  };
}

/** Baca pemakaian saat ini tanpa menambah counter. */
export async function getRateLimitStatus(
  name: string,
  id: string,
  max: number,
  windowSec: number
): Promise<RateLimitStatus> {
  const key = `sobadi:rl:${name}:${id}`;
  const cfg = redisConfig();
  if (!cfg) return memoryStatus(key, max, windowSec);

  try {
    const res = await fetch(`${cfg.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["GET", key],
        ["TTL", key],
      ]),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Upstash ${res.status}`);

    const data = (await res.json()) as { result?: number | string | null; error?: string }[];
    if (data.some((d) => d.error)) throw new Error(data.find((d) => d.error)?.error);

    const used = Number(data[0]?.result ?? 0);
    const ttl = Number(data[1]?.result ?? 0);
    return {
      used,
      remaining: Math.max(0, max - used),
      limit: max,
      resetAt: Date.now() + (ttl > 0 ? ttl : windowSec) * 1000,
    };
  } catch (e) {
    console.error("[rate-limit] status Upstash gagal, pakai memori:", e instanceof Error ? e.message : e);
    return memoryStatus(key, max, windowSec);
  }
}

/** Batas gabungan untuk rute AI: per menit dan per hari. Null berarti boleh lanjut. */
export async function guardAi(userId: string, plan: Plan = "free"): Promise<NextResponse | null> {
  const limits = PLAN_LIMITS[plan];
  const minute = await rateLimit("ai-minute", userId, limits.aiPerMinute, 60);
  if (!minute.ok) return tooManyRequests(minute);

  // Kuota harian memakai tanggal WIB dan TTL sampai tengah malam WIB.
  const now = new Date();
  const day = await rateLimit(
    aiDayCounterName(now),
    userId,
    limits.aiPerDay,
    secondsUntilWibMidnight(now)
  );
  if (!day.ok) return tooManyRequests(day);

  return null;
}
