/**
 * Formule de la liste blanche `retraite_age_depart` : âge légal de départ, règles actuelles et
 * règles d'un candidat.
 *
 * Les règles actuelles (âge légal par génération) sont des données sourcées, jamais écrites dans le
 * code : chaque ligne du barème porte la référence du texte officiel dont elle est tirée.
 */
import { z } from "zod";
import type { Profile } from "@mon-quinquennat/schema";

export const AgeMonths = z.object({ ans: z.number().int().min(50).max(75), mois: z.number().int().min(0).max(11) });
export type AgeMonths = z.infer<typeof AgeMonths>;

export const LegalAgeRule = z
  .object({
    /** Années de naissance couvertes, bornes incluses ; null = sans borne. */
    generationDebut: z.number().int().nullable(),
    generationFin: z.number().int().nullable(),
    age: AgeMonths,
    source: z.object({ texte: z.string(), url: z.string().url(), citation: z.string(), consulteLe: z.string().date() }),
  })
  .strict();

export const LegalAgeTable = z
  .object({ status: z.literal("source"), rules: z.array(LegalAgeRule).min(1) })
  .strict()
  .or(z.object({ status: z.literal("a_caler_pendant_le_test"), rules: z.array(LegalAgeRule).length(0) }).strict());
export type LegalAgeTable = z.infer<typeof LegalAgeTable>;

export function legalAgeFor(birthYear: number, table: LegalAgeTable): AgeMonths {
  if (table.status !== "source") throw new Error("Barème de l'âge légal non sourcé : formule inutilisable.");
  const hits = table.rules.filter(
    (r) => (r.generationDebut === null || birthYear >= r.generationDebut) && (r.generationFin === null || birthYear <= r.generationFin),
  );
  if (hits.length !== 1) throw new Error(`Barème ambigu ou incomplet pour la génération ${birthYear} (${hits.length} règles).`);
  return hits[0]!.age;
}

export const toMonths = (a: AgeMonths): number => 12 * a.ans + a.mois;

export type RetirementAgeResult =
  | { applicable: false; reason: string }
  | {
      applicable: true;
      actuel: AgeMonths;
      candidat: AgeMonths;
      /** Mois de travail en plus (positif) ou en moins (négatif) avant l'âge légal. */
      ecartMois: number;
      /** Génération déduite de l'âge : peut être décalée d'un an (date de naissance non demandée). */
      generationsPossibles: [number, number];
      ecartMoisSelonGeneration: [number, number];
    };

/**
 * `params.ageLegal` (en années) vient des paramètres d'une mesure publiée, avec sa citation.
 * La génération est déduite de l'âge à la date de référence : deux années possibles.
 */
export function retraiteAgeDepart(
  profile: Pick<Profile, "age" | "situationPro">,
  params: { ageLegal: number; ageLegalMois?: number },
  table: LegalAgeTable,
  referenceYear: number,
): RetirementAgeResult {
  if (profile.situationPro === "retraite") return { applicable: false, reason: "Déjà retraité." };
  const candidat = AgeMonths.parse({ ans: params.ageLegal, mois: params.ageLegalMois ?? 0 });
  const gens: [number, number] = [referenceYear - profile.age - 1, referenceYear - profile.age];
  const ecarts = gens.map((g) => toMonths(candidat) - toMonths(legalAgeFor(g, table))) as [number, number];
  // Génération retenue pour l'affichage : la plus récente (anniversaire déjà passé dans l'année).
  const actuel = legalAgeFor(gens[1], table);
  return {
    applicable: true,
    actuel,
    candidat,
    ecartMois: toMonths(candidat) - toMonths(actuel),
    generationsPossibles: gens,
    ecartMoisSelonGeneration: ecarts,
  };
}
