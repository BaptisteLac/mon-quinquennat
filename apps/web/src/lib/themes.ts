import type { Measure } from "@mon-quinquennat/schema";

type Theme = Measure["theme"];

/** Libellés affichés des thèmes du schéma. */
export const THEME_LABELS: Record<Theme, string> = {
  fiscalite: "Impôts",
  prestations: "Aides",
  retraite: "Retraite",
  travail: "Travail",
  logement: "Logement",
  energie: "Énergie",
  education: "Éducation",
  sante: "Santé",
  transport: "Transports",
  famille: "Famille",
  entreprise: "Entreprises",
  finances_publiques: "Finances publiques",
  institutions: "Institutions",
  securite: "Sécurité",
  justice: "Justice",
  immigration: "Immigration",
  agriculture: "Agriculture",
  environnement: "Environnement",
  international: "International",
  numerique: "Numérique",
  autre: "Autres",
};

/** Thèmes présents, du plus fourni au moins fourni (ordre alphabétique à égalité). */
export function themesByCount(measures: readonly Pick<Measure, "theme">[]): { theme: Theme; count: number }[] {
  const counts = new Map<Theme, number>();
  for (const m of measures) counts.set(m.theme, (counts.get(m.theme) ?? 0) + 1);
  return [...counts]
    .map(([theme, count]) => ({ theme, count }))
    .sort((a, b) => b.count - a.count || THEME_LABELS[a.theme].localeCompare(THEME_LABELS[b.theme], "fr"));
}
