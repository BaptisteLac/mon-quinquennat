import { describe, expect, it } from "vitest";
import { CORPUS, GT } from "./fixtures.test-helpers.js";
import { GroundTruth, resolveGroundTruth } from "./ground-truth.js";

describe("GroundTruth", () => {
  it("accepte une vérité terrain cohérente", () => {
    expect(GroundTruth.safeParse(GT).success).toBe(true);
  });

  it("met la page à 1 par défaut (page web)", () => {
    const { page: _p, ...noPage } = GT.measures[1] ?? { page: 1 };
    const parsed = GroundTruth.parse({ ...GT, measures: [noPage] });
    expect(parsed.measures[0]?.page).toBe(1);
  });

  it("refuse une section inconnue et un id en double", () => {
    expect(GroundTruth.safeParse({ ...GT, measures: [{ ...GT.measures[0], sectionId: "x" }] }).success).toBe(false);
    expect(GroundTruth.safeParse({ ...GT, measures: [GT.measures[0], GT.measures[0]] }).success).toBe(false);
  });

  it("refuse une date mal écrite", () => {
    const m = { ...GT.measures[0], values: [{ label: "date", value: "en 2028", unit: "date" }] };
    expect(GroundTruth.safeParse({ ...GT, measures: [m] }).success).toBe(false);
  });
});

describe("resolveGroundTruth", () => {
  it("rapporte mesures et sections aux pages du corpus", () => {
    const r = resolveGroundTruth(GT, CORPUS);
    expect(r.measures.map((m) => m.unit)).toEqual([2, 2, 3]);
    expect([...r.scope].sort()).toEqual([2, 3]);
  });

  it("refuse une autre collecte que celle annotée", () => {
    expect(() => resolveGroundTruth({ ...GT, corpusSha256: "2".repeat(64) }, CORPUS)).toThrow(/autre collecte/);
  });

  it("refuse un document ou une page absents, ou une mesure hors de sa section", () => {
    const m0 = GT.measures[0];
    if (!m0) throw new Error("fixture");
    expect(() => resolveGroundTruth({ ...GT, measures: [{ ...m0, documentId: "inconnu" }] }, CORPUS)).toThrow(/absente du corpus/);
    expect(() => resolveGroundTruth({ ...GT, measures: [{ ...m0, page: 9 }] }, CORPUS)).toThrow(/absente du corpus/);
    expect(() => resolveGroundTruth({ ...GT, measures: [{ ...m0, page: 2 }] }, CORPUS)).toThrow(/hors des pages/);
    expect(() =>
      resolveGroundTruth({ ...GT, sections: [...GT.sections, { id: "x", label: "x", parts: [{ documentId: "inconnu" }] }] }, CORPUS),
    ).toThrow(/document inconnu/);
  });
});
