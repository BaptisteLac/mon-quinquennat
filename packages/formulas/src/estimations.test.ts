import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import donnees from "../data/donnees-publiques.json" with { type: "json" };
import { baisseCotisationsSalaire, deductionInteretsEmprunt, energieFacture, PublicData } from "./estimations.ts";

const spaces = (s: string) => s.replace(/[  ]/g, " ").replace(/\s+/g, " ");

describe("données publiques des hypothèses", () => {
  const data = PublicData.parse(donnees);
  it.each(data.map((d) => [d.id, d] as const))("%s : citation archivée mot pour mot, avec la valeur", (_id, d) => {
    const archive = readFileSync(new URL(`../${d.archive}`, import.meta.url), "utf8");
    expect(spaces(archive)).toContain(spaces(d.citation));
    expect(spaces(d.citation).replace(/ /g, "")).toContain(String(d.valeur));
  });
});

describe("baisse de cotisations", () => {
  it("adapte le gain annoncé au salaire médian en proportion du salaire", () => {
    // Au salaire médian : le montant annoncé, ramené au mois.
    expect(baisseCotisationsSalaire([2190], { gainAnnuelReference: 500 }, 2190)).toEqual({ low: 41.67, high: 41.67 });
    expect(baisseCotisationsSalaire([4380], { gainAnnuelReference: 500 }, 2190).low).toBeCloseTo(83.33, 2);
    expect(baisseCotisationsSalaire([0], { gainAnnuelReference: 500 }, 2190)).toEqual({ low: 0, high: 0 });
  });
  it("reprend une fourchette annoncée sans salaire de référence, par salarié", () => {
    expect(baisseCotisationsSalaire([1800, 1500], { gainMensuelBas: 250, gainMensuelHaut: 400 }, null)).toEqual({ low: 500, high: 800 });
  });
});

describe("facture d'électricité", () => {
  it("applique la baisse annoncée à la facture moyenne", () => {
    expect(energieFacture({ baissePourcentBas: 5 }, 1072)).toEqual({ low: 4.47, high: 4.47 });
    expect(energieFacture({ baissePourcentBas: 5, baissePourcentHaut: 10 }, 1072)).toEqual({ low: 4.47, high: 8.93 });
  });
});

describe("intérêts d'emprunt", () => {
  const params = { interetsAnnuels: 3300, partUnEnfant: 50, partDeuxEnfants: 75, partTroisEnfants: 100, plafondBase: 400, plafondParEnfant: 400 };
  it("retrouve l'exemple du programme : deux enfants, 3 300 € d'intérêts, 1 200 € de réduction", () => {
    expect(deductionInteretsEmprunt(2, params, null)).toEqual({ low: 100, high: 100 }); // 1 200 € par an
  });
  it("ne dépasse pas l'impôt dû, et rien sans enfant", () => {
    expect(deductionInteretsEmprunt(3, params, 50).low).toBe(50);
    expect(deductionInteretsEmprunt(0, params, 500).low).toBe(0);
  });
});
