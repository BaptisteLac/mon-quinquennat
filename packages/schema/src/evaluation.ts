/**
 * Bilan de qualité d'un programme (`data/evaluations/<corpus>/bilan.json`), écrit par
 * `npm run evaluate -- bilan` et lu par la page Méthode. Les proportions portent leur intervalle
 * de confiance : le site affiche ce qui a été mesuré, sans recalcul.
 */
import { z } from "zod";

/** Intervalle de confiance à 95 % d'une proportion (Wilson). */
export function wilson(successes: number, n: number): { low: number; high: number } {
  if (n === 0) return { low: 0, high: 1 };
  const z = 1.96;
  const p = successes / n;
  const denom = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return { low: Math.max(0, center - half), high: Math.min(1, center + half) };
}

const Count = z
  .object({ k: z.number().int().nonnegative(), n: z.number().int().nonnegative() })
  .refine((c) => c.k <= c.n, "k > n");

/** Proportion mesurée sur un échantillon : k réussites sur n, intervalle de Wilson à 95 %. */
export const Proportion = z
  .object({
    k: z.number().int().nonnegative(),
    n: z.number().int().positive(),
    low: z.number().min(0).max(1),
    high: z.number().min(0).max(1),
  })
  .refine((p) => p.k <= p.n && p.low <= p.k / p.n && p.k / p.n <= p.high, "proportion incohérente");
export type Proportion = z.infer<typeof Proportion>;

export function proportion(k: number, n: number): Proportion {
  return { k, n, ...wilson(k, n) };
}

const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const EvaluationSummary = z.object({
  corpusId: z.string(),
  candidateId: z.string(),
  manifestSha256: z.string().length(64),
  /** Graine du tirage des échantillons. */
  seed: z.number().int(),
  /** Date de la lecture la plus récente (engagements ou relecture). */
  readOn: IsoDate,
  /** Qui a lu : le bilan n'est pas fait par un humain, et le site le dit. */
  readers: z.object({ rappel: z.string().min(1), precision: z.string().min(1) }),
  /** Contrôles automatiques, sur toutes les mesures publiées. */
  checks: z.object({ citations: Count, figures: Count, autoValidated: Count }),
  /** Engagements relevés sur des pages tirées au sort et retrouvés parmi les mesures publiées. */
  recall: Proportion.and(z.object({ pages: z.number().int().positive() })),
  /** Mesures tirées au sort dont la fiche dit ce que dit la citation. */
  precision: Proportion,
  /** Parmi les mesures tirées qui portent des paramètres, celles dont les paramètres sont justes. */
  parameters: Proportion.nullable(),
  /** Mesures tirées sans aucune erreur (sens correct et paramètres non faux) : 1 − taux d'erreur. */
  errorFree: Proportion,
  discrepancies: z.array(
    z.object({
      measureId: z.string(),
      sens: z.enum(["correct", "incorrect"]),
      parametres: z.enum(["justes", "faux", "sans_parametre"]),
      note: z.string().optional(),
    }),
  ),
});
export type EvaluationSummary = z.infer<typeof EvaluationSummary>;
