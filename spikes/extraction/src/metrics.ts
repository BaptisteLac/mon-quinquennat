/**
 * Indicateurs du test n°1 (docs/faisabilite.md) et feu vert.
 *
 * Périmètre : seules les mesures extraites dont une citation tombe dans les sections annotées comptent.
 * « Réelle » = appariée à la vérité terrain, ou déclarée réelle par une adjudication humaine.
 * « Correcte » = réelle et bien résumée. Sans adjudication, une mesure appariée est comptée correcte
 * à titre provisoire, et une mesure non appariée est « à adjudiquer » (exclue de la précision, signalée).
 */
import { z } from "zod";
import { type GroundTruth, type GroundTruthMeasure, inScope } from "./ground-truth.js";
import { matchOneToOne } from "./match.js";
import type { RunRecord } from "./run.js";
import { compareValues, extractedValues, type ValueComparison } from "./values.js";

export const Adjudication = z.object({
  verdict: z.enum(["correcte", "resume_incorrect", "inexistante", "doublon"]),
  note: z.string().optional(),
});
export const Adjudications = z.record(z.string(), Adjudication);
export type Adjudications = z.infer<typeof Adjudications>;

export interface Rate {
  num: number;
  den: number;
  /** null si le dénominateur est nul. */
  value: number | null;
}

function rate(num: number, den: number): Rate {
  return { num, den, value: den === 0 ? null : num / den };
}

export interface ScoredRecord {
  record: RunRecord;
  gt: GroundTruthMeasure | null;
  adjudication: z.infer<typeof Adjudication> | null;
  correct: boolean | null; // null = à adjudiquer
  provisional: boolean; // correct sans adjudication humaine
  values: ValueComparison | null; // null si mesure non chiffrée ou non appariée
}

export interface Metrics {
  scored: ScoredRecord[];
  missed: GroundTruthMeasure[];
  recall: { raw: Rate; published: Rate };
  precision: { raw: Rate; published: Rate };
  exactCitations: { raw: Rate; published: Rate };
  parameters: { published: Rate };
  autoValidation: Rate;
  toAdjudicate: number;
  provisional: number;
}

const isPublished = (r: RunRecord) => r.review.status === "auto_validee";
const citationPassed = (r: RunRecord) => r.review.checks.some((c) => c.id === "citation_exacte" && c.passed);

export function computeMetrics(records: readonly RunRecord[], gt: GroundTruth, adjudications: Adjudications): Metrics {
  const scope = records.filter((r) => r.raw.sources.some((s) => inScope(s.page, gt.sections)));
  const pairs = matchOneToOne(
    scope.map((r) => r.raw.sources),
    gt.measures.map((m) => [{ page: m.page, quote: m.quote }]),
  );
  const gtByRecord = new Map(pairs.map((p) => [p.left, gt.measures[p.right] ?? null]));

  const scored: ScoredRecord[] = scope.map((record, i) => {
    const matched = gtByRecord.get(i) ?? null;
    const adjudication = adjudications[record.key] ?? null;
    const correct = adjudication ? adjudication.verdict === "correcte" : matched ? true : null;
    const got = record.measure ? extractedValues(record.measure) : null;
    const chiffree = matched !== null && got !== null && (matched.values.length > 0 || got.numbers.length + got.dates.length > 0);
    return {
      record,
      gt: matched,
      adjudication,
      correct,
      provisional: adjudication === null && matched !== null,
      values: chiffree && matched && got ? compareValues(matched.values, got) : null,
    };
  });

  const published = scored.filter((s) => isPublished(s.record));
  const foundIds = (list: ScoredRecord[]) => new Set(list.flatMap((s) => (s.gt ? [s.gt.id] : [])));
  const decided = (list: ScoredRecord[]) => list.filter((s) => s.correct !== null);
  const withValues = published.filter((s) => s.values !== null);

  return {
    scored,
    missed: gt.measures.filter((m) => !foundIds(scored).has(m.id)),
    recall: {
      raw: rate(foundIds(scored).size, gt.measures.length),
      published: rate(foundIds(published).size, gt.measures.length),
    },
    precision: {
      raw: rate(decided(scored).filter((s) => s.correct).length, decided(scored).length),
      published: rate(decided(published).filter((s) => s.correct).length, decided(published).length),
    },
    exactCitations: {
      raw: rate(scope.filter(citationPassed).length, scope.length),
      published: rate(published.filter((s) => citationPassed(s.record)).length, published.length),
    },
    parameters: { published: rate(withValues.filter((s) => s.values?.ok).length, withValues.length) },
    autoValidation: rate(published.length, scope.length),
    toAdjudicate: scored.filter((s) => s.correct === null).length,
    provisional: scored.filter((s) => s.provisional).length,
  };
}

/** Seuils du feu vert (docs/faisabilite.md). */
export const GATES = {
  exactCitationsPublished: 1,
  precisionPublished: 0.95,
  recallRaw: 0.8,
  parametersPublished: 0.95,
  autoValidation: 0.6,
  costEurPerProgramme: 5,
} as const;

export type GateStatus = "ok" | "echec" | "indetermine";

export function gate(value: number | null, threshold: number, direction: "min" | "max" = "min"): GateStatus {
  if (value === null) return "indetermine";
  return (direction === "min" ? value >= threshold : value < threshold) ? "ok" : "echec";
}
