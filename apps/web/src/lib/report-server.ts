/** Côté serveur du signalement : contexte d'une mesure publiée et jeton GitHub. */
import { getProgrammes } from "./data";
import type { ReportedMeasure } from "./report";

export function findReportedMeasure(id: string): ReportedMeasure | null {
  for (const p of getProgrammes()) {
    const m = p.measures.find((x) => x.id === id);
    if (m) return { id: m.id, title: m.title, candidate: p.candidate.displayName, party: p.candidate.party, path: `/programme/${p.slug}/${m.id}` };
  }
  return null;
}

/** Jeton GitHub (droit « Issues : écriture » sur le dépôt seul) ; sans lui, le lien pré-rempli prend le relais. */
export function reportToken(): string | null {
  return process.env.SIGNALEMENT_GITHUB_TOKEN || null;
}
