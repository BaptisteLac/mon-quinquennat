/**
 * Des extractions (sortie de LLM ou écrites en session) aux mesures publiables :
 * conversion en `Measure`, contrôles, score de confiance, statut. Fonction pure, testée sans fichiers.
 */
import { Measure } from "@mon-quinquennat/schema";
import type { Corpus } from "./corpus.js";
import { riskLevel, type Review } from "./checks.js";
import { MeasureDraft, toDraftInput, type LlmMeasure } from "./llm-schema.js";
import { measureKeys } from "./run.js";
import { contentSha256, routeByScore, runChecks, type MeaningReview } from "./scoring.js";

export interface IngestInput {
  corpus: Corpus;
  measures: readonly { raw: LlmMeasure; file: string }[];
  meaning: Readonly<Record<string, MeaningReview>>;
  threshold: number;
  extractedBy: { model: string; promptVersion: string; at: string };
}

export interface IngestedMeasure {
  key: string;
  file: string;
  raw: LlmMeasure;
  /** Empreinte du contenu relu, à reporter dans relecture.json. */
  contentSha256: string;
  review: Review;
  /** Mesure complète si le format est valide. */
  measure: Measure | null;
}

export function ingest(input: IngestInput): IngestedMeasure[] {
  const texts = input.corpus.units.map((u) => u.text);
  const locate = (p: number) => {
    const u = input.corpus.units[p - 1];
    return u ? { documentId: u.documentId, page: u.page } : null;
  };
  const keys = measureKeys(input.measures.map((m) => m.raw.sources[0]?.quote ?? ""));
  return input.measures.map(({ raw, file }, i) => {
    const key = keys[i] ?? String(i);
    const parsed = MeasureDraft.safeParse(
      toDraftInput(raw, { id: `m-${key}`, candidateId: input.corpus.manifest.candidateId, locate }),
    );
    const draft = parsed.success ? parsed.data : null;
    const formatErrors = parsed.success ? [] : parsed.error.issues.map((iss) => `${iss.path.join(".")} : ${iss.message}`);
    const checks = runChecks({ raw, draft, formatErrors, corpusTexts: texts, meaning: input.meaning[key] });
    const review: Review = {
      ...routeByScore(checks, input.threshold),
      riskLevel: draft ? riskLevel(draft) : "chiffre_ticket",
      checks,
      extractedBy: input.extractedBy,
    };
    return {
      key,
      file,
      raw,
      contentSha256: contentSha256(raw),
      review,
      measure: draft ? Measure.parse({ ...draft, review }) : null,
    };
  });
}

/** Rapport Markdown : répartition des scores et détail de ce qui n'est pas auto-validé. */
export function ingestReport(items: readonly IngestedMeasure[], threshold: number, corpus: Corpus): string {
  const by = (s: Review["status"]) => items.filter((i) => i.review.status === s);
  const pct = (n: number) => (items.length === 0 ? "0" : ((100 * n) / items.length).toFixed(1));
  const scores = new Map<string, number>();
  for (const i of items) scores.set(i.review.score.toFixed(2), (scores.get(i.review.score.toFixed(2)) ?? 0) + 1);
  const where = (i: IngestedMeasure) => {
    const s = i.measure?.sources[0];
    return s ? `${s.documentId.replace(`${corpus.manifest.corpusId}-`, "")} p. ${s.page}` : `page ${i.raw.sources[0]?.page ?? "?"} du corpus`;
  };
  const failed = (i: IngestedMeasure) =>
    i.review.checks.filter((c) => !c.passed).map((c) => `${c.id}${c.detail ? ` — ${c.detail}` : ""}`).join(" ; ");
  const list = (title: string, xs: IngestedMeasure[]) => [
    "",
    `## ${title} (${xs.length})`,
    "",
    ...(xs.length ? xs.map((i) => `- \`${i.key}\` ${i.raw.title} (${where(i)}) — ${failed(i)}`) : ["Aucune."]),
  ];
  const themes = new Map<string, number>();
  for (const i of items) themes.set(i.raw.theme, (themes.get(i.raw.theme) ?? 0) + 1);
  return [
    `# Mesures extraites — corpus \`${corpus.manifest.corpusId}\``,
    "",
    `- Manifeste : \`${corpus.manifestSha256.slice(0, 12)}…\` (${corpus.manifest.documents.length} documents, ${corpus.units.length} pages)`,
    `- Seuil d'approbation automatique : score ≥ ${threshold}`,
    "",
    "| Statut | Mesures | Part |",
    "|---|---|---|",
    `| Auto-validées | ${by("auto_validee").length} | ${pct(by("auto_validee").length)} % |`,
    `| En attente | ${by("en_attente").length} | ${pct(by("en_attente").length)} % |`,
    `| Rejetées (format ou citation) | ${by("rejetee").length} | ${pct(by("rejetee").length)} % |`,
    `| **Total** | **${items.length}** | |`,
    "",
    "Répartition des scores : " + [...scores].sort().reverse().map(([s, n]) => `${s} → ${n}`).join(", "),
    "",
    "Par thème : " + [...themes].sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} ${n}`).join(", "),
    ...list("Rejetées", by("rejetee")),
    ...list("En attente", by("en_attente")),
  ].join("\n") + "\n";
}
