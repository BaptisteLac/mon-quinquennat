/**
 * Formule de la liste blanche `retraite_age_depart` : âge légal de départ, règles actuelles et
 * règles d'un candidat.
 *
 * Les règles actuelles (âge légal selon la date de naissance) sont des données sourcées, jamais
 * écrites dans le code : chaque ligne du barème porte la citation exacte de sa source officielle.
 */
import { z } from "zod";
import type { Profile } from "@mon-quinquennat/schema";

export const AgeMonths = z.object({ ans: z.number().int().min(50).max(75), mois: z.number().int().min(0).max(11) });
export type AgeMonths = z.infer<typeof AgeMonths>;

export const LegalAgeRule = z
  .object({
    /** Dates de naissance couvertes, bornes incluses (AAAA-MM-JJ) ; null = sans borne. */
    naissanceDebut: z.string().date().nullable(),
    naissanceFin: z.string().date().nullable(),
    age: AgeMonths,
    /** Cellules du tableau officiel, citées mot pour mot. */
    citation: z.object({ naissance: z.string(), age: z.string() }),
  })
  .strict();

export const LegalAgeTable = z
  .object({
    status: z.literal("source"),
    source: z.object({ titre: z.string(), url: z.string().url(), verifieLe: z.string().date(), consulteLe: z.string().date(), archive: z.string() }),
    rules: z.array(LegalAgeRule).min(1),
  })
  .strict()
  .or(z.object({ status: z.literal("a_caler_pendant_le_test"), rules: z.array(LegalAgeRule).length(0) }).strict());
export type LegalAgeTable = z.infer<typeof LegalAgeTable>;

const covers = (r: z.infer<typeof LegalAgeRule>, d: string) =>
  (r.naissanceDebut === null || d >= r.naissanceDebut) && (r.naissanceFin === null || d <= r.naissanceFin);

/** Âge légal pour une date de naissance ; null si le barème ne couvre pas cette date. */
export function legalAgeFor(birthDate: string, table: LegalAgeTable): AgeMonths | null {
  if (table.status !== "source") throw new Error("Barème de l'âge légal non sourcé : formule inutilisable.");
  const hits = table.rules.filter((r) => covers(r, birthDate));
  if (hits.length > 1) throw new Error(`Barème ambigu pour une naissance le ${birthDate} (${hits.length} règles).`);
  return hits[0]?.age ?? null;
}

export const toMonths = (a: AgeMonths): number => 12 * a.ans + a.mois;

export type RetirementAgeResult =
  | { applicable: false; reason: string }
  | {
      applicable: true;
      candidat: AgeMonths;
      /** Âges légaux actuels possibles : la date de naissance n'est pas demandée, seulement l'âge. */
      actuels: AgeMonths[];
      /** Mois de travail en plus (positif) ou en moins (négatif) avant l'âge légal, du plus petit au plus grand. */
      ecartMois: [number, number];
    };

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * `params.ageLegal` (en années) vient des paramètres d'une mesure publiée, avec sa citation.
 * Avec l'âge seul, la naissance se situe dans une fenêtre d'un an avant `referenceDate` : on donne
 * l'écart pour toute la fenêtre (deux valeurs si elle chevauche deux lignes du barème).
 */
export function retraiteAgeDepart(
  profile: Pick<Profile, "age" | "situationPro">,
  params: { ageLegal: number; ageLegalMois?: number },
  table: LegalAgeTable,
  referenceDate: string,
): RetirementAgeResult {
  if (profile.situationPro === "retraite") return { applicable: false, reason: "Déjà retraité." };
  const candidat = AgeMonths.parse({ ans: params.ageLegal, mois: params.ageLegalMois ?? 0 });
  const year = Number(referenceDate.slice(0, 4));
  const latest = `${year - profile.age}${referenceDate.slice(4)}`; // anniversaire déjà passé
  const earliest = addDays(`${year - profile.age - 1}${referenceDate.slice(4)}`, 1);
  if (table.status !== "source") throw new Error("Barème de l'âge légal non sourcé : formule inutilisable.");
  const ages: AgeMonths[] = [];
  for (const d of [earliest, latest, ...table.rules.flatMap((r) => [r.naissanceDebut, r.naissanceFin])]) {
    if (d === null || d < earliest || d > latest) continue;
    const a = legalAgeFor(d, table);
    if (a === null) {
      return { applicable: false, reason: "Génération non couverte par le barème officiel (âge légal déjà atteint)." };
    }
    if (!ages.some((x) => toMonths(x) === toMonths(a))) ages.push(a);
  }
  ages.sort((x, y) => toMonths(x) - toMonths(y));
  const ecarts = ages.map((a) => toMonths(candidat) - toMonths(a));
  return { applicable: true, candidat, actuels: ages, ecartMois: [Math.min(...ecarts), Math.max(...ecarts)] };
}
