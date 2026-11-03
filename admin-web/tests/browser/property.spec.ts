import { expect, test } from "@playwright/test";
import { propertyChecklistItems } from "../../src/lib/property-contracts";
import { propertyPreviewNotice } from "../../src/lib/property-review";

const path = (id = "property-hillcrest") => `/admin/properties/${id}`;
const reason =
  "The synthetic listing details meet the illustrative property review criteria.";
test("property cards retain browsing and combine search with both filters", async ({
  page,
}) => {
  await page.goto("/admin/properties");
  await expect(page.getByRole("status")).toContainText(
    "6 of 6 synthetic properties",
  );
  await page
    .getByRole("searchbox", { name: "Search property reviews" })
    .fill("  PRETORIA  ");
  await expect(page.locator(".property-card")).toHaveCount(1);
  await expect(page.locator(".property-card")).toContainText(
    "24 declared rooms",
  );
  await expect(page.locator(".property-card")).toContainText("2 200");
  await page.getByRole("searchbox").fill("");
  await page
    .getByRole("combobox", { name: "Listing status", exact: true })
    .selectOption("awaiting_review");
  await page
    .getByRole("combobox", {
      name: "Manager verification / access",
      exact: true,
    })
    .selectOption("approved");
  await expect(page.locator(".property-card")).toHaveCount(1);
  await page
    .getByRole("link", { name: "View Hillcrest House property details" })
    .click();
  await expect(page).toHaveURL(new RegExp(path() + "$"));
  await expect(
    page.getByRole("heading", { name: "Hillcrest House", exact: true }),
  ).toBeVisible();
  for (const heading of [
    "Property overview",
    "Manager verification",
    "Declared room types",
    "Amenities and facilities",
    "Listing review history",
  ])
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
  await expect(page.locator(".review-room-card")).toHaveCount(2);
  await expect(page.locator(".review-amenities li")).toHaveCount(9);
  await page
    .getByRole("link", { name: "Back to Property Reviews", exact: true })
    .click();
  await page.getByRole("searchbox").fill("does not exist");
  await expect(
    page.getByRole("heading", { name: "No properties found" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear property filters" }).click();
  await expect(page.locator(".property-card")).toHaveCount(6);
});
test("gallery thumbnails, full-image preview, keyboard navigation and focus return", async ({
  page,
}) => {
  await page.goto(path());
  const gallery = page.getByRole("group", {
    name: "Property photo gallery",
    exact: true,
  });
  await gallery
    .getByRole("button", { name: "Select image 2:", exact: false })
    .click();
  await expect(
    gallery.getByRole("button", { name: "Select image 2:", exact: false }),
  ).toHaveAttribute("aria-pressed", "true");
  const open = gallery.locator(".gallery-stage");
  await open.click();
  const modal = page.getByRole("dialog", {
    name: "Property photo gallery",
    exact: true,
  });
  await expect(modal).toBeVisible();
  await expect(
    modal.getByRole("button", { name: "Close image preview" }),
  ).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(modal).toContainText("Image 3 of 3");
  await modal.getByRole("button", { name: "Previous image" }).click();
  await expect(modal).toContainText("Image 2 of 3");
  await page.keyboard.press("Escape");
  await expect(modal).not.toBeVisible();
  await expect(open).toBeFocused();
  await expect(gallery.locator("img").first()).toHaveAttribute(
    "alt",
    /Synthetic single-room/,
  );
});
test("approval requires valid feedback and all confirmations, cancels safely then locks locally", async ({
  page,
}) => {
  const external: string[] = [],
    mutations: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).hostname !== "127.0.0.1")
      external.push(request.url());
    if (!["GET", "HEAD"].includes(request.method()))
      mutations.push(request.method());
  });
  await page.goto(path());
  const approve = page.getByRole("button", {
    name: "Preview approve listing",
    exact: true,
  });
  const status = page.locator(".property-heading > .badge");
  await expect(status).toHaveText("Awaiting review");
  for (const checkbox of await page.getByRole("checkbox").all())
    await expect(checkbox).not.toBeChecked();
  await approve.click();
  await expect(page.locator("#property-reason")).toBeFocused();
  for (const text of ["good", "okay", "a".repeat(40), "good ".repeat(10)]) {
    await page.locator("#property-reason").fill(text);
    await approve.click();
    await expect(page.locator("#property-reason-error")).not.toHaveText("");
    await expect(
      page.getByRole("dialog", { name: "Preview this listing decision?" }),
    ).not.toBeVisible();
  }
  await page.locator("#property-reason").fill(reason);
  await approve.click();
  await expect(page.locator("#property-check-error")).toContainText("all six");
  await expect(page.getByRole("checkbox").first()).toBeFocused();
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Space");
    await expect(page.getByRole("checkbox").nth(i)).toBeChecked();
    await page.keyboard.press("Tab");
  }
  await page
    .getByLabel("Internal preview note", { exact: true })
    .fill("Internal observation, separate from manager feedback.");
  await page
    .getByRole("button", { name: "Keep property note in preview" })
    .click();
  await approve.click();
  const modal = page.getByRole("dialog", {
    name: "Preview this listing decision?",
  });
  for (const text of [
    "Hillcrest House",
    "Lerato Molefe",
    "Approved in preview",
    reason,
    propertyPreviewNotice,
    "active, trusted server-authorised manager access",
  ])
    await expect(modal).toContainText(text);
  for (const item of propertyChecklistItems)
    await expect(modal).toContainText(`${item.label}: Confirmed for preview`);
  await expect(modal).not.toContainText("Internal observation");
  await modal.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(status).toHaveText("Awaiting review");
  await expect(approve).toBeFocused();
  await approve.click();
  await page.keyboard.press("Escape");
  await expect(status).toHaveText("Awaiting review");
  await approve.click();
  await modal.getByRole("button", { name: "Confirm listing preview" }).click();
  await expect(status).toHaveText("Approved in preview");
  await expect(approve).toBeDisabled();
  await expect(
    page.locator(".property-decision-panel > .feedback"),
  ).toBeFocused();
  await expect(
    page.getByLabel("Internal preview note", { exact: true }),
  ).toHaveValue("Internal observation, separate from manager feedback.");
  await expect(page.locator(".timeline")).toContainText(reason);
  await expect(page.locator(".timeline")).toContainText(
    "Session preview decision",
  );
  await page
    .getByRole("link", { name: "Back to Property Reviews", exact: true })
    .click();
  await expect(
    page.locator(".property-card").filter({ hasText: "Hillcrest House" }),
  ).toContainText("Approved in preview");
  await expect(
    page
      .locator(".property-card")
      .filter({ hasText: "Oak House Student Living" }),
  ).toContainText("Awaiting review");
  await page
    .getByRole("link", { name: "View Hillcrest House property details" })
    .click();
  await expect(approve).toBeDisabled();
  await page.reload();
  await expect(status).toHaveText("Awaiting review");
  for (const checkbox of await page.getByRole("checkbox").all())
    await expect(checkbox).not.toBeChecked();
  expect(external).toEqual([]);
  expect(mutations).toEqual([]);
  expect(
    await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
    })),
  ).toEqual({ local: 0, session: 0 });
});
for (const [id, label] of [
  ["property-oak", "Pending verification"],
  ["property-courtyard", "Suspended"],
  ["property-gardens", "Revoked"],
  ["property-west-end", "Rejected"],
])
  test(`${label} manager cannot approve a property`, async ({ page }) => {
    await page.goto(path(id));
    await expect(
      page.locator(".detail-secondary > section").first(),
    ).toContainText(label);
    await expect(
      page.getByRole("button", {
        name: "Preview approve listing",
        exact: true,
      }),
    ).toBeDisabled();
    await expect(page.locator("#property-approval-block")).toContainText(
      "approved verification and active manager authorisation",
    );
    await expect(
      page.getByRole("button", { name: "Preview request changes" }),
    ).toBeEnabled();
    if (id === "property-gardens")
      await expect(
        page.getByRole("heading", { name: "No sample images available" }),
      ).toBeVisible();
  });
