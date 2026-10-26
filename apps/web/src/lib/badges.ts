import { Candidate } from "@mon-quinquennat/schema";

export type Badge = Candidate["badge"];
export const BADGES: readonly Badge[] = Candidate.shape.badge.options;

/**
 * Tire au sort un badge de forme pour chaque candidat qui n'en a pas encore, parmi les formes libres.
 * Un badge déjà attribué ne change jamais (repère stable d'un écran à l'autre).
 */
export function drawBadges(
  existing: Readonly<Record<string, Badge>>,
  candidateIds: readonly string[],
  random: () => number,
): Record<string, Badge> {
  const out: Record<string, Badge> = { ...existing };
  for (const id of candidateIds) {
    if (out[id]) continue;
    const used = new Set(Object.values(out));
    const free = BADGES.filter((b) => !used.has(b));
    if (free.length === 0) throw new Error(`Plus de badge libre pour ${id} : ajouter une forme au schéma.`);
    out[id] = free[Math.floor(random() * free.length)] as Badge;
  }
  return out;
}
