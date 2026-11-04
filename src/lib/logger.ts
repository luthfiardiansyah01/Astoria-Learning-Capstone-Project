// Logger terstruktur untuk server & error boundary.
// Produksi: satu baris JSON. Development: teks yang mudah dibaca.
// Nilai sensitif (email, token, password, isi dokumen) diredaksi.

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_WEIGHT: Record<LogLevel | "silent", number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

const SENSITIVE_KEY =
  /(email|token|secret|password|authorization|signature|cookie|api[_-]?key|content|jawaban|rawpayload)/i;
const EMAIL_RE = /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g;
const TOKEN_RE = /\b(?:sk|pk|sb-mid|mid|xnd)[-_][\w.-]{10,}\b/gi;
const MAX_STRING = 600;
const MAX_DEPTH = 4;

function configuredLevel(): LogLevel | "silent" {
  const raw = process.env.LOG_LEVEL?.trim().toLowerCase();
  if (raw === "silent") return "silent";
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") return raw;
  return process.env.NODE_ENV === "test" ? "error" : "info";
}

function redactString(value: string): string {
  const truncated = value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
  return truncated.replace(EMAIL_RE, "[email]").replace(TOKEN_RE, "[token]");
}

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return "[truncated]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message),
      ...(process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test"
        ? {}
        : { stack: value.stack ? redactString(value.stack) : undefined }),
    };
  }

  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitize(item, depth + 1));

  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value).slice(0, 30)) {
      output[key] = SENSITIVE_KEY.test(key) ? "[redacted]" : sanitize(item, depth + 1);
    }
    return output;
  }

  return redactString(String(value));
}

function emit(level: LogLevel, message: string, context?: unknown) {
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[configuredLevel()]) return;

  const payload = {
    level,
    time: new Date().toISOString(),
    msg: redactString(message),
    ...(context === undefined ? {} : { context: sanitize(context) }),
  };

  if (process.env.NODE_ENV === "production") {
    // eslint-disable-next-line no-console
    console[level](JSON.stringify(payload));
    return;
  }

  // eslint-disable-next-line no-console
  console[level](`[${level}] ${payload.msg}`, payload.context ?? "");
}

export const logger = {
  debug: (message: string, context?: unknown) => emit("debug", message, context),
  info: (message: string, context?: unknown) => emit("info", message, context),
  warn: (message: string, context?: unknown) => emit("warn", message, context),
  error: (message: string, context?: unknown) => emit("error", message, context),
};
