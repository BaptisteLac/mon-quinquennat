import { expect, test } from "@playwright/test";

test("Méthode : contrôles réels, taux d'erreur mesuré, liens", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Lire la méthode complète" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Comment on\s*calcule ta vie\s*en 2032/);
  await expect(page.getByText(/Chaque mesure publiée a passé \d+ contrôles automatiques/)).toBeVisible();
  await expect(page.getByText("La citation existe mot pour mot dans le programme archivé.")).toBeVisible();
  await expect(page.getByText(/Taux d'erreur mesuré sur \d+ mesures tirées au sort/)).toBeVisible();
  await expect(page.getByText(/^\d+,\d\s%$/).first()).toBeVisible();
  await expect(page.getByText(/le même modèle que celui qui extrait les mesures/)).toBeVisible();
  // Pas de partie en cours : rien à effacer.
  await expect(page.getByRole("button", { name: /Effacer ma partie/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Voir le code source" })).toHaveAttribute("href", "https://github.com/BaptisteLac/mon-quinquennat");
  await page.getByRole("link", { name: "Signaler une erreur" }).first().click();
  await expect(page.getByRole("heading", { name: "Signaler une erreur" })).toBeVisible();
});

test("signalement depuis une fiche mesure", async ({ page, baseURL }) => {
  const outside: string[] = [];
  page.on("request", (r) => !r.url().startsWith(baseURL ?? "") && outside.push(r.url()));
  await page.goto("/");
  await page.locator("a[href^='/programme/']").first().click();
  await page.locator("a[href^='/programme/'][href*='/m-']").first().click();
  await page.waitForURL(/\/programme\/[^/]+\/m-/);
  const title = (await page.getByRole("heading", { level: 1 }).textContent()) ?? "";
  await page.getByRole("link", { name: "signaler une erreur" }).click();

  await expect(page.getByText("À propos de la mesure")).toBeVisible();
  await expect(page.getByRole("link", { name: title.trim() })).toBeVisible();
  await expect(page.getByText(/^Il manque le type d'erreur et quelques mots/)).toBeVisible();
  await page.getByText("Un taux, un montant ou une date ne correspond pas au programme").click();
  await page.getByLabel(/Ce qui ne va pas/).fill("[message de test : la date ne correspond pas à la page citée]");
  await expect(page.getByText(/^Il manque/)).toHaveCount(0);

  if (process.env.SIGNALEMENT_GITHUB_TOKEN) return; // l'envoi direct créerait une vraie issue
  await page.getByRole("button", { name: /signalement/ }).click();
  const link = page.getByRole("link", { name: "Ouvrir sur GitHub" });
  await expect(link).toBeVisible();
  const url = new URL((await link.getAttribute("href")) ?? "");
  expect(url.pathname).toBe("/BaptisteLac/mon-quinquennat/issues/new");
  expect(url.searchParams.get("body")).toContain("[message de test");
  expect(outside).toEqual([]);
});

test("mentions légales et pied de page", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("navigation", { name: "Pied de page" });
  for (const name of ["Méthode", "Les programmes", "Signaler une erreur", "Mentions légales", "Code source"]) {
    await expect(footer.getByRole("link", { name })).toBeVisible();
  }
  await footer.getByRole("link", { name: "Mentions légales" }).click();
  await expect(page.getByRole("heading", { name: "Mentions légales", level: 1 })).toBeVisible();
  await expect(page.getByText("Le site ne dépose aucun cookie.")).toBeVisible();
  expect(await page.context().cookies()).toEqual([]);
});
