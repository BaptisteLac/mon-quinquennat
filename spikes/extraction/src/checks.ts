/**
 * Contrôles du test n°1 et routage. Sur les six contrôles du pipeline, le test en exerce quatre :
 * format, citation exacte, double extraction, relecture croisée.
 * Vraisemblance et neutralité demandent le moteur de calcul : elles viennent après le test n°2.
 */
import type { Measure } from "@mon-quinquennat/schema";
import { allQuotes, type MeasureDraft } from "./llm-schema.js";
import { locateQuote } from "./normalize.js";

export type Review = Measure["review"];
export type CheckResult = Review["checks"][number];
export type RiskLevel = Review["riskLevel"];

/** Toutes les citations de la mesure doivent être trouvées mot pour mot à leur page. Bloquant. */
export function checkCitations(m: Parameters<typeof allQuotes>[0], pages: readonly string[]): CheckResult {
  const failures: string[] = [];
  for (const q of allQuotes(m)) {
    const loc = locateQuote(q.quote, q.page, pages);
    if (!loc.found) {
      const hint = loc.foundOnPages.length > 0 ? ` (trouvée p. ${loc.foundOnPages.join(", ")})` : "";
      failures.push(`p. ${q.page} : « ${q.quote.slice(0, 80)} »${hint}`);
    }
  }
  return failures.length === 0
    ? { id: "citation_exacte", passed: true }
    : { id: "citation_exacte", passed: false, detail: `introuvable : ${failures.join(" ; ")}` };
}

/** Une ligne chiffrée sur le ticket exige plus de contrôles qu'une phrase qualitative. */
export function riskLevel(m: Pick<MeasureDraft, "effects">): RiskLevel {
  return m.effects.some((e) => e.computation.kind !== "qualitatif") ? "chiffre_ticket" : "qualitatif";
}

const REQUIRED: Record<RiskLevel, CheckResult["id"][]> = {
  qualitatif: ["format", "citation_exacte", "relecture_croisee"],
  chiffre_ticket: ["format", "citation_exacte", "relecture_croisee", "double_extraction"],
};

/**
 * Routage :
 * - format ou citation en échec → rejetée (jamais publiée) ;
 * - tous les contrôles requis passés → auto-validée ;
 * - sinon → en attente (file d'exceptions).
 * Un contrôle requis absent (non exécuté) compte comme non passé.
 */
export function route(checks: readonly CheckResult[], risk: RiskLevel): Pick<Review, "status" | "score"> {
  const byId = new Map(checks.map((c) => [c.id, c.passed]));
  const score = checks.length === 0 ? 0 : checks.filter((c) => c.passed).length / checks.length;
  if (byId.get("format") === false || byId.get("citation_exacte") === false) return { status: "rejetee", score };
  const allPassed = REQUIRED[risk].every((id) => byId.get(id) === true);
  return { status: allPassed ? "auto_validee" : "en_attente", score };
}
