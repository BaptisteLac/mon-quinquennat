/**
 * Données de la page Méthode, lues au build : contrôles réellement passés par les mesures publiées
 * et bilans de qualité (`data/evaluations/<corpus>/bilan.json`, écrits par `npm run evaluate -- bilan`).
 * La page ne décrit que ce qui tourne : un contrôle n'y figure que si toutes les mesures publiées l'ont passé.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CheckId, EvaluationSummary, proportion, type Proportion } from "@mon-quinquennat/schema";
import type { z } from "zod";
import type { Programme } from "./data";

type Check = z.infer<typeof CheckId>;

/** Une phrase par contrôle, même modèle pour tous les candidats. */
export const CHECK_LABELS: Record<Check, string> = {
  format: "La fiche est complète et au bon format.",
  citation_exacte: "La citation existe mot pour mot dans le programme archivé.",
  chiffres_fideles: "Chaque chiffre de la fiche (taux, montant, date) figure dans la citation.",
  relecture_sens: "Une seconde lecture, distincte de l'extraction, confirme que la fiche dit ce que dit la citation.",
  relecture_croisee: "Une IA d'un autre fournisseur confirme que la citation dit bien ce que la mesure affirme.",
  double_extraction: "Deux lectures indépendantes trouvent les mêmes chiffres.",
  vraisemblance: "Le résultat est vraisemblable sur des profils de référence.",
  neutralite: "Le résumé est neutre, rédigé sur le même modèle pour tous.",
};

/** Contrôles passés par chacune des mesures publiées, dans l'ordre du pipeline. */
export function checksOnAll(programmes: readonly Pick<Programme, "measures">[]): Check[] {
  const measures = programmes.flatMap((p) => p.measures);
  if (measures.length === 0) return [];
  return CheckId.options.filter((id) => measures.every((m) => m.review.checks.some((c) => c.id === id && c.passed)));
}

export function loadEvaluations(dataDir: string): EvaluationSummary[] {
  const dir = join(dataDir, "evaluations");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((corpus) => join(dir, corpus, "bilan.json"))
    .filter((f) => existsSync(f))
    .map((f) => EvaluationSummary.parse(JSON.parse(readFileSync(f, "utf8"))));
}

export interface ProgrammeQuality {
  programme: Programme;
  /** Bilan le plus récent du candidat, ou null s'il n'a pas encore été fait. */
  summary: EvaluationSummary | null;
  /** Le bilan porte sur la version affichée du programme (sinon, sur une version précédente). */
  currentVersion: boolean;
}

export function qualityByProgramme(programmes: readonly Programme[], summaries: readonly EvaluationSummary[]): ProgrammeQuality[] {
  return programmes.map((programme) => {
    const own = summaries.filter((s) => s.candidateId === programme.candidate.id);
    const summary =
      own.find((s) => s.corpusId === programme.corpusId) ?? [...own].sort((a, b) => b.readOn.localeCompare(a.readOn))[0] ?? null;
    return { programme, summary, currentVersion: summary?.corpusId === programme.corpusId };
  });
}

/** Taux d'erreur de tous les bilans réunis : mesures tirées avec au moins une erreur (sens ou paramètres). */
export function pooledErrorRate(summaries: readonly EvaluationSummary[]): Proportion | null {
  const n = summaries.reduce((t, s) => t + s.errorFree.n, 0);
  if (n === 0) return null;
  const errors = summaries.reduce((t, s) => t + s.errorFree.n - s.errorFree.k, 0);
  return proportion(errors, n);
}

/** Date de la donnée la plus récente : collecte d'un programme ou lecture d'un bilan (AAAA-MM-JJ…). */
export function lastUpdate(programmes: readonly Pick<Programme, "collectedAt">[], summaries: readonly EvaluationSummary[]): string | null {
  const dates = [...programmes.map((p) => p.collectedAt), ...summaries.map((s) => `${s.readOn}T12:00:00Z`)];
  return dates.sort().at(-1) ?? null;
}

const PCT = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** 0.05 → « 5,0 % » (espace insécable). */
export function formatPercent(x: number): string {
  return `${PCT.format(100 * x)} %`;
}
