/**
 * Appariement de mesures par leurs citations : extraction ↔ vérité terrain, extraction A ↔ extraction B.
 * Deux mesures sont la même si leurs citations sont sur des pages voisines et partagent l'essentiel de leurs mots.
 */
import { tokens } from "./normalize.js";

export interface Quoted {
  page: number;
  quote: string;
}

/** Part des mots de la citation la plus courte présents dans l'autre (0 à 1). */
export function quoteOverlap(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.length === 0 || tb.length === 0) return 0;
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  const pool = new Map<string, number>();
  for (const t of long) pool.set(t, (pool.get(t) ?? 0) + 1);
  let shared = 0;
  for (const t of short) {
    const n = pool.get(t) ?? 0;
    if (n > 0) {
      shared++;
      pool.set(t, n - 1);
    }
  }
  return shared / short.length;
}

/** Meilleure similarité entre deux ensembles de citations (pages distantes d'au plus 1). */
export function similarity(a: readonly Quoted[], b: readonly Quoted[]): number {
  let best = 0;
  for (const qa of a) {
    for (const qb of b) {
      if (Math.abs(qa.page - qb.page) <= 1) best = Math.max(best, quoteOverlap(qa.quote, qb.quote));
    }
  }
  return best;
}

export const MATCH_THRESHOLD = 0.6;

export interface Pair {
  left: number; // index dans la liste de gauche
  right: number; // index dans la liste de droite
  score: number;
}

/** Appariement un-pour-un, glouton par similarité décroissante. */
export function matchOneToOne(
  left: readonly (readonly Quoted[])[],
  right: readonly (readonly Quoted[])[],
  threshold = MATCH_THRESHOLD,
): Pair[] {
  const candidates: Pair[] = [];
  left.forEach((l, i) =>
    right.forEach((r, j) => {
      const score = similarity(l, r);
      if (score >= threshold) candidates.push({ left: i, right: j, score });
    }),
  );
  candidates.sort((x, y) => y.score - x.score || x.left - y.left || x.right - y.right);
  const usedLeft = new Set<number>();
  const usedRight = new Set<number>();
  const pairs: Pair[] = [];
  for (const c of candidates) {
    if (usedLeft.has(c.left) || usedRight.has(c.right)) continue;
    usedLeft.add(c.left);
    usedRight.add(c.right);
    pairs.push(c);
  }
  return pairs.sort((x, y) => x.left - y.left);
}
