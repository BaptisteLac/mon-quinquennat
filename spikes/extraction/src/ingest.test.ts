import { describe, expect, it } from "vitest";
import { AuthoredFile, DEFAULT_SCHEDULE, toLlmMeasure } from "./authored.js";
import { CORPUS } from "./fixtures.test-helpers.js";
import { ingest, ingestReport } from "./ingest.js";
import { routeByScore } from "./scoring.js";

const file = AuthoredFile.parse({
  measures: [
    {
      theme: "fiscalite",
      title: "Taux fictif à 9 %",
      summary: { simple: "Un taux fictif baisse.", normal: "Le taux fictif de la tranche test passe à 9 % en 2028." },
      sources: [{ page: 2, quote: "le taux fictif de la tranche test passera à 9 % en 2028" }],
      precision: "precise",
      schedule: { effectiveDate: "2028-01-01", dateOrigin: "annoncee", estimationRule: null },
    },
    {
      theme: "autre",
      title: "Guichet fictif",
      summary: { simple: "Un guichet fictif.", normal: "Un guichet fictif dans chaque commune test." },
      sources: [{ page: 2, quote: "nous créerons un guichet fictif dans chaque commune test" }],
      precision: "floue",
    },
    {
      theme: "autre",
      title: "Mesure mal citée",
      summary: { simple: "Fictif.", normal: "Fictif." },
      sources: [{ page: 2, quote: "nous supprimerons le guichet fictif test" }],
      precision: "floue",
    },
    {
      theme: "retraite",
      title: "Âge fictif à 64 ans",
      summary: { simple: "Âge fictif.", normal: "L'âge fictif de départ passe à 64 ans." },
      sources: [{ page: 3, quote: "l'âge fictif de départ sera fixé à 62 ans" }],
      precision: "precise",
    },
  ],
});

const measures = file.measures.map((m) => ({ raw: toLlmMeasure(m), file: "test.json" }));
const extractedBy = { model: "test", promptVersion: "extract-v1", at: "2026-10-24T00:00:00Z" };

describe("AuthoredFile", () => {
  it("complète les champs omis par des valeurs neutres", () => {
    const m = file.measures[1];
    expect(m?.schedule).toEqual(DEFAULT_SCHEDULE);
    expect(m?.effects).toEqual([]);
    expect(m?.legalPath).toBe("inconnu");
  });

  it("refuse un champ inconnu", () => {
    expect(AuthoredFile.safeParse({ measures: [{ ...file.measures[0], couleur: "x" }] }).success).toBe(false);
  });
});

describe("ingest", () => {
  const firstPass = ingest({ corpus: CORPUS, measures, meaning: {}, threshold: 1, extractedBy });
  const meaning = Object.fromEntries(
    firstPass.map((i) => [i.key, { verdict: "fidele" as const, contentSha256: i.contentSha256 }]),
  );
  const items = ingest({ corpus: CORPUS, measures, meaning, threshold: 1, extractedBy });
  const status = (title: string) => items.find((i) => i.raw.title === title)?.review;

  it("auto-valide une mesure fidèle, relue, et rattache la citation à son document", () => {
    expect(status("Taux fictif à 9 %")).toMatchObject({ status: "auto_validee", score: 1 });
    expect(items[0]?.measure?.sources[0]).toMatchObject({ documentId: "corpus-test-programme", page: 1 });
  });

  it("rejette une citation introuvable", () => {
    expect(status("Mesure mal citée")?.status).toBe("rejetee");
  });

  it("met en attente un chiffre modifié", () => {
    expect(status("Âge fictif à 64 ans")).toMatchObject({ status: "en_attente", score: 0.75 });
  });

  it("met en attente une mesure dont le sens n'a pas été relu", () => {
    expect(firstPass.find((i) => i.raw.title === "Guichet fictif")?.review.status).toBe("en_attente");
  });

  it("invalide la relecture si la mesure a changé depuis", () => {
    const edited = measures.map((m, i) =>
      i === 0 ? { ...m, raw: { ...m.raw, summary: { ...m.raw.summary, simple: "Résumé modifié." } } } : m,
    );
    const again = ingest({ corpus: CORPUS, measures: edited, meaning, threshold: 1, extractedBy });
    expect(again[0]?.key).toBe(items[0]?.key);
    expect(again[0]?.review).toMatchObject({ status: "en_attente", score: 0.75 });
    expect(again[0]?.review.checks.find((c) => c.id === "relecture_sens")?.detail).toContain("obsolète");
  });

  it("produit un rapport avec la répartition", () => {
    const r = ingestReport(items, 1, CORPUS);
    expect(r).toContain("| Auto-validées | 2 | 50.0 % |");
    expect(r).toContain("chiffres_fideles — absent des citations : 64 (titre)");
  });
});

describe("routeByScore", () => {
  it("applique le seuil", () => {
    const checks = [
      { id: "format" as const, passed: true },
      { id: "citation_exacte" as const, passed: true },
      { id: "chiffres_fideles" as const, passed: true },
      { id: "relecture_sens" as const, passed: false },
    ];
    expect(routeByScore(checks, 0.75).status).toBe("auto_validee");
    expect(routeByScore(checks, 1).status).toBe("en_attente");
  });
});
