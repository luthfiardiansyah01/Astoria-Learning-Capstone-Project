// Benchmark HTTP baseline terhadap server lokal.
// Prasyarat: `bun run build` lalu jalankan server dengan DATABASE_URL database uji:
//   bunx next start -p 3200
// Jalankan: bun scripts/perf/bench-http.ts

const BASE = process.env.BENCH_BASE ?? "http://127.0.0.1:3200";
const EMAIL = process.env.BENCH_ADMIN_EMAIL ?? "bench-admin@test.local";
const PASSWORD = process.env.BENCH_ADMIN_PASSWORD ?? "bench-pass-123";
const ITER = Number(process.env.BENCH_ITER ?? 30);

type Jar = Map<string, string>;
const jar: Jar = new Map();
const cookieHeader = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");

function absorb(res: Response) {
  const cookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  for (const c of cookies) {
    const [pair] = c.split(";");
    const i = pair.indexOf("=");
    if (i > 0) jar.set(pair.slice(0, i), pair.slice(i + 1));
  }
}

async function login() {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  absorb(csrfRes);
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: cookieHeader() },
    body: new URLSearchParams({ csrfToken, email: EMAIL, password: PASSWORD, json: "true" }).toString(),
  });
  absorb(res);

  const session = await fetch(`${BASE}/api/auth/session`, { headers: { cookie: cookieHeader() } });
  const body = (await session.json()) as { user?: { email?: string } };
  if (body?.user?.email !== EMAIL) throw new Error(`Login gagal: ${JSON.stringify(body)}`);
}

function pct(sorted: number[], p: number) {
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

async function bench(name: string, path: string) {
  for (let i = 0; i < 3; i++) {
    await fetch(`${BASE}${path}`, { headers: { cookie: cookieHeader() } }).then((r) => r.text());
  }
  const times: number[] = [];
  let bytes = 0;
  let status = 0;
  for (let i = 0; i < ITER; i++) {
    const start = performance.now();
    const res = await fetch(`${BASE}${path}`, { headers: { cookie: cookieHeader() } });
    const text = await res.text();
    times.push(performance.now() - start);
    status = res.status;
    bytes = text.length;
  }
  const s = [...times].sort((a, b) => a - b);
  console.log(
    `${name.padEnd(34)} status=${status} p50=${Math.round(pct(s, 50))}ms p95=${Math.round(
      pct(s, 95)
    )}ms max=${Math.round(s[s.length - 1])}ms bytes=${bytes}`
  );
}

async function main() {
  const cold = performance.now();
  await fetch(`${BASE}/login`).then((r) => r.text());
  console.log(`first_request_login=${Math.round(performance.now() - cold)}ms\n`);

  await login();
  await bench("GET /login", "/login");
  await bench("GET /produk", "/produk");
  await bench("GET /api/plan", "/api/plan");
  await bench("GET /api/documents", "/api/documents");
  await bench("GET /api/collab/teams", "/api/collab/teams");
  await bench("GET /api/collab/leaderboard", "/api/collab/teams/leaderboard");
  await bench("GET /api/admin/users?page=1", "/api/admin/users?page=1");
  await bench("GET /api/admin/analytics", "/api/admin/analytics");
  await bench("GET /api/admin/payments", "/api/admin/payments");

  const payload = await fetch(`${BASE}/api/collab/teams`, { headers: { cookie: cookieHeader() } });
  const teams = (await payload.json()) as {
    teams?: Array<{ projects?: Array<{ id: string }> }>;
  };
  const projectId = teams.teams?.[0]?.projects?.[0]?.id;
  if (projectId) {
    await bench("GET project detail", `/api/collab/projects/${projectId}`);
    await bench("GET project activity", `/api/collab/projects/${projectId}/activity`);
  }
  await bench("GET /collab (page)", "/collab");
  await bench("GET /api/collab/analytics", "/api/collab/analytics");
}

await main();

export {};
