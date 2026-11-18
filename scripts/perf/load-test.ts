// Uji beban sederhana: RPS + latensi pada endpoint publik.
// Jalankan: bun scripts/perf/load-test.ts
// Env: LOAD_URL, LOAD_CONCURRENCY (default 10), LOAD_DURATION_MS (default 10000).
const BASE = process.env.BENCH_BASE ?? "http://127.0.0.1:3200";
const URL = process.env.LOAD_URL ?? `${BASE}/produk`;
const CONCURRENCY = Number(process.env.LOAD_CONCURRENCY ?? 10);
const DURATION_MS = Number(process.env.LOAD_DURATION_MS ?? 10_000);

const times: number[] = [];
let completed = 0;
let errors = 0;
const deadline = Date.now() + DURATION_MS;

async function worker() {
  while (Date.now() < deadline) {
    const start = performance.now();
    try {
      const res = await fetch(URL);
      await res.text();
      if (!res.ok) errors += 1;
    } catch {
      errors += 1;
    } finally {
      times.push(performance.now() - start);
      completed += 1;
    }
  }
}

function pct(sorted: number[], p: number) {
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

const started = Date.now();
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
const elapsed = (Date.now() - started) / 1000;
const sorted = [...times].sort((a, b) => a - b);

console.log(
  JSON.stringify(
    {
      url: URL,
      concurrency: CONCURRENCY,
      durationSec: Number(elapsed.toFixed(1)),
      requests: completed,
      errors,
      rps: Math.round(completed / elapsed),
      p50: Math.round(pct(sorted, 50)),
      p95: Math.round(pct(sorted, 95)),
      p99: Math.round(pct(sorted, 99)),
      max: Math.round(sorted[sorted.length - 1]),
    },
    null,
    2
  )
);

export {};
