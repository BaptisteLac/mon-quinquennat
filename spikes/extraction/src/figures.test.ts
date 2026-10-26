import { describe, expect, it } from "vitest";
import { checkFigures, numbersIn, START_OF_TERM, supportedBy } from "./figures.js";
import { MeasureDraft, toDraftInput } from "./llm-schema.js";
import { llmMeasure } from "./fixtures.test-helpers.js";

describe("numbersIn", () => {
  it("lit les nombres au format français", () => {
    expect(numbersIn("3 417 milliards, soit 120 % du PIB ; 55,6 % ; 1.000 € ; en 2028")).toEqual([3417, 120, 55.6, 1000, 2028]);
    expect(numbersIn("environ 400 € et 10 000 postes")).toEqual([400, 10000]);
  });

  it("ne fusionne pas deux nombres voisins", () => {
    expect(numbersIn("en 2028 120 milliards")).toEqual([2028, 120]);
  });
});

describe("supportedBy", () => {
  it("accepte fraction ↔ pourcentage et changement d'unité", () => {
    expect(supportedBy(0.09, [9])).toBe(true);
    expect(supportedBy(120_000_000_000, [120])).toBe(true);
    expect(supportedBy(11, [9])).toBe(false);
  });
});

const locate = (p: number) => ({ documentId: "doc-test", page: p });
const draft = (overrides: Parameters<typeof llmMeasure>[0]) =>
  MeasureDraft.parse(toDraftInput(llmMeasure(overrides), { id: "m-1", candidateId: "c-test", locate }));

describe("checkFigures", () => {
  it("passe quand chaque chiffre de la fiche est dans la citation", () => {
    expect(checkFigures(draft({})).passed).toBe(true);
  });

  it("signale un chiffre modifié dans le résumé", () => {
    const r = checkFigures(draft({ summary: { simple: "Un taux fictif baisse.", normal: "Le taux fictif passe à 8 % en 2028." } }));
    expect(r.passed).toBe(false);
    expect(r.detail).toContain("8 (résumé)");
  });

  it("signale un paramètre de calcul absent de la citation", () => {
    const m = llmMeasure();
    const e = m.effects[0];
    if (!e) throw new Error("fixture");
    const bad = { ...m, effects: [{ ...e, computation: { ...e.computation, reform: [{ parameter: "impot_revenu_taux_tranche_2" as const, value: 7, from: "2028-01-01" }] } }] };
    const r = checkFigures(MeasureDraft.parse(toDraftInput(bad, { id: "m-1", candidateId: "c-test", locate })));
    expect(r.detail).toContain("7 (paramètre 1)");
  });

  it("refuse la date par défaut pour une mesure annoncée « le premier jour »", () => {
    const quote = "Le premier jour : un conseil fictif sera réuni.";
    const base = { title: "Conseil fictif", summary: { simple: "Un conseil fictif.", normal: "Un conseil fictif serait réuni." }, effects: [] };
    const late = draft({ ...base, sources: [{ page: 1, quote }], schedule: { effectiveDate: "2028-01-01", dateOrigin: "estimee", estimationRule: "[règle de test]" } });
    expect(checkFigures(late).detail).toContain("postérieure au début du mandat");
    const onTime = draft({ ...base, sources: [{ page: 1, quote }], schedule: { effectiveDate: START_OF_TERM, dateOrigin: "estimee", estimationRule: "[règle de test]" } });
    expect(checkFigures(onTime).passed).toBe(true);
    const arrival = draft({ ...base, sources: [{ page: 1, quote: "Il s’engage à le faire dès son arrivée au pouvoir." }], schedule: { effectiveDate: "2028-01-01", dateOrigin: "estimee", estimationRule: "[règle de test]" } });
    expect(checkFigures(arrival).passed).toBe(false);
  });

  it("vérifie l'année d'une date annoncée, pas celle d'une date estimée", () => {
    const announced = draft({ schedule: { effectiveDate: "2029-01-01", dateOrigin: "annoncee", estimationRule: null } });
    expect(checkFigures(announced).passed).toBe(false);
    const estimated = draft({ schedule: { effectiveDate: "2029-01-01", dateOrigin: "estimee", estimationRule: "[règle de test]" } });
    expect(checkFigures(estimated).passed).toBe(true);
  });
});
