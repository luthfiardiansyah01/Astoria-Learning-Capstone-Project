// Sampel TTFB produksi (read-only). Jalankan: bun scripts/perf/bench-prod.ts
const BASE = process.env.PROD_BASE ?? "https://astoria-learning-capstone-project.vercel.app";
const URLS = ["/login", "/produk", "/legal/kebijakan-privasi"];
const N = Number(process.env.BENCH_ITER ?? 10);

function pct(sorted: number[], p: number) {
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

async function sample(path: string) {
  const times: number[] = [];
  let bytes = 0;
  let status = 0;
  for (let i = 0; i < N; i++) {
    const start = performance.now();
    const res = await fetch(`${BASE}${path}`);
    const text = await res.text();
    times.push(performance.now() - start);
    status = res.status;
    bytes = text.length;
  }
  const s = [...times].sort((a, b) => a - b);
  console.log(
    `${path.padEnd(28)} status=${status} p50=${Math.round(pct(s, 50))}ms p95=${Math.round(
      pct(s, 95)
    )}ms min=${Math.round(s[0])}ms max=${Math.round(s[s.length - 1])}ms bytes=${bytes}`
  );
}

for (const url of URLS) await sample(url);

export {};
