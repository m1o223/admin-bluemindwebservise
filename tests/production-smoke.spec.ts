import { expect, test } from "@playwright/test";

test("production login renders without an authenticated session", async ({ page }) => {
  test.skip(!process.env.PLAYWRIGHT_BASE_URL, "Production-only check without API fixtures");
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Sign In", exact: true })).toBeVisible({ timeout: 45000 });
  await expect(page.getByRole("navigation", { name: "Admin navigation" })).toHaveCount(0);
  await page.screenshot({ path: "test-results/production-login.png" });
  expect(errors).toEqual([]);
});
