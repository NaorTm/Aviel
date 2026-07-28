import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("creates, edits, autosaves and reopens a Hebrew quotation", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(
    page.getByRole("heading", { name: "בוקר טוב, מתחילים הצעה חדשה?" }),
  ).toBeVisible({ timeout: 15_000 });
  await page
    .getByRole("button", { name: "יצירת פרויקט חדש", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "פרויקט חדש" })).toBeVisible();
  await page.getByLabel("שם הפרויקט").fill("בית משפחת לוי");
  const firstRow = page
    .getByRole("row")
    .filter({ hasText: "התקנת צנרת חשמל תקנית" });
  await firstRow.getByLabel("כמות").fill("5");
  await expect(page.getByText("כל השינויים נשמרו")).toBeVisible({
    timeout: 5_000,
  });
  await page.getByRole("button", { name: "פרויקטים" }).click();
  await page.getByRole("button", { name: "בית משפחת לוי" }).click();
  await expect(page.getByLabel("שם הפרויקט")).toHaveValue("בית משפחת לוי");
  await expect(firstRow.getByLabel("כמות")).toHaveValue("5");
});

test("dashboard has no serious automated accessibility violations", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("navigation", { name: "ניווט ראשי" }),
  ).toBeVisible();
  const results = await new AxeBuilder({ page })
    .disableRules(["color-contrast"])
    .analyze();
  expect(
    results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);
});

test("keeps the application usable at a compact tablet width", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 1_000 });
  await page.goto("/");

  const sidebar = page.locator(".sidebar");
  await expect(sidebar).toBeVisible();
  expect((await sidebar.boundingBox())?.width).toBeLessThanOrEqual(70);

  await page.locator("nav button").nth(4).click();
  await expect(page.locator(".settings-grid")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
});
