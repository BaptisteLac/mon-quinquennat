import type { Measure } from "@mon-quinquennat/schema";
import type { SourceDocument } from "./data";
import { natureKind, natureLabel, type NatureKind } from "./nature";
import { THEME_LABELS } from "./themes";

/** Ce qu'une carte de mesure affiche : seulement le nécessaire, pour alléger la page envoyée au navigateur. */
export interface MeasureCard {
  id: string;
  theme: Measure["theme"];
  themeLabel: string;
  title: string;
  summary: string;
  nature: NatureKind;
  natureLabel: string;
  quote: string;
  /** Lien vers la version officielle du document cité (page du PDF quand c'est un PDF). */
  sourceUrl: string;
  /** « p. 12 » pour un PDF, titre de la page pour une page web. */
  sourceLabel: string;
}

export function toMeasureCard(m: Measure, documents: Readonly<Record<string, SourceDocument>>): MeasureCard {
  const source = m.sources[0];
  if (!source) throw new Error(`${m.id} sans citation`);
  const doc = documents[source.documentId];
  if (!doc) throw new Error(`${m.id} cite ${source.documentId}, document inconnu`);
  const isPdf = doc.kind === "pdf";
  return {
    id: m.id,
    theme: m.theme,
    themeLabel: THEME_LABELS[m.theme],
    title: m.title,
    summary: m.summary.simple,
    nature: natureKind(m),
    natureLabel: natureLabel(m),
    quote: source.quote,
    sourceUrl: isPdf ? `${doc.officialUrl}#page=${source.page}` : doc.officialUrl,
    sourceLabel: isPdf ? `p. ${source.page}` : (doc.title ?? "page du site officiel"),
  };
}
