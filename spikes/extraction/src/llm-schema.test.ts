import { Measure } from "@mon-quinquennat/schema";
import { describe, expect, it } from "vitest";
import { llmMeasure } from "./fixtures.test-helpers.js";
import { MeasureDraft, toDraftInput } from "./llm-schema.js";

const ids = {
  id: "x-1",
  candidateId: "c-test",
  locate: (unit: number) => (unit === 2 ? { documentId: "doc-test-programme", page: 1 } : null),
};

describe("toDraftInput", () => {
  it("produit un brouillon valide pour le schéma Measure (sans review)", () => {
    const draft = MeasureDraft.parse(toDraftInput(llmMeasure(), ids));
    expect(draft.sources[0]).toMatchObject({ documentId: "doc-test-programme", page: 1 });
    expect(draft.effects[0]?.id).toBe("x-1-e1");
    expect(draft.effects[0]?.computation).toEqual({
      kind: "bareme",
      engine: "openfisca",
      reform: [{ parameter: "impot_revenu_taux_tranche_2", value: 9, from: "2028-01-01" }],
    });
    const review = {
      status: "en_attente",
      riskLevel: "chiffre_ticket",
      score: 0,
      checks: [],
      extractedBy: { model: "modele-test", promptVersion: "extract-v1", at: "2026-10-23T00:00:00Z" },
    };
    expect(Measure.safeParse({ ...draft, review }).success).toBe(true);
  });

  it("convertit les paramètres d'une formule en dictionnaire", () => {
    const m = llmMeasure({
      effects: [
        {
          ticketLine: "age_depart_retraite",
          section: "temps",
          appliesTo: { all: [] },
          computation: { kind: "formule", reform: [], formulaId: "retraite_age_depart", params: [{ name: "age", value: 62 }], hypothesisLabel: null },
          sentence: null,
        },
      ],
    });
    const draft = MeasureDraft.parse(toDraftInput(m, ids));
    expect(draft.effects[0]?.computation).toEqual({ kind: "formule", formulaId: "retraite_age_depart", params: { age: 62 } });
  });

  it("laisse le contrôle de format rejeter une sortie incohérente", () => {
    const outside = llmMeasure({ sources: [{ page: 99, quote: "[citation de test hors corpus]" }] });
    expect(MeasureDraft.safeParse(toDraftInput(outside, ids)).success).toBe(false);
    const noSource = llmMeasure({ sources: [] });
    expect(MeasureDraft.safeParse(toDraftInput(noSource, ids)).success).toBe(false);
    const badDate = llmMeasure({ schedule: { effectiveDate: "début 2028", dateOrigin: "annoncee", estimationRule: null } });
    expect(MeasureDraft.safeParse(toDraftInput(badDate, ids)).success).toBe(false);
    const badFormula = llmMeasure({
      effects: [
        {
          ticketLine: "tva",
          section: "portefeuille",
          appliesTo: { all: [] },
          computation: { kind: "formule", reform: [], formulaId: "tva_consommation", params: [], hypothesisLabel: null },
          sentence: null,
        },
      ],
    });
    expect(MeasureDraft.safeParse(toDraftInput(badFormula, ids)).success).toBe(false);
  });

  it("marque la source d'hypothèse d'une estimation comme à définir", () => {
    const m = llmMeasure({
      effects: [
        {
          ticketLine: "energie",
          section: "portefeuille",
          appliesTo: { all: [] },
          computation: { kind: "estimation", reform: [], formulaId: "energie_facture", params: [], hypothesisLabel: "[hypothèse de test]" },
          sentence: null,
        },
      ],
    });
    const draft = MeasureDraft.parse(toDraftInput(m, ids));
    expect(draft.effects[0]?.computation).toMatchObject({ hypothesis: { dataSourceId: "a_definir" } });
  });
});
