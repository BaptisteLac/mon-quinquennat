/**
 * Données de test. Tout est fictif et marqué comme tel : aucun texte, chiffre ou URL
 * ne provient d'un programme réel.
 */
import { buildCorpus, corpusFrom, type Corpus, type CorpusManifest } from "./corpus.js";
import type { GroundTruth } from "./ground-truth.js";
import type { LlmMeasure } from "./llm-schema.js";

export const PAGES = [
  "[page de test 1] Sommaire fictif.",
  "[page de test 2] Mesure fictive alpha : le taux fictif de la tranche test passera à 9 % en 2028.\nMesure fictive bêta : nous créerons un guichet fictif dans chaque commune test.",
  "[page de test 3] Constat fictif sans engagement.\nMesure fictive gamma : l'âge fictif de départ sera fixé à 62 ans.",
  "[page de test 4] Annexe fictive.",
];

const DOCS = [
  { id: "corpus-test-sommaire", kind: "html" as const, url: "https://example.org/programme-fictif/", texts: [PAGES[0] ?? ""] },
  { id: "corpus-test-programme", kind: "pdf" as const, url: "https://example.org/programme-fictif.pdf", texts: PAGES.slice(1) },
];

export const MANIFEST: CorpusManifest = {
  corpusId: "corpus-test",
  candidateId: "c-test",
  collectedAt: "2026-10-23T00:00:00Z",
  startUrls: ["https://example.org/programme-fictif/"],
  include: ["https://example.org/programme-fictif/"],
  rendered: false,
  documents: DOCS.map((d) => ({
    id: d.id,
    kind: d.kind,
    officialUrl: d.url,
    contentType: d.kind === "pdf" ? "application/pdf" : "text/html; charset=utf-8",
    title: "[titre fictif]",
    retrievedAt: "2026-10-23T00:00:00Z",
    file: `raw/${d.id}.${d.kind}`,
    sha256: "0".repeat(64),
    textFile: `text/${d.id}.json`,
    textSha256: "0".repeat(64),
    pageCount: d.texts.length,
  })),
  excludedLinks: [],
  externalPdfs: [],
  skipped: [],
};

/** Corpus de test : page 1 = sommaire (page web) ; pages 2 à 4 = pages 1 à 3 du PDF. */
export const CORPUS: Corpus = corpusFrom(
  MANIFEST,
  "1".repeat(64),
  buildCorpus(DOCS.flatMap((d) => d.texts.map((text, i) => ({ documentId: d.id, page: i + 1, url: d.url, title: "[titre fictif]", text })))),
);

export const GT: GroundTruth = {
  corpus: "data/archives/corpus-test/manifest.json",
  corpusSha256: "1".repeat(64),
  sections: [
    { id: "fiscalite", label: "Fiscalité (test)", parts: [{ documentId: "corpus-test-programme", pages: { from: 1, to: 1 } }] },
    { id: "retraite", label: "Retraite (test)", parts: [{ documentId: "corpus-test-programme", pages: { from: 2, to: 2 } }] },
  ],
  measures: [
    {
      id: "gt-01",
      sectionId: "fiscalite",
      documentId: "corpus-test-programme",
      page: 1,
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
      documentId: "corpus-test-programme",
      page: 1,
      quote: "nous créerons un guichet fictif dans chaque commune test",
      description: "Guichet fictif",
      values: [],
    },
    {
      id: "gt-03",
      sectionId: "retraite",
      documentId: "corpus-test-programme",
      page: 2,
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

/** PDF minimal, une ligne de texte ASCII par page. */
export function minimalPdf(lines: string[]): Uint8Array {
  const n = lines.length;
  const pageIds = lines.map((_, i) => 4 + i * 2);
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${n} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  lines.forEach((line, i) => {
    const stream = `BT /F1 12 Tf 72 720 Td (${line}) Tj ET`;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${pageIds[i]! + 1} 0 R >>`);
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(out);
}
