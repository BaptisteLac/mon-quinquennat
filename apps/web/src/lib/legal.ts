/**
 * Identité de l'éditeur et des hébergeurs (`data/mentions-legales.json`), affichée par la page
 * Mentions légales. Rien n'est écrit de mémoire : chaque hébergeur renvoie à ses propres mentions.
 * Un site public (`SITE_URL` défini) ne se construit pas sans ces informations.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

export const LegalInfo = z.object({
  editeur: z
    .object({
      /** Nom de la personne ou de l'organisme, ou « Particulier, non professionnel » (LCEN). */
      nom: z.string().min(1),
      /** Précision affichée sous le nom (ex. identité communiquée à l'hébergeur). */
      mention: z.string().min(1).optional(),
      /** Adresse électronique ou formulaire de contact ; facultatif pour un particulier non professionnel. */
      contact: z.string().min(1).optional(),
      directeurPublication: z.string().min(1).optional(),
    })
    .nullable(),
  hebergeurs: z.array(
    z.object({
      /** Ce qui est hébergé : « Site », « Service de calcul »… */
      role: z.string().min(1),
      nom: z.string().min(1),
      adresse: z.string().min(1),
      telephone: z.string().min(1).optional(),
      /** Page officielle d'où viennent ces informations. */
      source: z.string().url(),
    }),
  ),
});
export type LegalInfo = z.infer<typeof LegalInfo>;

export function loadLegalInfo(dataDir: string): LegalInfo {
  return LegalInfo.parse(JSON.parse(readFileSync(join(dataDir, "mentions-legales.json"), "utf8")));
}

/** Ce qui manque pour publier le site ; vide quand les mentions sont complètes. */
export function missingLegalInfo(info: LegalInfo): string[] {
  return [...(info.editeur ? [] : ["éditeur"]), ...(info.hebergeurs.length > 0 ? [] : ["hébergeur"])];
}

/** Un site public ne se construit pas avec des mentions légales incomplètes. */
export function assertPublishable(info: LegalInfo, siteUrl = process.env.SITE_URL): void {
  const missing = missingLegalInfo(info);
  if (siteUrl && !/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(siteUrl) && missing.length > 0) {
    throw new Error(`Mentions légales incomplètes (${missing.join(", ")}) : remplir data/mentions-legales.json avant la mise en ligne.`);
  }
}
