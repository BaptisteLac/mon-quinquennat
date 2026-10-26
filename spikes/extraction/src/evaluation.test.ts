import { describe, expect, it } from "vitest";
import { recall, sampleIndices, wilson } from "./evaluation.js";

describe("sampleIndices", () => {
  it("tire des indices distincts, reproductibles avec la même graine", () => {
    const a = sampleIndices(203, 20, 2027);
    expect(a).toEqual(sampleIndices(203, 20, 2027));
    expect(new Set(a).size).toBe(20);
    expect(a.every((i) => i >= 0 && i < 203)).toBe(true);
    expect(sampleIndices(203, 20, 2028)).not.toEqual(a);
  });

  it("ne tire jamais plus que la population", () => {
    expect(sampleIndices(3, 10, 1)).toEqual([0, 1, 2]);
  });
});

describe("recall", () => {
  const measure = (id: string, quote: string) => ({ id, sources: [{ page: 1, quote }], subMeasures: [] });
  const engagement = (quote: string) => ({ documentId: "doc-fictif", page: 2, quote, description: "[engagement fictif]" });

  it("compte un engagement repris par une mesure, même cité sur un autre document", () => {
    const r = recall(
      [engagement("nous créerons un guichet fictif dans chaque commune test"), engagement("le taux fictif passera à 9 % en 2028")],
      [measure("m-1", "Nous créerons un guichet fictif dans chaque commune test.")],
    );
    expect(r.found).toBe(1);
    expect(r.missed.map((e) => e.quote)).toEqual(["le taux fictif passera à 9 % en 2028"]);
    expect(r.matches[0]?.measureId).toBe("m-1");
  });
});

describe("wilson", () => {
  it("encadre la proportion observée", () => {
    const { low, high } = wilson(90, 100);
    expect(low).toBeLessThan(0.9);
    expect(high).toBeGreaterThan(0.9);
    expect(low).toBeCloseTo(0.826, 2);
  });
});