for (const [action, expected] of [
  ["Preview request changes", "Changes requested in preview"],
  ["Preview reject listing", "Rejected in preview"],
])
  test(`${action} works without approval checks and stays separate from internal notes`, async ({
    page,
  }) => {
    await page.goto(path("property-oak"));
    await page
      .locator("#property-reason")
      .fill(
        "Please clarify the declared room prices and address details before another review.",
      );
    await page.getByRole("button", { name: action, exact: true }).click();
    await expect(
      page.getByRole("dialog", { name: "Preview this listing decision?" }),
    ).toContainText("not required for this action");
    await page.getByRole("button", { name: "Confirm listing preview" }).click();
    await expect(page.locator(".property-heading > .badge")).toHaveText(
      expected,
    );
    await expect(
      page.getByRole("button", { name: action, exact: true }),
    ).toBeDisabled();
    if (action === "Preview request changes") {
      await page.getByRole("link", { name: "Settings", exact: true }).click();
      await page
        .getByRole("button", { name: "Reset synthetic examples" })
        .click();
      await page
        .getByRole("link", { name: "Property Reviews", exact: true })
        .click();
      await page
        .getByRole("link", {
          name: "View Oak House Student Living property details",
        })
        .click();
      await expect(page.locator(".property-heading > .badge")).toHaveText(
        "Awaiting review",
      );
      await expect(
        page.getByLabel("Internal preview note", { exact: true }),
      ).toHaveValue("");
    }
  });
