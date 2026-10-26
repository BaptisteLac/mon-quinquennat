import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

// Profil de référence (célibataire au SMIC, locataire) ; le parcours est déposé dans le stockage local.
const { profile } = JSON.parse(readFileSync(new URL("../src/lib/ticket/fixtures/celibataire-smic-locataire.json", import.meta.url), "utf8")) as {
  profile: Record<string, unknown>;
};
const journey = { version: 1, savedAt: new Date().toISOString(), profile, choix: { candidats: ["c-01"], mystere: true, mystereId: null }, versions: {} };

test.beforeEach(async ({ page }) => {
  await page.addInitScript((j) => {
    if (!localStorage.getItem("mon-quinquennat:parcours")) localStorage.setItem("mon-quinquennat:parcours", JSON.stringify(j));
  }, journey);
});

test("frise du quinquennat, fiche source, et pas de second calcul au retour", async ({ page, baseURL }) => {
  const foreign: string[] = [];
  const errors: string[] = [];
  page.on("request", (r) => !r.url().startsWith(baseURL ?? "") && foreign.push(r.url()));
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/quinquennat");

  if (!process.env.CALC_URL) {
    // Sans service de calcul : écran d'erreur, réponses gardées, possibilité de réessayer.
    await expect(page.getByRole("heading", { name: "Le calcul n'a pas abouti" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Réessayer" })).toBeVisible();
    return;
  }

  await expect(page.getByRole("heading", { name: /Mai 2032\.\s*Fin du mandat\./ })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("heading", { name: /Mai 2027\.\s*Élection/ })).toBeVisible();
  await page.getByRole("button", { name: /d'où viennent ces chiffres/ }).first().click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("D'où vient ce chiffre ?")).toBeVisible();
  await expect(sheet.getByRole("link", { name: "Lire sur le site du candidat" }).first()).toHaveAttribute("href", /^https:\/\//);
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

  // Au retour, le résultat gardé sur l'appareil suffit : aucun nouvel appel au calcul.
  let calls = 0;
  page.on("request", (r) => r.url().endsWith("/api/ticket") && calls++);
  await page.reload();
  await expect(page.getByRole("heading", { name: /Fin du mandat/ })).toBeVisible();
  expect(calls).toBe(0);
  // Et l'accueil propose de reprendre dans la frise.
  await page.goto("/");
  await expect(page.getByRole("dialog", { name: "Content de te revoir" }).getByRole("link", { name: "Reprendre où j'en étais" })).toHaveAttribute("href", "/quinquennat");

  expect(foreign).toEqual([]);
  expect(errors).toEqual([]);
});

test("fiche d'une mesure : citation, source officielle, invitation à créer son perso", async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/programme/david-lisnard/m-292afd3ae0d2");
  await expect(page.getByRole("heading", { name: "Le texte exact" })).toBeVisible();
  await expect(page.getByRole("link", { name: "original" }).first()).toHaveAttribute("href", /^https:\/\//);
  await expect(page.getByText("Crée ton perso pour le savoir")).toBeVisible();
});
