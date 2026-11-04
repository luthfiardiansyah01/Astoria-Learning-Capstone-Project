import { logger } from "@/lib/logger";
// src/lib/ai.ts
// Klien AI OpenAI-compatible (OpenRouter, dll) — HANYA untuk backend (server-side).
// Parameter per peran + retry + rotasi model cadangan + cache.
// Konfigurasi: env AI_BASE_URL + AI_API_KEY (produksi/Vercel), atau file .z-ai-config (lokal).

import { createHash } from "crypto";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import type { PARAMS } from "./prompts";

type RoleParams = (typeof PARAMS)[keyof typeof PARAMS];

// Provider OpenAI-compatible (mis. OpenRouter) mewajibkan field `model`.
// AI_MODEL = model utama; AI_FALLBACK_MODELS = daftar (dipisah koma) yang dicoba
// bergantian saat model utama kena rate limit. Kosongkan AI_MODEL untuk Z.ai/GLM.
const AI_MODELS = [
  process.env.AI_MODEL,
  ...(process.env.AI_FALLBACK_MODELS ?? "").split(","),
]
  .map((m) => m?.trim())
  .filter((m): m is string => !!m);

const EMBED_MODEL = process.env.AI_EMBED_MODEL || "nvidia/nemotron-3-embed-1b:free";

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 100;
const answerCache = new Map<string, { value: string; expires: number }>();

const QUOTA_MESSAGE =
  "Kuota AI gratis sedang habis. Coba lagi setelah reset harian atau gunakan API key berbayar.";
let quotaBlockedUntil = 0;

function isQuotaError(message: string) {
  return /(^|\D)429(\D|$)|rate limit|quota|kuota|free-models-per-day/i.test(message);
}

