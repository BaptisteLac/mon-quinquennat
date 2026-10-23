import { describe, expect, it } from "vitest";
import { GT, llmMeasure, PAGES, QUALITATIVE } from "./fixtures.test-helpers.js";
import type { crossCheck, extractBatch } from "./llm.js";
import type { LlmMeasure } from "./llm-schema.js";
import { computeMetrics } from "./metrics.js";
import { runPipeline } from "./pipeline.js";
import { costReport, renderReport } from "./report.js";
import { RunFile } from "./run.js";

const gamma = (age: number): LlmMeasure =>
  llmMeasure({
    theme: "retraite",
    title: "Âge fictif de départ",
    summary: { simple: "Âge fictif.", normal: `L'âge fictif de départ est fixé à ${age} ans.` },
    sources: [{ page: 3, quote: "l'âge fictif de départ sera fixé à 62 ans" }],
    schedule: { effectiveDate: "2028-01-01", dateOrigin: "estimee", estimationRule: "[règle de test]" },
    effects: [
      {
        ticketLine: "age_depart_retraite",
        section: "temps",
        appliesTo: { all: [] },
        computation: { kind: "formule", reform: [], formulaId: "retraite_age_depart", params: [{ name: "age", value: age }], hypothesisLabel: null },
        sentence: null,
      },
    ],
  });

const invented = llmMeasure({
  title: "Mesure absente du texte",
  sources: [{ page: 2, quote: "nous supprimerons la taxe fictive dans chaque commune test" }],
});

const fakeExtract: typeof extractBatch = async ({ modelSpec }) => ({
  measures: modelSpec === "test:A" ? [llmMeasure(), QUALITATIVE, invented, gamma(64)] : [llmMeasure(), QUALITATIVE, gamma(62)],
  usage: { inputTokens: 1000, outputTokens: 500 },
});

const reviewed: string[] = [];
const fakeCrossCheck: typeof crossCheck = async ({ measureCard }) => {
  reviewed.push((measureCard as { title: string }).title);
  return { result: { verdict: "fidele", problems: [] }, usage: { inputTokens: 200, outputTokens: 20 } };
};

describe("runPipeline", async () => {
  const out = await runPipeline({
    pages: PAGES,
    pagesToProcess: [2, 3],
    batchPages: 6,
    document: { id: GT.document.id, candidateId: GT.document.candidateId },
    models: { extractA: "test:A", extractB: "test:B", crossCheck: "test:C" },
    prompts: { extract: "[prompt de test]", extractVersion: "extract-v1", crossCheck: "[prompt de test]" },
    effort: "high",
    llm: { extractBatch: fakeExtract, crossCheck: fakeCrossCheck },
    now: () => new Date("2026-10-23T00:00:00Z"),
  });
  const a = out.records.filter((r) => r.extraction === "A");
  const runFile = () => ({
    runId: "test",
    startedAt: "2026-10-23T00:00:00Z",
    finishedAt: "2026-10-23T00:00:00Z",
    document: { id: GT.document.id, candidateId: GT.document.candidateId, sha256: GT.document.sha256, totalPages: 4 },
    pagesProcessed: [2, 3],
    config: {
      promptVersion: "extract-v1",
      promptSha256: "x",
      crossCheckPromptVersion: "crosscheck-v1",
      crossCheckPromptSha256: "x",
      models: { extractA: "test:A", extractB: "test:B", crossCheck: "test:C" },
      effort: "high",
      batchPages: 6,
    },
    ...out,
  });
  const status = (title: string) => a.find((r) => r.raw.title === title)?.review.status;

  it("route chaque mesure selon ses contrôles", () => {
    expect(status("Taux fictif à 9 %")).toBe("auto_validee");
    expect(status("Guichet fictif")).toBe("auto_validee");
    expect(status("Mesure absente du texte")).toBe("rejetee");
    expect(status("Âge fictif de départ")).toBe("en_attente"); // 64 ≠ 62 dans l'autre extraction
  });

  it("ne fait relire que les mesures au format valide et bien citées", () => {
    expect(reviewed).not.toContain("Mesure absente du texte");
    expect(reviewed).toHaveLength(3);
  });

  it("garde l'extraction B comme témoin, jamais publiée", () => {
    const b = out.records.filter((r) => r.extraction === "B");
    expect(b).toHaveLength(3);
    expect(b.every((r) => r.review.status !== "auto_validee")).toBe(true);
  });

  it("produit des mesures conformes au schéma Measure et un fichier d'exécution valide", () => {
    expect(a.filter((r) => r.measure !== null)).toHaveLength(4);
    expect(RunFile.safeParse(runFile()).success).toBe(true);
  });

  it("calcule les indicateurs et le rapport", () => {
    const m = computeMetrics(a, GT, {});
    expect(m.recall.raw.value).toBe(1);
    expect(m.recall.published).toMatchObject({ num: 2, den: 3 });
    expect(m.precision.published).toMatchObject({ num: 2, den: 2 });
    expect(m.parameters.published).toMatchObject({ num: 1, den: 1 });
    expect(m.exactCitations.raw).toMatchObject({ num: 3, den: 4 });
    expect(m.exactCitations.published.value).toBe(1);
    expect(m.autoValidation).toMatchObject({ num: 2, den: 4 });
    expect(m.toAdjudicate).toBe(1);

    const adjudicated = computeMetrics(a, GT, { [a[1]?.key ?? ""]: { verdict: "resume_incorrect" } });
    expect(adjudicated.precision.published).toMatchObject({ num: 1, den: 2 });

    const run = RunFile.parse(runFile());
    const cost = costReport(run, { PRICE_TEST_A: "1,1", PRICE_TEST_B: "1,1", PRICE_TEST_C: "1,1", EUR_PER_USD: "1" });
    expect(cost.factor).toBe(2);
    const report = renderReport(run, GT, m, cost);
    expect(report).toContain("Citations introuvables (mesures rejetées) (1)");
    expect(report).toContain("À adjudiquer");
  });
});
