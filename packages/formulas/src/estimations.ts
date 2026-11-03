/**
 * Formules d'estimation (≈) de la liste blanche : un chiffre du programme, adapté au profil par une
 * hypothèse écrite et sourcée. Les montants viennent des paramètres d'une mesure publiée (citation
 * exacte) et des données publiques de `data/donnees-publiques.json` (citation exacte, archivée) ;
 * ces fonctions ne contiennent que la règle d'adaptation. Résultats en €/mois.
 */
import { z } from "zod";

export const PublicDatum = z
  .object({
    id: z.string(),
    publisher: z.string(),
    title: z.string(),
    docType: z.enum(["statistique_publique", "texte_de_loi", "bareme_officiel", "chiffrage_independant"]),
    url: z.string().url(),
    year: z.number().int(),
    retrievedAt: z.string().datetime(),
    valeur: z.number(),
    unite: z.string(),
    /** Phrase de la source, mot pour mot (espaces insécables normalisés) ; contient `valeur`. */
    citation: z.string(),
    /** Texte de la page archivé, chemin relatif au paquet. */
    archive: z.string(),
  })
  .strict();
export type PublicDatum = z.infer<typeof PublicDatum>;
export const PublicData = z.array(PublicDatum);

export interface Range {
  low: number;
  high: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100 + 0;

/**
 * Baisse de cotisations sur le salaire net, pour chaque salarié du foyer :
 * - `gainAnnuelReference` : montant annoncé au salaire de référence (salaire médian), adapté en
 *   proportion du salaire ;
 * - `gainMensuelBas` / `gainMensuelHaut` : fourchette annoncée sans salaire de référence, reprise telle quelle.
 */
export function baisseCotisationsSalaire(
  salairesNets: readonly number[],
  params: Readonly<Record<string, number>>,
  salaireReference: number | null,
): Range {
  const salaries = salairesNets.filter((s) => s > 0);
  if (salaries.length === 0) return { low: 0, high: 0 };
  const annuel = params.gainAnnuelReference;
  if (annuel !== undefined) {
    if (salaireReference === null || salaireReference <= 0) throw new Error("Salaire de référence manquant.");
    const total = salaries.reduce((s, net) => s + (annuel / 12) * (net / salaireReference), 0);
    return { low: round2(total), high: round2(total) };
  }
  const bas = params.gainMensuelBas;
  const haut = params.gainMensuelHaut ?? bas;
  if (bas === undefined || haut === undefined) throw new Error("Paramètres de la baisse de cotisations manquants.");
  return { low: round2(bas * salaries.length), high: round2(haut * salaries.length) };
}

/** Baisse de la facture d'électricité, en %, appliquée à la facture annuelle moyenne d'un foyer. */
export function energieFacture(params: Readonly<Record<string, number>>, factureAnnuelle: number): Range {
  const bas = params.baissePourcentBas;
  const haut = params.baissePourcentHaut ?? bas;
  if (bas === undefined || haut === undefined) throw new Error("Paramètres de la baisse de facture manquants.");
  return { low: round2((factureAnnuelle / 12) * (bas / 100)), high: round2((factureAnnuelle / 12) * (haut / 100)) };
}

/**
 * Réduction d'impôt pour intérêts d'emprunt de la résidence principale : part des intérêts selon le
 * nombre d'enfants mineurs, dans la limite d'un plafond, et sans dépasser l'impôt dû (réduction).
 * Les intérêts sont ceux du cas type cité par le programme (le profil ne les demande pas).
 */
export function deductionInteretsEmprunt(
  enfantsMineurs: number,
  params: Readonly<Record<string, number>>,
  impotMensuelActuel: number | null,
): Range {
  const { interetsAnnuels, partUnEnfant, partDeuxEnfants, partTroisEnfants, plafondBase, plafondParEnfant } = params;
  if (
    [interetsAnnuels, partUnEnfant, partDeuxEnfants, partTroisEnfants, plafondBase, plafondParEnfant].some((v) => v === undefined)
  ) {
    throw new Error("Paramètres de la déduction des intérêts manquants.");
  }
  if (enfantsMineurs < 1) return { low: 0, high: 0 };
  const part = enfantsMineurs >= 3 ? partTroisEnfants! : enfantsMineurs === 2 ? partDeuxEnfants! : partUnEnfant!;
  const annuel = Math.min((interetsAnnuels! * part) / 100, plafondBase! + plafondParEnfant! * enfantsMineurs);
  const mensuel = Math.min(annuel / 12, Math.max(impotMensuelActuel ?? Infinity, 0));
  return { low: round2(mensuel), high: round2(mensuel) };
}

/**
 * Gain annoncé en pourcentage du salaire net (« environ 14 % de salaire net en plus »), appliqué au
 * salaire net de la personne. Cas type conditionnel : la condition (carrière complète…) n'est pas
 * connue du profil ; la ligne est affichée avec elle, hors solde.
 */
export function gainPourcentSalaireNet(salaireNet: number | null, params: Readonly<Record<string, number>>): Range {
  const pourcent = params.gainPourcentNet;
  if (pourcent === undefined) throw new Error("Paramètre gainPourcentNet manquant.");
  if (salaireNet === null || salaireNet <= 0) return { low: 0, high: 0 };
  const v = round2((salaireNet * pourcent) / 100);
  return { low: v, high: v };
}
