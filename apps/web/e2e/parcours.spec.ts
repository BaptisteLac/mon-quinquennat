import { expect, test, type Page } from "@playwright/test";

/** Toute requête doit rester sur le site : ni police, ni statistique, ni API tierce (confidentialité). */
function watchRequests(page: Page, origin: string) {
  const foreign: string[] = [];
  const errors: string[] = [];
  page.on("request", (r) => {
    if (!r.url().startsWith(origin) && !r.url().startsWith("data:")) foreign.push(r.url());
  });
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  return { foreign, errors };
}

async function noHorizontalScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
}

test("parcours complet : personnage, vie, choix, puis reprise", async ({ page, baseURL }) => {
  const seen = watchRequests(page, baseURL ?? "");
  await page.goto("/");
  await page.getByRole("link", { name: "Vivre mon quinquennat" }).click();

  // Étape 1
  await expect(page.getByRole("heading", { name: /Qui es-tu/ })).toBeVisible();
  await expect(page.getByText(/^Il manque/)).toBeVisible();
  await page.getByLabel("Âge").fill("34");
  await page.getByText("Femme", { exact: true }).click();
  await page.getByText(/Marié·e/).click();
  await page.getByRole("group", { name: /Enfants/ }).getByText("2", { exact: true }).click();
  await page.getByLabel("Enfant 1").selectOption("2025");
  await page.getByLabel("Enfant 2").selectOption("2019");
  await page.getByText("Salarié·e du privé").click();
  await page.getByText("À temps plein").click();
  await noHorizontalScroll(page);
  await page.getByRole("link", { name: "Continuer" }).click();

  // Étape 2
  await expect(page.getByRole("heading", { name: /Ta vie au/ })).toBeVisible();
  await page.getByLabel("Tes revenus nets / mois", { exact: true }).fill("1850");
  await page.getByLabel("Et ceux de ton/ta conjoint·e", { exact: true }).fill("1600");
  await page.getByRole("group", { name: "Sa situation" }).getByText("Fonctionnaire").click();
  await page.getByText("Locataire privé").click();
  await page.getByLabel("Ton loyer hors charges / mois", { exact: true }).fill("700");
  await page.getByPlaceholder("Code postal").fill("36000");
  await expect(page.getByText("Châteauroux")).toBeVisible();
  await page.getByText("En périphérie").click();
  await page.getByText("Voiture essence / diesel").click();
  await noHorizontalScroll(page);
  await page.getByRole("link", { name: "Vivre mon quinquennat" }).click();

  // Choix des programmes
  await expect(page.getByRole("heading", { name: /Quels programmes/ })).toBeVisible();
  await page.getByRole("button", { name: /David Lisnard/ }).click();
  await expect(page.getByText("1 / 3 choisis")).toBeVisible();
  await noHorizontalScroll(page);

  // Retour sur l'accueil : reprise proposée, avec le résumé du profil
  await page.goto("/");
  const sheet = page.getByRole("dialog", { name: "Content de te revoir" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("Le choix des programmes")).toBeVisible();
  // Un programme choisi, et le mystère tiré parmi les autres programmes publiés.
  await expect(sheet.getByText("1 programme + 1 mystère · profil : 34 ans, mariée ou pacsée, 2 enfants, salariée")).toBeVisible();
  await sheet.getByRole("link", { name: "Reprendre où j'en étais" }).click();
  await expect(page).toHaveURL(/\/candidats$/);
  await expect(page.getByRole("button", { name: /David Lisnard/ })).toHaveAttribute("aria-pressed", "true");

  expect(seen.foreign).toEqual([]);
  expect(seen.errors).toEqual([]);
});

test("le parcours ne saute pas d'étape et s'efface", async ({ page }) => {
  await page.goto("/personnage/vie");
  await expect(page).toHaveURL(/\/personnage$/);
  await page.goto("/candidats");
  await expect(page).toHaveURL(/\/personnage$/);

  await page.getByLabel("Âge").fill("70");
  await page.goto("/");
  const sheet = page.getByRole("dialog", { name: "Content de te revoir" });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "L'effacer" }).click();
  await expect(sheet).toBeHidden();
  await page.reload();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("page programme : filtres et sources", async ({ page, baseURL }) => {
  const seen = watchRequests(page, baseURL ?? "");
  await page.goto("/programme/david-lisnard");
  await expect(page.getByRole("heading", { name: /Le programme de/ })).toBeVisible();
  await page.getByRole("button", { name: /^Santé/ }).click();
  await expect(page.getByRole("button", { name: /^Santé/ })).toHaveAttribute("aria-pressed", "true");
  const firstSource = page.locator("li a[target=_blank]").first();
  await expect(firstSource).toHaveAttribute("href", /^https:\/\//);
  await noHorizontalScroll(page);
  expect(seen.foreign).toEqual([]);
  expect(seen.errors).toEqual([]);
});
