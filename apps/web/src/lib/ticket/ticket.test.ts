import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Profile, type Condition } from "@mon-quinquennat/schema";
import { dataDir, loadProgrammes, type Programme } from "../data";
import { CalculResponse, fetchCalcul } from "./calc-client";
import { monthsApplied } from "../term";
import { buildTicket, corpusMismatch } from "./build";
import { matches } from "./conditions";

// Réponses réelles du service de calcul (calc/scripts/record_web_fixtures.py) : aucun montant écrit à la main.
const FIXTURES = new URL("./fixtures/", import.meta.url);
function fixture(name: string) {
  const raw = JSON.parse(readFileSync(new URL(`${name}.json`, FIXTURES), "utf8")) as { profile: unknown; calcul: unknown };
  return { profile: Profile.parse(raw.profile), calc: CalculResponse.parse(raw.calcul) };
}

const programmes = loadProgrammes(dataDir());
const lisnard = programmes.find((p) => p.candidate.id === "c-01") as Programme;

describe("conditions « à qui s'applique »", () => {
  const { profile } = fixture("couple-2-enfants-proprietaires");
  const c = (x: Condition) => matches(x, profile);
  it("champs du profil et champs dérivés", () => {
    expect(c({ field: "situationFamiliale", op: "eq", value: "marie_pacse" })).toBe(true);
    expect(c({ field: "nbEnfants", op: "gte", value: 2 })).toBe(true);
    expect(c({ field: "nbEnfants", op: "gte", value: 3 })).toBe(false);
    expect(c({ field: "enfantsAgeBand", op: "in", value: ["3_10"] })).toBe(true);
    expect(c({ field: "enfantsAgeBand", op: "eq", value: "18_25" })).toBe(false);
    expect(c({ field: "revenusFoyerMensuels", op: "gte", value: profile.revenusNetsMensuels + 1 })).toBe(true);
  });
  it("combinaisons, et réponse absente = condition non établie", () => {
    expect(c({ all: [] })).toBe(true);
    expect(c({ any: [] })).toBe(false);
    expect(c({ not: { field: "logement", op: "in", value: ["locataire_prive", "locataire_hlm"] } })).toBe(true);
    expect(c({ field: "patrimoine", op: "eq", value: "plus_1m" })).toBe(false);
    expect(c({ not: { field: "patrimoine", op: "eq", value: "plus_1m" } })).toBe(true);
  });
});

describe("cumul sur le mandat", () => {
  it("compte les mois entiers entre la date d'effet et la fin du mandat", () => {
    expect(monthsApplied("2027-05-14")).toBe(60);
    expect(monthsApplied("2020-01-01")).toBe(60);
    expect(monthsApplied("2028-01-01")).toBe(52);
    expect(monthsApplied("2032-06-01")).toBe(0);
  });
});

