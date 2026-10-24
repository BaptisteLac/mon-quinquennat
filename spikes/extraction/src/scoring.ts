/**
 * Score de confiance et routage d'une mesure extraite.
 *
 * Les programmes officiels font foi : on ne vérifie que la fidélité de l'extraction.
 * - format et citation exacte : bloquants (échec → rejetée, jamais publiée) ;
 * - chiffres fidèles et relecture du sens : comptent dans le score.
 * Score = part des contrôles passés. Auto-validée si score ≥ seuil, sinon en attente.
 */
import { checkCitations, riskLevel, type CheckResult, type Review } from "./checks.js";
import { checkFigures } from "./figures.js";
import type { LlmMeasure, MeasureDraft } from "./llm-schema.js";

export const SCORED_CHECKS = ["format", "citation_exacte", "chiffres_fideles", "relecture_sens"] as const;

export interface MeaningReview {
  verdict: "fidele" | "a_revoir";
  note?: string | undefined;
}

export function meaningCheck(review: MeaningReview | undefined): CheckResult {
  if (!review) return { id: "relecture_sens", passed: false, detail: "relecture du sens non faite" };
  return review.verdict === "fidele"
    ? { id: "relecture_sens", passed: true }
    : { id: "relecture_sens", passed: false, detail: review.note ?? "sens à revoir" };
}

export function scoreChecks(checks: readonly CheckResult[]): number {
  const passed = SCORED_CHECKS.filter((id) => checks.some((c) => c.id === id && c.passed)).length;
  return passed / SCORED_CHECKS.length;
}

export function routeByScore(checks: readonly CheckResult[], threshold: number): Pick<Review, "status" | "score"> {
  const score = scoreChecks(checks);
  const blocked = checks.some((c) => (c.id === "format" || c.id === "citation_exacte") && !c.passed);
  if (blocked) return { status: "rejetee", score };
  return { status: score >= threshold ? "auto_validee" : "en_attente", score };
}

/** Tous les contrôles d'une mesure : la citation est vérifiée sur la sortie brute (pages du corpus). */
export function runChecks(args: {
  raw: LlmMeasure;
  draft: MeasureDraft | null;
  formatErrors: readonly string[];
  corpusTexts: readonly string[];
  meaning: MeaningReview | undefined;
}): CheckResult[] {
  const checks: CheckResult[] = [
    args.draft ? { id: "format", passed: true } : { id: "format", passed: false, detail: args.formatErrors.join(" ; ") },
    checkCitations(args.raw, args.corpusTexts),
  ];
  if (args.draft) checks.push(checkFigures(args.draft));
  checks.push(meaningCheck(args.meaning));
  return checks;
}

export { riskLevel };
