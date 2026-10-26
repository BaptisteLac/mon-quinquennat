import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { LegalAgeTable, legalAgeFor, retraiteAgeDepart } from "./retraite-age-depart.ts";

// Barème FICTIF, pour tester la mécanique : ce ne sont pas les règles en vigueur.
const cit = { naissance: "[citation exacte…]", age: "[citation exacte…]" };
const FICTIF = LegalAgeTable.parse({
  status: "source",
  source: { titre: "[titre fictif]", url: "https://example.org/bareme-fictif", verifieLe: "2026-01-01", consulteLe: "2026-01-01", archive: "[archive fictive]" },
  rules: [
    { naissanceDebut: "1960-01-01", naissanceFin: "1965-06-30", age: { ans: 61, mois: 0 }, citation: cit },
    { naissanceDebut: "1965-07-01", naissanceFin: null, age: { ans: 62, mois: 0 }, citation: cit },
  ],
});

describe("retraiteAgeDepart (barème fictif)", () => {
  it("donne l'écart en mois entre l'âge légal du candidat et l'âge actuel", () => {
    const r = retraiteAgeDepart({ age: 40, situationPro: "salarie_prive" }, { ageLegal: 63 }, FICTIF, "2026-10-01");
    expect(r).toMatchObject({ applicable: true, actuels: [{ ans: 62, mois: 0 }], ecartMois: [12, 12] });
  });

  it("donne une fourchette quand la naissance peut tomber de part et d'autre d'une ligne", () => {
    // 61 ans au 1er octobre 2026 : né entre le 2 octobre 1964 et le 1er octobre 1965.
    const r = retraiteAgeDepart({ age: 61, situationPro: "salarie_prive" }, { ageLegal: 63 }, FICTIF, "2026-10-01");
    expect(r).toMatchObject({ applicable: true, ecartMois: [12, 24] });
  });

  it("ne s'applique pas à un retraité ni à une génération hors barème", () => {
    expect(retraiteAgeDepart({ age: 70, situationPro: "retraite" }, { ageLegal: 63 }, FICTIF, "2026-10-01").applicable).toBe(false);
    expect(retraiteAgeDepart({ age: 70, situationPro: "salarie_prive" }, { ageLegal: 63 }, FICTIF, "2026-10-01").applicable).toBe(false);
  });

  it("refuse un barème qui se chevauche", () => {
    const t = LegalAgeTable.parse({ ...FICTIF, rules: [...FICTIF.rules, { ...FICTIF.rules[1]!, naissanceDebut: "1965-01-01" }] });
    expect(() => legalAgeFor("1966-01-01", t)).toThrow(/ambigu/);
  });
});

describe("barème officiel (data/age-legal-actuel.json)", () => {
  const table = LegalAgeTable.parse(JSON.parse(readFileSync(resolve(__dirname, "../data/age-legal-actuel.json"), "utf8")));
  if (table.status !== "source") throw new Error("barème non sourcé");
  const archive = readFileSync(resolve(__dirname, "..", table.source.archive), "utf8");

  it("chaque cellule citée figure mot pour mot dans la page archivée", () => {
    for (const r of table.rules) {
      expect(archive).toContain(r.citation.naissance);
      expect(archive).toContain(r.citation.age);
    }
  });

  it("l'âge de chaque ligne correspond au texte cité", () => {
    for (const r of table.rules) {
      const m = /^(\d+) ans(?: et (\d+) mois)?$/.exec(r.citation.age);
      expect(m).not.toBeNull();
      expect(r.age).toEqual({ ans: Number(m![1]), mois: Number(m![2] ?? 0) });
    }
  });

  it("les lignes se suivent sans trou ni chevauchement", () => {
    for (let i = 1; i < table.rules.length; i++) {
      const prev = new Date(`${table.rules[i - 1]!.naissanceFin}T00:00:00Z`);
      prev.setUTCDate(prev.getUTCDate() + 1);
      expect(table.rules[i]!.naissanceDebut).toBe(prev.toISOString().slice(0, 10));
    }
  });

  it("65 ans pour une personne de 40 ans : un an de plus que les 64 ans actuels", () => {
    const r = retraiteAgeDepart({ age: 40, situationPro: "salarie_prive" }, { ageLegal: 65 }, table, "2026-10-01");
    expect(r).toMatchObject({ applicable: true, actuels: [{ ans: 64, mois: 0 }], ecartMois: [12, 12] });
  });
});
