/**
 * Bilan du test n°1 sans vérité terrain saisie à la main (docs/decisions.md) :
 * - rappel : sur un échantillon de pages tirées au sort, une lecture indépendante relève chaque
 *   engagement (citation exacte) sans voir les mesures ; on compte ceux que les mesures publiées couvrent ;
 * - précision et paramètres : relecture d'un échantillon de mesures publiées tiré au sort, contre leurs citations.
 * Les tirages sont reproductibles (graine écrite dans le fichier d'échantillon).
 */
import { z } from "zod";
import { allQuotes } from "./llm-schema.js";
import { quoteOverlap, MATCH_THRESHOLD } from "./match.js";

/** Intervalle de Wilson : dans le schéma partagé, la page Méthode s'en sert aussi. */
export { wilson } from "@mon-quinquennat/schema";

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
export function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `k` indices distincts parmi `0..n-1`, triés, tirés avec la graine. */
export function sampleIndices(n: number, k: number, seed: number): number[] {
  const rand = prng(seed);
  const pool = Array.from({ length: n }, (_, i) => i);
  const m = Math.min(k, n);
  for (let i = 0; i < m; i++) {
    const j = i + Math.floor(rand() * (n - i));
    [pool[i], pool[j]] = [pool[j] as number, pool[i] as number];
  }
  return pool.slice(0, m).sort((x, y) => x - y);
}

export const Engagement = z.object({
  documentId: z.string(),
  page: z.number().int().positive(),
  /** Citation exacte de l'engagement dans la page. */
  quote: z.string().min(10),
  description: z.string().min(5),
});
export type Engagement = z.infer<typeof Engagement>;

/** Lecture indépendante des pages de l'échantillon : engagements relevés, page par page. */
export const EngagementsFile = z.object({
  corpus: z.string(),
  lecteur: z.string(),
  /** Jour de la lecture (AAAA-MM-JJ). */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  consigne: z.string(),
  pages: z.array(
    z.object({
      documentId: z.string(),
      page: z.number().int().positive(),
      engagements: z.array(Engagement.omit({ documentId: true, page: true })),
    }),
  ),
});

/** Engagements non appariés automatiquement mais portés par une mesure publiée (citation différente). */
export const CoverageFile = z.object({
  corpus: z.string(),
  lecteur: z.string(),
  consigne: z.string(),
  /** Clé : citation exacte de l'engagement. */
  couvertures: z.record(z.string(), z.object({ measureId: z.string(), note: z.string() })),
});

export const MeasureVerdict = z.object({
  /** La fiche dit-elle ce que dit la citation (sans ajout ni contresens) ? */
  sens: z.enum(["correct", "incorrect"]),
  /** Taux, montants, dates et conditions de la fiche conformes à la citation. */
  parametres: z.enum(["justes", "faux", "sans_parametre"]),
  note: z.string().optional(),
});
export const VerdictsFile = z.object({
  corpus: z.string(),
  lecteur: z.string(),
  /** Jour de la relecture (AAAA-MM-JJ). */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  consigne: z.string(),
  verdicts: z.record(z.string(), MeasureVerdict),
});

interface QuotedMeasure {
  id: string;
  sources: readonly { page: number; quote: string }[];
  rationale?: { page: number; quote: string } | null;
  subMeasures: readonly { source: { page: number; quote: string } }[];
}

export interface RecallResult {
  total: number;
  found: number;
  missed: Engagement[];
  matches: { engagement: Engagement; measureId: string; score: number }[];
}

/**
 * Un engagement est couvert si une citation d'une mesure publiée en reprend l'essentiel des mots,
 * quel que soit le document (le programme répète ses engagements d'une page à l'autre).
 */
export function recall(engagements: readonly Engagement[], measures: readonly QuotedMeasure[], threshold = MATCH_THRESHOLD): RecallResult {
  const quotes = measures.flatMap((m) => allQuotes(m).map((q) => ({ id: m.id, quote: q.quote })));
  const result: RecallResult = { total: engagements.length, found: 0, missed: [], matches: [] };
  for (const e of engagements) {
    let best = { id: "", score: 0 };
    for (const q of quotes) {
      const score = quoteOverlap(e.quote, q.quote);
      if (score > best.score) best = { id: q.id, score };
    }
    if (best.score >= threshold) {
      result.found++;
      result.matches.push({ engagement: e, measureId: best.id, score: best.score });
    } else {
      result.missed.push(e);
    }
  }
  return result;
}
