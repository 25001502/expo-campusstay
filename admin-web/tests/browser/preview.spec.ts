import { expect, test } from "@playwright/test";
import {
  confirmationItems,
  previewDecisionNotice,
} from "../../src/lib/review-safety";

const firstCase = "/admin/applications/10000000-0000-4000-8000-000000000001";
const validReason =
  "The example authority declaration matches the supplied business details.";
test("approval checklist, reason errors, keyboard cancellation and decision lock", async ({
  page,
}) => {
  const external: string[] = [];
  const mutations: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).hostname !== "127.0.0.1")
      external.push(request.url());
    if (!["GET", "HEAD"].includes(request.method()))
      mutations.push(request.method());
  });
  await page.goto(firstCase);
  const approve = page.getByRole("button", { name: "Preview approve" });
  for (const item of confirmationItems)
    await expect(
      page.getByRole("checkbox", { name: item.label }),
    ).not.toBeChecked();
  await approve.click();
  await expect(page.locator("#review-reason")).toBeFocused();
  await expect(page.locator("#review-reason")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.getByRole("dialog")).not.toBeVisible();
  for (const text of [
    "good",
    "okay",
    "approved",
    "a".repeat(40),
    "good ".repeat(8),
  ]) {
    await page.locator("#review-reason").fill(text);
    await approve.click();
    await expect(page.locator("#reason-error")).not.toHaveText("");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  }
  await page.locator("#review-reason").fill(validReason);
  await approve.click();
  await expect(page.locator("#checklist-error")).toContainText("all three");
  await expect(page.getByRole("checkbox").first()).toBeFocused();
  // Native checkboxes remain operable with Space and Tab, not pointer-only controls.
  for (let index = 0; index < 3; index++) {
    await page.keyboard.press("Space");
    await expect(page.getByRole("checkbox").nth(index)).toBeChecked();
    await page.keyboard.press("Tab");
  }
  await expect(page.locator("#reason-help")).toContainText("applicant-visible");
  await approve.click();
  const modal = page.getByRole("dialog");
  await expect(modal).toBeVisible();
  for (const text of [
    "Naledi Mokoena",
    "Oak House Student Living",
    "Approved",
    "Real approval would grant Manager Workspace access",
    previewDecisionNotice,
    validReason,
  ])
    await expect(modal).toContainText(text);
  for (const item of confirmationItems)
    await expect(modal).toContainText(`${item.label}: Confirmed for preview`);
  await expect(
    modal.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(modal).not.toBeVisible();
  await expect(approve).toBeFocused();
  await expect(page.locator(".application-heading .badge")).toHaveText(
    "Pending",
  );
  await approve.click();
  await modal.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator(".application-heading .badge")).toHaveText(
    "Pending",
  );
  await approve.click();
  await modal.getByRole("button", { name: "Confirm preview decision" }).click();
  await expect(page.locator(".application-heading .badge")).toHaveText(
    "Approved",
  );
  await expect(approve).toBeDisabled();
  await expect(page.locator(".decision-panel .feedback")).toBeFocused();
  await expect(page.locator("#review-reason")).toBeDisabled();
  for (const checkbox of await page.getByRole("checkbox").all())
    await expect(checkbox).toBeDisabled();
  await page
    .getByRole("link", { name: "Back to manager applications" })
    .click();
  await page
    .getByRole("link", { name: "View Naledi Mokoena application" })
    .click();
  await expect(approve).toBeDisabled();
  await page.reload();
  await expect(page.locator(".application-heading .badge")).toHaveText(
    "Pending",
  );
  expect(external).toEqual([]);
  expect(mutations).toEqual([]);
});
test("confirmations do not leak between records and rejection needs no approval checklist", async ({
  page,
}) => {
  await page.goto(firstCase);
  await page.getByRole("checkbox").first().check();
  await page.locator("#review-reason").fill(validReason);
  await page
    .getByRole("link", { name: "Back to manager applications" })
    .click();
  await page
    .getByRole("link", { name: "View Thabo Nkosi application" })
    .click();
  for (const checkbox of await page.getByRole("checkbox").all())
    await expect(checkbox).not.toBeChecked();
  await expect(page.locator("#review-reason")).toHaveValue("");
  await page
    .locator("#review-reason")
    .fill("The example declaration does not establish management authority.");
  await page.getByRole("button", { name: "Preview reject" }).click();
  await expect(page.getByRole("dialog")).toContainText("Rejected");
  await page.getByRole("button", { name: "Confirm preview decision" }).click();
  await expect(page.locator(".application-heading .badge")).toHaveText(
    "Rejected",
  );
  await page
    .getByRole("link", { name: "Back to manager applications" })
    .click();
  await expect(
    page.getByRole("row").filter({ hasText: "Naledi Mokoena" }),
  ).toContainText("Pending");
  await page
    .getByRole("link", { name: "View Naledi Mokoena application" })
    .click();
  for (const checkbox of await page.getByRole("checkbox").all())
    await expect(checkbox).not.toBeChecked();
});
for (const width of [320, 390, 1440])
  for (const scale of [100, 130, 200])
    test(`approval dialog ${width}px at ${scale}% text`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(firstCase);
      await expect(
        page.getByRole("heading", { name: "Naledi Mokoena" }),
      ).toBeVisible();
      await page.addStyleTag({ content: `:root { font-size: ${scale}% }` });
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(() =>
          parseFloat(getComputedStyle(document.documentElement).fontSize),
        ),
      ).toBeCloseTo((16 * scale) / 100, 1);
      const pageWidthBeforeDialog = await page.evaluate(
        () => document.documentElement.scrollWidth,
      );
      expect(
        await page
          .locator(".review-checklist")
          .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      ).toBe(true);
      for (const checkbox of await page.getByRole("checkbox").all())
        await checkbox.check();
      await page.locator("#review-reason").fill(validReason);
      await page.getByRole("button", { name: "Preview approve" }).click();
      const modal = page.getByRole("dialog");
      await expect(modal).toBeVisible();
      expect(
        await modal.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      ).toBe(true);
      expect(
        await modal.evaluate((el) => {
          const box = el.getBoundingClientRect();
          return (
            box.left >= 0 &&
            box.right <= innerWidth &&
            box.top >= 0 &&
            box.bottom <= innerHeight
          );
        }),
      ).toBe(true);
      // The existing detail-page header can overflow at wide 200% text. The
      // focused review enhancement must not introduce additional page overflow.
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(pageWidthBeforeDialog);
      await modal
        .getByRole("button", { name: "Confirm preview decision" })
        .scrollIntoViewIfNeeded();
      await expect(
        modal.getByRole("button", { name: "Confirm preview decision" }),
      ).toBeInViewport();
      await page.screenshot({
        path: `test-results/approval-${width}-${scale}.png`,
        fullPage: true,
      });
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("button", { name: "Preview approve" }),
      ).toBeFocused();
    });