function quotaResetAt(message: string) {
  const match = message.match(/X-RateLimit-Reset["']?\s*:\s*["']?(\d{10,13})/i);
  if (!match) return 0;
  const raw = Number(match[1]);
  return raw > 10_000_000_000 ? raw : raw * 1000;
}

export function aiQuotaBlocked() {
  return Date.now() < quotaBlockedUntil;
}

export function aiQuotaMessage() {
  return QUOTA_MESSAGE;
}

export function isAiQuotaError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return isQuotaError(message);
}

interface AiConfig {
  baseUrl: string;
  apiKey: string;
}

let cachedConfig: AiConfig | null = null;

async function getConfig(): Promise<AiConfig> {
  if (cachedConfig) return cachedConfig;

  const baseUrl = process.env.AI_BASE_URL?.trim();
  const apiKey = process.env.AI_API_KEY?.trim();
  if (baseUrl && apiKey) {
    cachedConfig = { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
    return cachedConfig;
  }

  const candidates = [
    path.join(process.cwd(), ".z-ai-config"),
    path.join(os.homedir(), ".z-ai-config"),
  ];
  for (const file of candidates) {
    try {
      const cfg = JSON.parse(await fs.readFile(file, "utf-8"));
      if (cfg.baseUrl && cfg.apiKey) {
        cachedConfig = { baseUrl: String(cfg.baseUrl).replace(/\/+$/, ""), apiKey: String(cfg.apiKey) };
        return cachedConfig;
      }
    } catch {
      // coba lokasi berikutnya
    }
  }
  throw new Error(
    "Konfigurasi AI tidak ditemukan. Isi env AI_BASE_URL + AI_API_KEY, atau buat file .z-ai-config."
  );
}

async function postJson(cfg: AiConfig, endpoint: string, body: unknown, timeoutMs = 45_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${cfg.baseUrl}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`API request failed with status ${res.status}: ${(await res.text()).slice(0, 400)}`);
    }
    return res.json();
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(`AI timeout setelah ${timeoutMs} ms`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export interface ChatMessageForAI {
  role: "system" | "user" | "assistant";
  content: string;
}

function cacheKey(messages: ChatMessageForAI[], params?: RoleParams) {
  return createHash("sha256")
    .update(JSON.stringify({ messages, params }))
    .digest("hex");
}

/**
 * Panggil chat completion dengan retry, rotasi model fallback, dan cache
 * jawaban opt-in (options.cache) — dipakai untuk chat mentor, bukan kuis/greeting.
 */
export async function chatComplete(
  messages: ChatMessageForAI[],
  params?: RoleParams,
  options?: { cache?: boolean; timeoutMs?: number; retries?: number }
): Promise<string> {
  const key = cacheKey(messages, params);
  const hit = options?.cache ? answerCache.get(key) : undefined;
  if (hit && hit.expires > Date.now()) return hit.value;
  if (Date.now() < quotaBlockedUntil) throw new Error(QUOTA_MESSAGE);

  const cfg = await getConfig();
  const maxAttempts = Math.max(1, options?.retries ?? 3);

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const model = AI_MODELS.length > 0 ? AI_MODELS[(attempt - 1) % AI_MODELS.length] : undefined;
    try {
      const completion = await postJson(
        cfg,
        "/chat/completions",
        {
          messages,
          thinking: { type: "disabled" },
          ...(model ? { model } : {}),
          ...(params?.temperature !== undefined ? { temperature: params.temperature } : {}),
          // Beberapa model gratis OpenRouter menolak top_p (400) → hanya kirim untuk provider default.
          ...(params?.top_p !== undefined && !model ? { top_p: params.top_p } : {}),
          ...(params?.max_tokens !== undefined ? { max_tokens: params.max_tokens } : {}),
        },
        options?.timeoutMs ?? 45_000
      );

      const content = completion.choices?.[0]?.message?.content;
      if (!content || content.trim().length === 0) {
        throw new Error("Respons AI kosong");
      }

      if (options?.cache) {
        if (answerCache.size >= CACHE_MAX) {
          const oldest = answerCache.keys().next().value;
          if (oldest) answerCache.delete(oldest);
        }
        answerCache.set(key, { value: content, expires: Date.now() + CACHE_TTL_MS });
      }
      return content;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      logger.error(`[astoria-ai] Percobaan ${attempt} (${model ?? "default"}) gagal`, {
        error: lastError,
      });
      if (isQuotaError(lastError.message)) {
        const resetAt = quotaResetAt(lastError.message);
        quotaBlockedUntil = resetAt > Date.now() ? resetAt : Date.now() + 5 * 60_000;
        throw lastError;
      }
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }
  throw lastError ?? new Error("AI gagal merespons");
}

/**
 * Embedding teks via endpoint OpenAI-compatible `/embeddings`.
 * Mengembalikan null jika gagal, agar pemanggil bisa jatuh ke pencarian kata kunci.
 */
export async function embedTexts(texts: string[]): Promise<number[][] | null> {
  if (texts.length === 0) return [];
  if (aiQuotaBlocked()) return null;
  try {
    const cfg = await getConfig();
    const json = await postJson(cfg, "/embeddings", { model: EMBED_MODEL, input: texts });
    const vectors = (json.data as { embedding: number[]; index: number }[] | undefined)
      ?.slice()
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);
    if (!vectors || vectors.length !== texts.length) throw new Error("jumlah embedding tidak sesuai");
    return vectors;
  } catch (err) {
    logger.error("[astoria-ai] Embedding gagal:", { error: err instanceof Error ? err.message : err });
    return null;
  }
}

/** Ekstrak JSON dari respons teks AI (tahan terhadap markdown fence & prefix). */
export function extractJSON<T>(raw: string): T | null {
  const cleaned = raw
    .replace(/```json/gi, "```")
    .replace(/```/g, "")
    .replace(/^\uFEFF/, "")
    .trim();

  const candidates = [cleaned];
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end > start) {
    candidates.push(cleaned.slice(start, end + 1));
  }

  for (const candidate of candidates) {
    const variants = [candidate, candidate.replace(/,\s*([}\]])/g, "$1")];
    for (const variant of variants) {
      try {
        return JSON.parse(variant) as T;
      } catch {
        // coba varian berikutnya
      }
    }
  }
  return null;
}

/**
 * Chat completion yang wajib menghasilkan JSON valid.
 * Jika model mengembalikan teks non-JSON, coba sekali lagi dengan instruksi koreksi.
 */
export async function chatJSON<T>(
  messages: ChatMessageForAI[],
  params?: RoleParams
): Promise<T> {
  let currentMessages = messages;
  let lastRaw = "";

  for (let attempt = 1; attempt <= 2; attempt++) {
    const raw = await chatComplete(currentMessages, params, {
      retries: attempt === 1 ? 2 : 1,
    });
    const parsed = extractJSON<T>(raw);
    if (parsed) return parsed;

    lastRaw = raw;
    if (attempt === 1) {
      logger.warn("[astoria-ai] JSON tidak valid, mencoba ulang dengan instruksi koreksi.");
      currentMessages = [
        ...messages,
        { role: "assistant", content: raw.slice(0, 1500) },
        {
          role: "user",
          content:
            "Respons di atas bukan JSON valid. Jawab ULANG hanya dengan satu objek JSON valid sesuai skema, tanpa markdown, tanpa penjelasan.",
        },
      ];
    }
  }

  throw new Error(`AI tidak mengembalikan JSON valid: ${lastRaw.slice(0, 200)}`);
}
