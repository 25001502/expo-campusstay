import { expect, test } from "@playwright/test";
for (const path of [
  "/admin",
  "/admin/applications",
  "/admin/applications/10000000-0000-4000-8000-000000000001",
  "/admin/properties",
  "/admin/properties/property-oak",
  "/admin/properties/property-hillcrest",
  "/admin/properties/missing",
  "/admin/users",
  "/admin/audit",
  "/admin/settings",
  "/admin/unknown",
])
  test(`production denies ${path}`, async ({ page }) => {
    const response = await page.goto(`${path}?ADMIN_MOCK_MODE=1`);
    expect(response?.status()).toBe(403);
    await expect(
      page.getByRole("heading", { name: "Administrator access unavailable" }),
    ).toBeVisible();
    await expect(page.getByText("Naledi Mokoena")).toHaveCount(0);
    expect(response?.headers()["cache-control"]).toContain("no-store");
  });
test("production sign-in collects no credentials and grants no access", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await expect(page.getByLabel("Email address")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Sign-in unavailable" }),
  ).toBeDisabled();
});

test("forged session cookies and browser role headers cannot unlock production", async ({ request }) => {
  const response = await request.get("/admin?role=administrator&aal=aal2", {
    headers: { Cookie: "__Host-cs-admin-auth=forged; ADMIN_MOCK_MODE=1", "X-Admin": "true" },
  });
  expect(response.status()).toBe(403);
  expect(await response.text()).not.toContain("Naledi Mokoena");
});

test("all auth operations and callbacks remain disconnected with no reflection or cookies", async ({ request }) => {
  for (const action of ["sign-in", "recovery", "mfa", "sign-out", "callback", "unknown"]) {
    for (const method of ["GET", "POST"]) {
      const response = await request.fetch(`/auth/${action}?code=synthetic_sensitive_marker&next=https://attacker.test`, {
        method,
        ...(method === "POST" ? { data: { email: "synthetic@example.test", password: "synthetic_sensitive_marker", role: "administrator" } } : {}),
      });
      expect(response.status()).toBe(503);
      expect(await response.json()).toEqual({ ok: false, code: "unavailable" });
      expect(response.headers()["cache-control"]).toContain("no-store");
      expect(response.headers()["set-cookie"]).toBeUndefined();
      expect(response.headers()["location"]).toBeUndefined();
    }
  }
});

for (const width of [320, 390, 768, 1440]) for (const scale of [1, 2]) {
  test(`auth views fit ${width}px at ${scale * 100}% text without enabling credentials`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const external: string[] = [];
    page.on("request", r => { if (new URL(r.url()).hostname !== "127.0.0.1") external.push(r.url()); });
    for (const view of ["sign-in", "recovery", "mfa", "expired", "sign-out"]) {
      const response = await page.goto(`/sign-in?view=${view}`);
      await page.evaluate(s => { document.documentElement.style.fontSize = `${s * 100}%`; }, scale);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByRole("status")).toContainText("Account access unavailable");
      for (const field of await page.locator("input, button").all()) await expect(field).toBeDisabled();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      expect(await page.locator(".auth-notice > div").evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      expect(response?.headers()["cache-control"]).toContain("no-store");
      if (view === "sign-in") await page.screenshot({ path: `test-results/auth-${width}-${scale}.png`, fullPage: true });
    }
    expect(external).toEqual([]);
    await page.goto("/sign-in?view=%3Cscript%3Eforged%3C/script%3E&is_admin=true");
    await expect(page.getByRole("heading", { name: "Admin sign in" })).toBeVisible();
  });
}

test("recovery navigation is keyboard accessible; browser receives presentation only", async ({ page, request }) => {
  await page.goto("/sign-in");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Forgot password?" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
  await page.getByRole("link", { name: "Back to sign in" }).click();
  await expect(page.getByRole("heading", { name: "Admin sign in" })).toBeVisible();
  for (const src of await page.locator("script[src]").evaluateAll(scripts => scripts.map(s => s.getAttribute("src")))) {
    if (!src) continue;
    const content = await (await request.get(src)).text();
    expect(content).not.toMatch(/sb_secret_|SUPABASE_SERVICE_ROLE_KEY|createAuthFlows|createCookieBridge|resolveAccess|private token details/);
  }
  expect(await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }))).toEqual({ local: [], session: [] });
});
