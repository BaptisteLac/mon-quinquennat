/**
 * Vérité terrain : mesures relevées à la main dans 3 sections d'un programme réel.
 * Sert de référence au score ; n'est jamais produite par un LLM.
 */
import { ProgrammeDocument, SourceQuote } from "@mon-quinquennat/schema";
import { z } from "zod";

/** Valeur chiffrée attendue : nombre (taux, montant, âge…) ou date (AAAA, AAAA-MM ou AAAA-MM-JJ). */
export const ExpectedValue = z.object({
  label: z.string(), // « taux de la 2e tranche »
  value: z.union([z.number(), z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/)]),
  unit: z.enum(["pourcent", "euros", "ans", "mois", "heures", "date", "autre"]),
});
export type ExpectedValue = z.infer<typeof ExpectedValue>;

export const GroundTruthSection = z.object({
  id: z.string(), // « fiscalite »
  label: z.string(),
  /** Pages du PDF (1 = première page du fichier, pas le numéro imprimé). */
  pages: z.object({ from: z.number().int().positive(), to: z.number().int().positive() }),
});
export type GroundTruthSection = z.infer<typeof GroundTruthSection>;

export const GroundTruthMeasure = z.object({
  id: z.string(), // « gt-01 »
  sectionId: z.string(),
  page: SourceQuote.shape.page,
  quote: SourceQuote.shape.quote,
  description: z.string(), // ce que dit la mesure, en une phrase, pour la relecture humaine
  values: z.array(ExpectedValue).default([]), // vide = mesure qualitative
});
export type GroundTruthMeasure = z.infer<typeof GroundTruthMeasure>;

export const GroundTruth = z
  .object({
    document: ProgrammeDocument.extend({
      /** Chemin local du PDF archivé, relatif à la racine du dépôt (data/archives/ n'est pas commité). */
      localPath: z.string(),
      totalPages: z.number().int().positive(),
    }),
    sections: z.array(GroundTruthSection).min(1),
    measures: z.array(GroundTruthMeasure).min(1),
    annotatedBy: z.string(),
    annotatedAt: z.string().date(),
  })
  .superRefine((gt, ctx) => {
    const sections = new Map(gt.sections.map((s) => [s.id, s]));
    const ids = new Set<string>();
    gt.measures.forEach((m, i) => {
      if (ids.has(m.id)) ctx.addIssue({ code: "custom", path: ["measures", i, "id"], message: `id en double : ${m.id}` });
      ids.add(m.id);
      const section = sections.get(m.sectionId);
      if (!section) {
        ctx.addIssue({ code: "custom", path: ["measures", i, "sectionId"], message: `section inconnue : ${m.sectionId}` });
      } else if (m.page < section.pages.from || m.page > section.pages.to) {
        ctx.addIssue({
          code: "custom",
          path: ["measures", i, "page"],
          message: `page ${m.page} hors de la section ${section.id} (${section.pages.from}–${section.pages.to})`,
        });
      }
    });
    gt.sections.forEach((s, i) => {
      if (s.pages.from > s.pages.to || s.pages.to > gt.document.totalPages) {
        ctx.addIssue({ code: "custom", path: ["sections", i, "pages"], message: "plage de pages invalide" });
      }
    });
  });
export type GroundTruth = z.infer<typeof GroundTruth>;

/** Une page appartient-elle au périmètre annoté (l'une des sections) ? */
export function inScope(page: number, sections: readonly GroundTruthSection[]): boolean {
  return sections.some((s) => page >= s.pages.from && page <= s.pages.to);
}