describe("ticket d'un candidat", () => {
  it("portefeuille : écart calculé par OpenFisca, rattaché à sa mesure, cumulé depuis sa date d'effet", () => {
    const { profile, calc } = fixture("retraitee-seule-petite-pension");
    const t = buildTicket(lisnard, profile, calc);
    const base = calc.actuel.montants.minimum_vieillesse as number;
    const after = calc.candidats["c-01"]?.montants.minimum_vieillesse as number;
    const line = t.lines.find((l) => l.ticketLine === "pension");
    expect(line).toMatchObject({ section: "portefeuille", nature: "sur", baseline: base, effectiveDate: "2028-01-01" });
    expect(line?.value?.low).toBeCloseTo(after - base, 2);
    expect(line?.measureIds).toEqual(["m-9dd1526ae0f6"]);
    expect(t.solde.sureOnly).toBeCloseTo(after - base, 2);
    expect(t.cumul5ans.low).toBeCloseTo((after - base) * 52, 1);
    // Déjà retraitée : pas de ligne sur l'âge de départ.
    expect(t.lines.some((l) => l.ticketLine === "age_depart_retraite")).toBe(false);
  });

  it("temps : âge de départ par la formule de la liste blanche, en années", () => {
    const { profile, calc } = fixture("celibataire-smic-locataire");
    const t = buildTicket(lisnard, profile, calc);
    const line = t.lines.find((l) => l.ticketLine === "age_depart_retraite");
    expect(line).toMatchObject({ section: "temps", nature: "sur", measureIds: ["m-292afd3ae0d2"] });
    expect(line?.value?.low).toBeGreaterThan(0);
  });

  it("pas de ligne quand le montant ne change pas ; effets qualitatifs filtrés par profil", () => {
    const { profile, calc } = fixture("couple-2-enfants-proprietaires");
    const t = buildTicket(lisnard, profile, calc);
    expect(t.lines.filter((l) => l.section === "portefeuille" && l.nature === "sur")).toEqual([]);
    const qualitative = t.lines.filter((l) => l.nature === "qualitatif");
    expect(qualitative.length).toBeGreaterThan(0);
    const byId = new Map(lisnard.measures.map((m) => [m.id, m]));
    for (const l of qualitative) {
      for (const id of l.measureIds) {
        const effect = byId.get(id)?.effects.find((e) => e.ticketLine === l.ticketLine);
        expect(effect && matches(effect.appliesTo, profile)).toBe(true);
      }
    }
  });

  it("un montant non calculable est signalé avec son motif, sans ligne chiffrée", () => {
    const { profile, calc } = fixture("parent-isole-2-enfants-hlm");
    const reason = "Loyer non renseigné.";
    const without = CalculResponse.parse({
      ...calc,
      actuel: { ...calc.actuel, montants: { ...calc.actuel.montants, aides_logement: null }, nonCalcules: { aides_logement: reason } },
      candidats: Object.fromEntries(
        Object.entries(calc.candidats).map(([id, c]) => [id, { ...c, montants: { ...c.montants, aides_logement: null }, nonCalcules: { aides_logement: reason } }]),
      ),
    });
    const t = buildTicket(lisnard, profile, without);
    expect(t.lines.some((l) => l.ticketLine === "apl" && l.nature === "sur")).toBe(false);
    expect(t.uncomputed).toContainEqual({ ticketLine: "apl", reason, measureIds: ["m-9dd1526ae0f6"] });
  });

  it("hypothèses du calcul reprises sur le ticket", () => {
    const { profile, calc } = fixture("parent-isole-2-enfants-hlm");
    expect(buildTicket(lisnard, profile, calc).hypotheses).toEqual(expect.arrayContaining(calc.actuel.hypotheses));
  });

  it("tous les profils enregistrés donnent un ticket valide pour chaque programme", () => {
    for (const f of readdirSync(FIXTURES).filter((x) => x.endsWith(".json"))) {
      const { profile, calc } = fixture(f.replace(/\.json$/, ""));
      for (const p of programmes) expect(() => buildTicket(p, profile, calc)).not.toThrow();
    }
  });
});

describe("cohérence site / service de calcul", () => {
  it("détecte une version de programme différente", () => {
    const { calc } = fixture("couple-2-enfants-proprietaires");
    expect(corpusMismatch(programmes, calc)).toEqual([]);
    expect(corpusMismatch(programmes, { ...calc, corpus: {} })).toEqual(programmes.map((p) => p.candidate.id));
  });
});

describe("client du service de calcul", () => {
  const { profile, calc } = fixture("couple-2-enfants-proprietaires");
  it("sans adresse configurée, ne contacte rien", async () => {
    await expect(fetchCalcul(profile, undefined)).rejects.toMatchObject({ kind: "non_configure" });
  });
  it("profil hors champ : reprend le motif du service", async () => {
    const fetcher = (async () => Response.json({ erreur: "Seule la micro-entreprise est couverte." }, { status: 422 })) as unknown as typeof fetch;
    await expect(fetchCalcul(profile, "http://calc.invalid", fetcher)).rejects.toMatchObject({ kind: "hors_champ", message: "Seule la micro-entreprise est couverte." });
  });
  it("valide la réponse", async () => {
    const fetcher = (async () => Response.json(calc)) as unknown as typeof fetch;
    expect(await fetchCalcul(profile, "http://calc.invalid", fetcher)).toEqual(calc);
    const broken = (async () => Response.json({ corpus: {} })) as unknown as typeof fetch;
    await expect(fetchCalcul(profile, "http://calc.invalid", broken)).rejects.toThrow();
  });
});
