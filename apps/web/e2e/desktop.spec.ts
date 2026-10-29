import { expect, test, type Page } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false });

async function noHorizontalScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
}

test("desktop : barre de navigation, étapes et titres sans mots collés", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "Méthode" })).toBeVisible();
  await noHorizontalScroll(page);

  await page.goto("/personnage");
  // Le <br> des titres est masqué sur desktop : l'espace doit rester.
  await expect(page.getByRole("heading", { name: "Qui es-tu en 2027 ?" })).toBeVisible();
  await expect(page.getByText("Ton perso", { exact: true }).first()).toBeVisible();
  await noHorizontalScroll(page);
});
