/**
 * Données de test. Tout est fictif et marqué comme tel : aucun texte, chiffre ou URL
 * ne provient d'un programme réel.
 */
import type { GroundTruth } from "./ground-truth.js";
import type { LlmMeasure } from "./llm-schema.js";

export const PAGES = [
  "[page de test 1] Sommaire fictif.",
  "[page de test 2] Mesure fictive alpha : le taux fictif de la tranche test passera à 9 % en 2028.\nMesure fictive bêta : nous créerons un guichet fictif dans chaque commune test.",
  "[page de test 3] Constat fictif sans engagement.\nMesure fictive gamma : l'âge fictif de départ sera fixé à 62 ans.",
  "[page de test 4] Annexe fictive.",
];

export const GT: GroundTruth = {
  document: {
    id: "doc-test-v1",
    candidateId: "c-test",
    publisher: "[parti fictif de test]",
    title: "[programme fictif de test]",
    docType: "programme",
    officialUrl: "https://example.org/programme-fictif.pdf",
    archiveUrl: "https://example.org/archive-fictive.pdf",
    sha256: "0".repeat(64),
    retrievedAt: "2026-10-23T00:00:00Z",
    localPath: "data/archives/doc-test-v1.pdf",
    totalPages: 4,
  },
  sections: [
    { id: "fiscalite", label: "Fiscalité (test)", pages: { from: 2, to: 2 } },
    { id: "retraite", label: "Retraite (test)", pages: { from: 3, to: 3 } },
  ],
  measures: [
    {
      id: "gt-01",
      sectionId: "fiscalite",
      page: 2,
      quote: "le taux fictif de la tranche test passera à 9 % en 2028",
      description: "Taux fictif à 9 % en 2028",
      values: [
        { label: "taux fictif", value: 9, unit: "pourcent" },
        { label: "date", value: "2028", unit: "date" },
      ],
    },
    {
      id: "gt-02",
      sectionId: "fiscalite",
      page: 2,
      quote: "nous créerons un guichet fictif dans chaque commune test",
      description: "Guichet fictif",
      values: [],
    },
    {
      id: "gt-03",
      sectionId: "retraite",
      page: 3,
      quote: "l'âge fictif de départ sera fixé à 62 ans",
      description: "Âge fictif à 62 ans",
      values: [{ label: "âge", value: 62, unit: "ans" }],
    },
  ],
  annotatedBy: "[test]",
  annotatedAt: "2026-10-23",
};

export function llmMeasure(overrides: Partial<LlmMeasure> = {}): LlmMeasure {
  return {
    theme: "fiscalite",
    title: "Taux fictif à 9 %",
    summary: { simple: "Un taux fictif baisse.", normal: "Le taux fictif de la tranche test passe à 9 % en 2028." },
    sources: [{ page: 2, quote: "le taux fictif de la tranche test passera à 9 % en 2028" }],
    rationale: null,
    subMeasures: [],
    precision: "precise",
    legalPath: "loi_de_finances",
    schedule: { effectiveDate: "2028-01-01", dateOrigin: "annoncee", estimationRule: null },
    effects: [
      {
        ticketLine: "impot_revenu",
        section: "portefeuille",
        appliesTo: { all: [{ field: "revenusFoyerMensuels", op: "gte", value: 1 }] },
        computation: {
          kind: "bareme",
          reform: [{ parameter: "taux fictif de la tranche test", value: 0.09, from: "2028-01-01" }],
          formulaId: null,
          params: [],
          hypothesisLabel: null,
        },
        sentence: null,
      },
    ],
    ...overrides,
  };
}

export const QUALITATIVE: LlmMeasure = llmMeasure({
  title: "Guichet fictif",
  summary: { simple: "Un guichet fictif.", normal: "Un guichet fictif dans chaque commune test." },
  sources: [{ page: 2, quote: "nous créerons un guichet fictif dans chaque commune test" }],
  precision: "floue",
  legalPath: "inconnu",
  schedule: { effectiveDate: "2028-01-01", dateOrigin: "estimee", estimationRule: "[règle de test]" },
  effects: [],
});
