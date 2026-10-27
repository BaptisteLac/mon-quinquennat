/**
 * Catalogue des mesures publiées, servi au navigateur en un seul fichier statique (`/donnees/mesures.json`)
 * pour la frise et les fiches « d'où vient ce chiffre ». Un seul fichier pour tous les candidats :
 * le serveur ne peut pas savoir lesquels l'utilisateur a choisis.
 */
import type { Measure } from "@mon-quinquennat/schema";
import type { Programme } from "./data";

export interface CatalogMeasure {
  id: string;
  candidateId: string;
  theme: Measure["theme"];
  title: string;
  summary: string;
  precision: Measure["precision"];
  legalPath: Measure["legalPath"];
  schedule: Measure["schedule"];
  effects: { ticketLine: Measure["effects"][number]["ticketLine"]; sentence: string | null }[];
  sources: { quote: string; page: number; documentId: string }[];
  checks: Measure["review"]["checks"][number]["id"][];
  extractedAt: string;
}

export interface CatalogProgramme {
  id: string;
  slug: string;
  displayName: string;
  party: string;
  badge: Programme["candidate"]["badge"];
  corpusId: string;
  collectedAt: string;
  documents: Record<string, { officialUrl: string; title: string | null; kind: "html" | "pdf" }>;
}

export interface Catalog {
  programmes: Record<string, CatalogProgramme>;
  measures: Record<string, CatalogMeasure>;
}

export function buildCatalog(programmes: readonly Programme[]): Catalog {
  const catalog: Catalog = { programmes: {}, measures: {} };
  for (const p of programmes) {
    const used = new Set<string>();
    for (const m of p.measures) {
      catalog.measures[m.id] = {
        id: m.id,
        candidateId: m.candidateId,
        theme: m.theme,
        title: m.title,
        summary: m.summary.simple,
        precision: m.precision,
        legalPath: m.legalPath,
        schedule: m.schedule,
        effects: m.effects.map((e) => ({ ticketLine: e.ticketLine, sentence: e.sentence?.simple ?? null })),
        sources: m.sources.map((s) => ({ quote: s.quote, page: s.page, documentId: s.documentId })),
        checks: m.review.checks.filter((c) => c.passed).map((c) => c.id),
        extractedAt: m.review.extractedBy.at,
      };
      for (const s of m.sources) used.add(s.documentId);
    }
    catalog.programmes[p.candidate.id] = {
      id: p.candidate.id,
      slug: p.slug,
      displayName: p.candidate.displayName,
      party: p.candidate.party,
      badge: p.candidate.badge,
      corpusId: p.corpusId,
      collectedAt: p.collectedAt,
      documents: Object.fromEntries(
        [...used].flatMap((id) => {
          const d = p.documents[id];
          return d ? [[id, { officialUrl: d.officialUrl, title: d.title, kind: d.kind }]] : [];
        }),
      ),
    };
  }
  return catalog;
}

/** Lien vers le passage cité : page du PDF, ou la page web officielle. */
export function sourceLink(doc: CatalogProgramme["documents"][string], page: number): string {
  return doc.kind === "pdf" ? `${doc.officialUrl}#page=${page}` : doc.officialUrl;
}

export function sourcePlace(doc: CatalogProgramme["documents"][string], page: number): string {
  return doc.kind === "pdf" ? `p. ${page}` : (doc.title ?? "page du site officiel");
}

/** Phrase d'un effet pour une ligne du ticket ; à défaut, le résumé de la mesure. */
export function effectSentence(m: CatalogMeasure, ticketLine: CatalogMeasure["effects"][number]["ticketLine"]): string {
  return m.effects.find((e) => e.ticketLine === ticketLine && e.sentence)?.sentence ?? m.summary;
}
