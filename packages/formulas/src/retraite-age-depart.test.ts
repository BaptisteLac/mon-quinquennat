import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { LegalAgeTable, legalAgeFor, retraiteAgeDepart } from "./retraite-age-depart.js";

// Barème FICTIF, pour tester la mécanique : ce ne sont pas les règles en vigueur.
const source = {
  texte: "[texte officiel…]",
  url: "https://example.org/texte-fictif",
  citation: "[citation exacte…]",
  consulteLe: "2026-10-24",
};
const FICTIF = LegalAgeTable.parse({
  status: "source",
  rules: [
    { generationDebut: null, generationFin: 1960, age: { ans: 60, mois: 0 }, source },
    { generationDebut: 1961, generationFin: 1969, age: { ans: 61, mois: 6 }, source },
    { generationDebut: 1970, generationFin: null, age: { ans: 62, mois: 0 }, source },
  ],
});

describe("retraiteAgeDepart", () => {
  it("donne l'écart en mois entre l'âge légal du candidat et l'âge actuel", () => {
    const r = retraiteAgeDepart({ age: 40, situationPro: "salarie_prive" }, { ageLegal: 63 }, FICTIF, 2026);
    expect(r).toMatchObject({ applicable: true, actuel: { ans: 62, mois: 0 }, candidat: { ans: 63, mois: 0 }, ecartMois: 12 });
  });

  it("signale les deux générations possibles quand l'âge seul ne suffit pas", () => {
    // 56 ans en 2026 : né en 1969 ou 1970, à cheval sur deux lignes du barème.
    const r = retraiteAgeDepart({ age: 56, situationPro: "fonctionnaire" }, { ageLegal: 63 }, FICTIF, 2026);
    expect(r).toMatchObject({ generationsPossibles: [1969, 1970], ecartMoisSelonGeneration: [18, 12] });
  });

  it("ne s'applique pas à un retraité", () => {
    expect(retraiteAgeDepart({ age: 70, situationPro: "retraite" }, { ageLegal: 63 }, FICTIF, 2026).applicable).toBe(false);
  });

  it("refuse un barème qui ne couvre pas la génération ou se chevauche", () => {
    const trou = LegalAgeTable.parse({ status: "source", rules: [{ generationDebut: 1970, generationFin: null, age: { ans: 62, mois: 0 }, source }] });
    expect(() => legalAgeFor(1965, trou)).toThrow(/génération 1965/);
  });

  it("refuse de calculer tant que le barème réel n'est pas sourcé", () => {
    const table = LegalAgeTable.parse(JSON.parse(readFileSync(resolve(__dirname, "../data/age-legal-actuel.json"), "utf8")));
    if (table.status === "a_caler_pendant_le_test") {
      expect(() => retraiteAgeDepart({ age: 40, situationPro: "salarie_prive" }, { ageLegal: 65 }, table, 2026)).toThrow(/non sourcé/);
    } else {
      expect(table.rules.length).toBeGreaterThan(0);
    }
  });
});
