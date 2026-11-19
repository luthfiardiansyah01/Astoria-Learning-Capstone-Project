import { expect, test } from "@playwright/test";
import { E2E_USERS, login } from "./helpers";

test("login di perangkat baru mengakhiri sesi lama", async ({ browser }) => {
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await login(pageA, E2E_USERS.student);
  await pageA.goto("/");
  await expect(pageA.getByText(/Sapaan Mentor/)).toBeVisible();

  const before = await pageA.evaluate(async () =>
    (await (await fetch("/api/session/status")).json()) as { valid: boolean }
  );
  expect(before.valid).toBe(true);

  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await login(pageB, E2E_USERS.student);
  await pageB.goto("/");

  const after = await pageA.evaluate(async () =>
    (await (await fetch("/api/session/status")).json()) as { valid: boolean }
  );
  expect(after.valid).toBe(false);

  await pageA.evaluate(() => window.dispatchEvent(new Event("sobat:session-check")));
  await expect(pageA.getByText("Akun ini aktif di perangkat lain")).toBeVisible();

  const profileStatus = await pageA.evaluate(async () => (await fetch("/api/profile")).status);
  expect(profileStatus).toBe(401);

  await ctxA.close();
  await ctxB.close();
});