test("manager application approval cannot grant property authorisation or publish its listing", async ({
  page,
}) => {
  await page.goto(path("property-oak"));
  await page
    .getByRole("link", { name: "View manager application", exact: true })
    .click();
  await page
    .locator("#review-reason")
    .fill(
      "The example authority declaration matches the supplied business details.",
    );
  for (const checkbox of await page.getByRole("checkbox").all())
    await checkbox.check();
  await page
    .getByRole("button", { name: "Preview approve", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm preview decision", exact: true })
    .click();
  await expect(page.locator(".application-heading > .badge")).toHaveText(
    "Approved",
  );
  await page
    .getByRole("link", { name: "Property Reviews", exact: true })
    .click();
  await page
    .getByRole("link", {
      name: "View Oak House Student Living property details",
    })
    .click();
  await expect(page.locator(".property-heading > .badge")).toHaveText(
    "Awaiting review",
  );
  await expect(
    page.getByRole("button", { name: "Preview approve listing", exact: true }),
  ).toBeDisabled();
});
test("unknown property recovers and illustrative published example stays locked", async ({
  page,
}) => {
  await page.goto(path("missing"));
  await expect(
    page.getByRole("heading", { name: "Property not found" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Back to Property Reviews", exact: true })
    .click();
  await page
    .getByRole("link", { name: "View Acacia Student Village property details" })
    .click();
  await expect(page.locator(".property-heading > .badge")).toHaveText(
    "Published example",
  );
  await expect(
    page.getByRole("button", { name: "Preview approve listing", exact: true }),
  ).toBeDisabled();
});
test("property checklist drafts do not leak to another record", async ({
  page,
}) => {
  await page.goto(path());
  await page.getByRole("checkbox").first().check();
  await page
    .getByRole("link", { name: "Back to Property Reviews", exact: true })
    .click();
  await page
    .getByRole("link", {
      name: "View Oak House Student Living property details",
    })
    .click();
  for (const checkbox of await page.getByRole("checkbox").all())
    await expect(checkbox).not.toBeChecked();
  await expect(page.locator("#property-reason")).toHaveValue("");
});
for (const width of [320, 390, 768, 1440])
  for (const scale of [100, 130, 200])
    test(`property review layout ${width}px at ${scale}% text`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path());
      await expect(
        page.getByRole("heading", { name: "Hillcrest House", exact: true }),
      ).toBeVisible();
      await page.addStyleTag({ content: `:root { font-size: ${scale}% }` });
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(() =>
          parseFloat(getComputedStyle(document.documentElement).fontSize),
        ),
      ).toBeCloseTo((16 * scale) / 100, 1);
      const pageWidth = await page.evaluate(
        () => document.documentElement.scrollWidth,
      );
      for (const selector of [
        ".property-review-columns",
        ".review-checklist",
        ".review-room-card",
        ".review-amenities",
      ])
        for (const element of await page.locator(selector).all())
          expect(
            await element.evaluate(
              (el) => el.scrollWidth <= el.clientWidth + 1,
            ),
          ).toBe(true);
      if (width <= 768) expect(pageWidth).toBeLessThanOrEqual(width + 1);
      for (const checkbox of await page.getByRole("checkbox").all())
        await checkbox.check();
      await page.locator("#property-reason").fill(reason);
      await page
        .getByRole("button", { name: "Preview approve listing", exact: true })
        .click();
      const modal = page.getByRole("dialog", {
        name: "Preview this listing decision?",
      });
      await expect(modal).toBeVisible();
      expect(
        await modal.evaluate((el) => {
          const box = el.getBoundingClientRect();
          return (
            el.scrollWidth <= el.clientWidth + 1 &&
            box.left >= 0 &&
            box.right <= innerWidth &&
            box.top >= 0 &&
            box.bottom <= innerHeight
          );
        }),
      ).toBe(true);
      await modal
        .getByRole("button", { name: "Confirm listing preview" })
        .scrollIntoViewIfNeeded();
      await expect(
        modal.getByRole("button", { name: "Confirm listing preview" }),
      ).toBeInViewport();
      await page.screenshot({
        path: `test-results/property-${width}-${scale}.png`,
      });
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("button", {
          name: "Preview approve listing",
          exact: true,
        }),
      ).toBeFocused();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(pageWidth);
      await page
        .getByRole("group", { name: "Property photo gallery", exact: true })
        .locator(".gallery-stage")
        .click();
      const gallery = page.getByRole("dialog", {
        name: "Property photo gallery",
        exact: true,
      });
      await expect(gallery).toBeVisible();
      expect(
        await gallery.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      ).toBe(true);
      await page.keyboard.press("Escape");
    });
