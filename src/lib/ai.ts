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

async function postJson(cfg: AiConfig, endpoint: string, body: unknown) {
  const res = await fetch(`${cfg.baseUrl}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`API request failed with status ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }
  return res.json();
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
  options?: { cache?: boolean }
): Promise<string> {
  const key = cacheKey(messages, params);
  const hit = options?.cache ? answerCache.get(key) : undefined;
  if (hit && hit.expires > Date.now()) return hit.value;

  const cfg = await getConfig();

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const model = AI_MODELS.length > 0 ? AI_MODELS[(attempt - 1) % AI_MODELS.length] : undefined;
    try {
      const completion = await postJson(cfg, "/chat/completions", {
        messages,
        thinking: { type: "disabled" },
        ...(model ? { model } : {}),
        ...(params?.temperature !== undefined ? { temperature: params.temperature } : {}),
        // Beberapa model gratis OpenRouter menolak top_p (400) → hanya kirim untuk provider default.
        ...(params?.top_p !== undefined && !model ? { top_p: params.top_p } : {}),
        ...(params?.max_tokens !== undefined ? { max_tokens: params.max_tokens } : {}),
      });

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
      console.error(`[astoria-ai] Percobaan ${attempt} (${model ?? "default"}) gagal:`, lastError.message);
      if (attempt < 3) {
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
    console.error("[astoria-ai] Embedding gagal:", err instanceof Error ? err.message : err);
    return null;
  }
}

/** Ekstrak JSON dari respons teks AI (tahan terhadap markdown fence & prefix). */
export function extractJSON<T>(raw: string): T | null {
  const cleaned = raw
    .replace(/```json/gi, "```")
    .replace(/```/g, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

/** Chat completion yang wajib menghasilkan JSON valid (dengan retry parsing). */
export async function chatJSON<T>(
  messages: ChatMessageForAI[],
  params?: RoleParams
): Promise<T> {
  const raw = await chatComplete(messages, params);
  const parsed = extractJSON<T>(raw);
  if (!parsed) {
    throw new Error("AI tidak mengembalikan JSON valid");
  }
  return parsed;
}
