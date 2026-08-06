import { expect, test } from "@playwright/test";

test("main journey: pick country, cook, recipe, dine search", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /where in the world will you eat today/i,
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: /spin the spoon/i }).click();
  await expect(page.getByRole("button", { name: "Cook" })).toBeVisible({
    timeout: 10_000,
  });

  await page.getByRole("button", { name: "Cook" }).click();
  await expect(
    page.getByRole("heading", { name: /tonight's menu/i }),
  ).toBeVisible();

  await page
    .locator("section[aria-labelledby='menu-heading'] button")
    .first()
    .click();
  await expect(page.getByRole("button", { name: /back to menu/i })).toBeVisible();
  await page.getByRole("button", { name: /back to menu/i }).click();

  await page.getByRole("button", { name: "Dine" }).click();
  await expect(
    page.getByRole("heading", { name: /dine in the netherlands/i }),
  ).toBeVisible();

  await page.getByLabel(/city or postcode/i).fill("Amsterdam");
  await page.getByRole("button", { name: /search restaurants/i }).click();

  await expect(
    page
      .getByText(
        /no local restaurants|no restaurant provider|google places|mapbox|restaurants|google maps/i,
      )
      .first(),
  ).toBeVisible({ timeout: 10_000 });
});
