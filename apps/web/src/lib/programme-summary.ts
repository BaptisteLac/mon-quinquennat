import type { Programme } from "./data";

/** Ce que les écrans du parcours affichent d'un programme (données sérialisables, sans les mesures). */
export interface ProgrammeSummary {
  id: string;
  slug: string;
  displayName: string;
  party: string;
  status: Programme["candidate"]["status"];
  badge: Programme["candidate"]["badge"];
  measureCount: number;
  corpusId: string;
}

export function summarize(p: Programme): ProgrammeSummary {
  return {
    id: p.candidate.id,
    slug: p.slug,
    displayName: p.candidate.displayName,
    party: p.candidate.party,
    status: p.candidate.status,
    badge: p.candidate.badge,
    measureCount: p.measures.length,
    corpusId: p.corpusId,
  };
}

export const STATUS_SHORT = { declaree: "candidature déclarée", officielle: "candidature officielle", retire: "candidature retirée" } as const;
