import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const { profile } = JSON.parse(readFileSync(new URL("../src/lib/ticket/fixtures/retraitee-seule-petite-pension.json", import.meta.url), "utf8")) as {
  profile: Record<string, unknown>;
};
const journey = { version: 1, savedAt: new Date().toISOString(), profile, choix: { candidats: ["c-01"], mystere: true, mystereId: null }, versions: {} };

test.beforeEach(async ({ page }) => {
  await page.addInitScript((j) => {
    if (!localStorage.getItem("mon-quinquennat:parcours")) localStorage.setItem("mon-quinquennat:parcours", JSON.stringify(j));
  }, journey);
});

test("récap, ticket, partage par lien signé, lien falsifié refusé", async ({ page, request, baseURL }) => {
  if (!process.env.CALC_URL) {
    // Sans calcul, pas de ticket : le récap renvoie vers la frise.
    await page.goto("/recap");
    await expect(page).toHaveURL(/\/quinquennat$/);
    return;
  }
  const foreign: string[] = [];
  const errors: string[] = [];
  page.on("request", (r) => !r.url().startsWith(baseURL ?? "") && !r.url().startsWith("blob:") && foreign.push(r.url()));
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/quinquennat");
  await page.getByRole("link", { name: "Voir mon ticket" }).click({ timeout: 60_000 });
  await expect(page.getByRole("heading", { name: /Tu viens/ })).toBeVisible();
  await page.getByRole("button", { name: /Voir mon récap/ }).click();
  await expect(page.getByRole("heading", { name: "MA VIE EN 2032" })).toBeVisible();
  await expect(page.getByText("Pension et minimum vieillesse")).toBeVisible();

  // Fiche source d'une ligne
  await page.getByRole("button", { name: /Pension et minimum vieillesse/ }).click();
  await expect(page.getByRole("dialog").getByText("D'où vient ce chiffre ?")).toBeVisible();
  await page.keyboard.press("Escape");

  // Partage
  await page.getByRole("button", { name: "Partager" }).first().click();
  const sheet = page.getByRole("dialog", { name: "Partager ton ticket" });
  await expect(sheet).toBeVisible();
  if (!process.env.SHARE_SECRET) {
    await expect(sheet.getByText("Le partage par lien n'est pas encore activé sur ce site.")).toBeVisible();
    return;
  }
  const imageHref = await sheet.getByRole("link", { name: "Télécharger l'image" }).getAttribute("href");
  expect(imageHref).toMatch(/^\/t\/[A-Za-z0-9_-]+\/image\?format=story$/);
  const shareUrl = (imageHref ?? "").replace(/\/image\?format=story$/, "");
  expect(shareUrl).not.toContain("revenus");
  await page.keyboard.press("Escape");

  // Suite du récap jusqu'à la fin
  for (let i = 0; i < 8 && !(await page.getByRole("heading", { name: /À toi\s*de jouer/ }).isVisible()); i++) {
    await page.getByRole("button", { name: /^(Suivant|Ticket suivant|Révéler d'un coup|Voir la révélation)$/ }).last().click();
  }
  await expect(page.getByRole("heading", { name: /À toi\s*de jouer/ })).toBeVisible();

  // Le lien partagé s'ouvre chez un autre visiteur, avec son image d'aperçu
  const visitor = await page.context().browser()?.newPage();
  if (!visitor) throw new Error("navigateur indisponible");
  await visitor.goto(`${baseURL}${shareUrl}`);
  await expect(visitor.getByRole("heading", { name: /On t'a envoyé/ })).toBeVisible();
  await expect(visitor.getByText("Profil masqué par son auteur")).toBeVisible();
  const og = await request.get(`${shareUrl}/image?format=og`);
  expect(og.status()).toBe(200);
  expect(og.headers()["content-type"]).toBe("image/png");

  // Un ticket modifié n'est pas affiché
  await visitor.goto(`${baseURL}${shareUrl.slice(0, -8)}AAAAAAAA`);
  await expect(visitor.getByRole("heading", { name: "Ce lien ne peut pas être affiché" })).toBeVisible();

  expect(foreign).toEqual([]);
  expect(errors).toEqual([]);
});
