// src/lib/ai.ts
// Wrapper z-ai-web-dev-sdk — HANYA untuk backend (server-side).
// Mengikuti konfigurasi Seksi 1 spesifikasi: parameter per peran + retry + fallback.

import ZAI from "z-ai-web-dev-sdk";
import type { PARAMS } from "./prompts";

type RoleParams = (typeof PARAMS)[keyof typeof PARAMS];

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

export interface ChatMessageForAI {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Panggil chat completion dengan retry (exponential backoff).
 * params: temperature/top_p/max_tokens per peran sesuai spesifikasi.
 */
export async function chatComplete(
  messages: ChatMessageForAI[],
  params?: RoleParams
): Promise<string> {
  const zai = await getZAI();

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const completion = await zai.chat.completions.create({
        messages,
        thinking: { type: "disabled" },
        ...(params?.temperature !== undefined ? { temperature: params.temperature } : {}),
        ...(params?.top_p !== undefined ? { top_p: params.top_p } : {}),
        ...(params?.max_tokens !== undefined ? { max_tokens: params.max_tokens } : {}),
      });

      const content = completion.choices?.[0]?.message?.content;
      if (!content || content.trim().length === 0) {
        throw new Error("Respons AI kosong");
      }
      return content;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`[astoria-ai] Percobaan ${attempt} gagal:`, lastError.message);
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }
  throw lastError ?? new Error("AI gagal merespons");
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
