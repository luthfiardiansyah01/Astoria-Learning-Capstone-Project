import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFileSync } from "node:fs";
import { E2E_USERS, login } from "./helpers";

type PageReport = {
  page: string;
  url: string;
  violations: {
    id: string;
    impact: string | null;
    help: string;
    nodes: number;
    details: { target: string[]; html: string; failure: string }[];
  }[];
};

test("audit aksesibilitas WCAG 2.2 AA", async ({ page }) => {
  const report: PageReport[] = [];

  async function scan(name: string) {
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    report.push({
      page: name,
      url: page.url(),
      violations: results.violations.map((v) => ({
        id: v.id,
        impact: v.impact ?? null,
        help: v.help,
        nodes: v.nodes.length,
        details: v.nodes.map((n) => ({
          target: n.target.map((t) => String(t)),
          html: (n.html ?? "").slice(0, 240),
          failure: (n.failureSummary ?? "").replace(/\n/g, " ").slice(0, 400),
        })),
      })),
    });
  }

  await page.goto("/login");
  await scan("Login");

  // Nama aksesibilitas yang dihitung browser (dipakai TalkBack/NVDA).
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Masuk", exact: true })).toBeVisible();

  await login(page, E2E_USERS.student);
  await scan("Beranda (desktop)");

  await page.setViewportSize({ width: 375, height: 812 });
  await scan("Beranda (mobile 375)");
  await page.setViewportSize({ width: 1280, height: 800 });

  for (const [key, name] of [
    ["mentor", "Mentor AI"],
    ["unggah", "Unggah"],
    ["kuis", "Kuis"],
  ] as const) {
    await page.locator(`[data-testid="nav-${key}"]:visible`).click();
    await page.waitForTimeout(300);
    await scan(name);
  }

  for (const [path, name] of [
    ["/collab", "Collab"],
    ["/akun", "Akun"],
    ["/legal/aksesibilitas", "Pernyataan Aksesibilitas"],
    ["/legal/kebijakan-privasi", "Kebijakan Privasi"],
  ] as const) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1")).toBeVisible();
    await scan(name);
  }

  writeFileSync("docs/a11y-audit.json", JSON.stringify(report, null, 2), "utf8");

  for (const item of report) {
    const total = item.violations.reduce((sum, v) => sum + v.nodes, 0);
    console.log(`\n[${item.page}] ${item.violations.length} jenis, ${total} node`);
    for (const v of item.violations) {
      console.log(`  - ${v.impact}: ${v.id} (${v.nodes}) ${v.help}`);
    }
  }
});
