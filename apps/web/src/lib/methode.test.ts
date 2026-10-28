import { proportion, type EvaluationSummary } from "@mon-quinquennat/schema";
import { describe, expect, it } from "vitest";
import { dataDir, loadProgrammes } from "./data";
import { checksOnAll, formatPercent, lastUpdate, loadEvaluations, pooledErrorRate, qualityByProgramme } from "./methode";

function summary(over: Partial<EvaluationSummary>): EvaluationSummary {
  return {
    corpusId: "parti-2026-10",
    candidateId: "c-01",
    manifestSha256: "0".repeat(64),
    seed: 1,
    readOn: "2026-10-26",
    readers: { rappel: "[lecteur]", precision: "[lecteur]" },
    checks: { citations: { k: 10, n: 10 }, figures: { k: 10, n: 10 }, autoValidated: { k: 10, n: 10 } },
    recall: { ...proportion(9, 10), pages: 5 },
    precision: proportion(10, 10),
    parameters: null,
    errorFree: proportion(10, 10),
    discrepancies: [],
    ...over,
  };
}

describe("page Méthode, données réelles", () => {
  const programmes = loadProgrammes(dataDir());
  const summaries = loadEvaluations(dataDir());

  it("ne liste que des contrôles passés par toutes les mesures publiées", () => {
    const checks = checksOnAll(programmes);
    expect(checks.length).toBeGreaterThan(0);
    for (const m of programmes.flatMap((p) => p.measures)) {
      for (const id of checks) expect(m.review.checks.find((c) => c.id === id)?.passed).toBe(true);
    }
  });

  it("chaque bilan porte sur un candidat publié", () => {
    expect(summaries.length).toBeGreaterThan(0);
    for (const s of summaries) {
      const p = programmes.find((x) => x.candidate.id === s.candidateId);
      expect(p, s.corpusId).toBeDefined();
      expect(s.errorFree.k).toBeLessThanOrEqual(s.precision.k);
    }
  });

  it("chaque programme affiché a un bilan sur sa version actuelle", () => {
    for (const q of qualityByProgramme(programmes, summaries)) {
      expect(q.summary, q.programme.corpusId).not.toBeNull();
      expect(q.currentVersion).toBe(true);
    }
  });
});

describe("taux d'erreur", () => {
  it("réunit les échantillons de tous les bilans", () => {
    const rate = pooledErrorRate([summary({ errorFree: proportion(38, 40) }), summary({ errorFree: proportion(19, 20) })]);
    expect(rate?.k).toBe(3);
    expect(rate?.n).toBe(60);
    expect(rate!.low).toBeLessThan(0.05);
    expect(rate!.high).toBeGreaterThan(0.05);
  });

  it("n'affiche rien sans bilan", () => {
    expect(pooledErrorRate([])).toBeNull();
  });

  it("formate en pourcentage français", () => {
    expect(formatPercent(0.05)).toBe("5,0 %");
    expect(formatPercent(0.9302)).toBe("93,0 %");
  });
});

describe("bilan d'un programme", () => {
  const programme = loadProgrammes(dataDir())[0]!;

  it("prend le bilan de la version affichée, sinon le plus récent du candidat", () => {
    const id = programme.candidate.id;
    const old = summary({ candidateId: id, corpusId: "ancien-2026-09", readOn: "2026-09-30" });
    const older = summary({ candidateId: id, corpusId: "ancien-2026-08", readOn: "2026-08-30" });
    expect(qualityByProgramme([programme], [older, old])[0]).toMatchObject({ summary: old, currentVersion: false });
    const current = summary({ candidateId: id, corpusId: programme.corpusId, readOn: "2026-08-01" });
    expect(qualityByProgramme([programme], [old, current])[0]).toMatchObject({ summary: current, currentVersion: true });
    expect(qualityByProgramme([programme], [summary({ candidateId: "autre" })])[0]?.summary).toBeNull();
  });

  it("date la page à la donnée la plus récente", () => {
    expect(lastUpdate([{ collectedAt: "2026-10-20T08:00:00Z" }], [summary({ readOn: "2026-10-26" })])).toBe("2026-10-26T12:00:00Z");
    expect(lastUpdate([], [])).toBeNull();
  });
});