test("desktop navigation, search, filters, review and notes stay local", async ({
  page,
}) => {
  const external: string[] = [];
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== "127.0.0.1") {
      external.push(url.origin);
      return route.abort();
    }
    return route.continue();
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Overview", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/overview-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(
    page.getByRole("link", { name: "Manager Applications", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Expand sidebar" }).click();
  await page
    .getByRole("link", { name: "Manager Applications", exact: true })
    .click();
  await page
    .getByRole("searchbox", { name: "Search manager applications" })
    .fill("oak");
  await expect(page.getByRole("status")).toContainText("1 of 8");
  await page
    .getByRole("link", { name: "View Naledi Mokoena application" })
    .click();
  await page.getByRole("button", { name: "Preview approve" }).click();
  await expect(page.locator("#reason-error")).toContainText(
    "Enter a review reason",
  );
  await page.screenshot({
    path: "test-results/application-desktop.png",
    fullPage: true,
  });
  await page.getByLabel("Internal preview note").fill("A local reviewer note");
  await page.getByRole("button", { name: "Keep note in preview" }).click();
  await page
    .getByLabel("Review reason", { exact: false })
    .fill("Please clarify authority in this example.");
  await page
    .getByRole("button", { name: "Preview request information" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Preview request information" }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Preview request information" })
    .click();
  await page.getByRole("button", { name: "Confirm preview decision" }).click();
  await expect(page.locator(".application-heading .badge")).toHaveText(
    "Needs information",
  );
  await page
    .getByRole("link", { name: "Back to manager applications" })
    .click();
  await expect(
    page.getByRole("row").filter({ hasText: "Naledi Mokoena" }),
  ).toContainText("Needs information");
  await expect(
    page.getByRole("row").filter({ hasText: "Thabo Nkosi" }),
  ).toContainText("Pending");
  await page
    .getByRole("link", { name: "View Naledi Mokoena application" })
    .click();
  await expect(page.getByLabel("Internal preview note")).toHaveValue(
    "A local reviewer note",
  );
  await page.reload();
  await expect(page.locator(".application-heading .badge")).toHaveText(
    "Pending",
  );
  for (const label of [
    "Property Reviews",
    "Users & Managers",
    "Audit Logs",
    "Settings",
  ]) {
    await page.getByRole("link", { name: label, exact: true }).click();
    await expect(
      page.getByRole("heading", { name: label, exact: true }),
    ).toBeVisible();
  }
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
    })),
  ).toEqual({ local: 0, session: 0 });
});
for (const width of [320, 390, 768, 1440])
  for (const scale of [100, 130, 200])
    test(`responsive navigation ${width}px at ${scale}% text`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/admin");
      await expect(
        page.getByRole("heading", { name: "Overview", exact: true }),
      ).toBeVisible();
      await page.addStyleTag({ content: `:root { font-size: ${scale}% }` });
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(() =>
          parseFloat(getComputedStyle(document.documentElement).fontSize),
        ),
      ).toBeCloseTo((16 * scale) / 100, 1);
      if (width <= 850) {
        await page.getByRole("button", { name: "Open navigation" }).click();
        await expect(
          page.getByRole("dialog", { name: "Mobile navigation" }),
        ).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(
          page.getByRole("dialog", { name: "Mobile navigation" }),
        ).toHaveCount(0);
        await expect(
          page.getByRole("button", { name: "Open navigation" }),
        ).toBeFocused();
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/overview-${width}-${scale}.png`,
        fullPage: true,
      });
      await page.goto("/admin/applications");
      await page.addStyleTag({ content: `:root { font-size: ${scale}% }` });
      expect(
        await page.evaluate(() =>
          parseFloat(getComputedStyle(document.documentElement).fontSize),
        ),
      ).toBeCloseTo((16 * scale) / 100, 1);
      await expect(
        page.getByRole("searchbox", { name: "Search manager applications" }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
      ).toBe(true);
    });
test("empty results and missing applications recover accessibly", async ({
  page,
}) => {
  await page.goto("/admin/applications");
  await page.getByRole("searchbox").fill("zzzzzz");
  await expect(
    page.getByRole("heading", { name: "No applications found" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByRole("status")).toContainText("8 of 8");
  await page.goto("/admin/applications/missing");
  await expect(
    page.getByRole("heading", { name: "Application not found" }),
  ).toBeVisible();
});
for (const path of [
  "/admin/applications/10000000-0000-4000-8000-000000000001",
  "/admin/properties",
  "/admin/users",
  "/admin/audit",
  "/admin/settings",
  "/sign-in",
])
  test(`phone layout at 200% text: ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.addStyleTag({ content: ":root { font-size: 200% }" });
    expect(
      await page.evaluate(() =>
        parseFloat(getComputedStyle(document.documentElement).fontSize),
      ),
    ).toBe(32);
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/phone-${path.split("/").at(-1)}-200.png`,
      fullPage: true,
    });
  });
