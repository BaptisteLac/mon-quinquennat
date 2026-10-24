/**
 * Vérité terrain : mesures relevées à la main dans 3 sections d'un programme réel.
 * Sert de référence au score ; n'est jamais produite par un LLM.
 */
import { SourceQuote } from "@mon-quinquennat/schema";
import { z } from "zod";
import type { Corpus } from "./corpus.js";

/** Valeur chiffrée attendue : nombre (taux, montant, âge…) ou date (AAAA, AAAA-MM ou AAAA-MM-JJ). */
export const ExpectedValue = z.object({
  label: z.string(), // « taux de la 2e tranche »
  value: z.union([z.number(), z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/)]),
  unit: z.enum(["pourcent", "euros", "ans", "mois", "heures", "date", "autre"]),
});
export type ExpectedValue = z.infer<typeof ExpectedValue>;

/** Une section = un ou plusieurs documents du corpus (pages web), ou une plage de pages d'un PDF. */
export const GroundTruthSection = z.object({
  id: z.string(), // « fiscalite »
  label: z.string(),
  parts: z
    .array(
      z.object({
        documentId: z.string(),
        /** Pages du document (1 = première page du fichier). Absent = tout le document. */
        pages: z.object({ from: z.number().int().positive(), to: z.number().int().positive() }).optional(),
      }),
    )
    .min(1),
});
export type GroundTruthSection = z.infer<typeof GroundTruthSection>;

export const GroundTruthMeasure = z.object({
  id: z.string(), // « gt-01 »
  sectionId: z.string(),
  documentId: z.string(),
  page: SourceQuote.shape.page.default(1), // 1 pour une page web courte
  quote: SourceQuote.shape.quote,
  description: z.string(), // ce que dit la mesure, en une phrase, pour la relecture humaine
  values: z.array(ExpectedValue).default([]), // vide = mesure qualitative
});
export type GroundTruthMeasure = z.infer<typeof GroundTruthMeasure>;

export const GroundTruth = z
  .object({
    /** Manifeste du corpus, relatif à la racine du dépôt (data/archives/ n'est pas commité). */
    corpus: z.string(),
    /** Empreinte du manifeste : la vérité terrain porte sur une collecte précise. */
    corpusSha256: z.string().length(64),
    sections: z.array(GroundTruthSection).min(1),
    measures: z.array(GroundTruthMeasure).min(1),
    annotatedBy: z.string(),
    annotatedAt: z.string().date(),
  })
  .superRefine((gt, ctx) => {
    const sections = new Set(gt.sections.map((s) => s.id));
    const ids = new Set<string>();
    gt.measures.forEach((m, i) => {
      if (ids.has(m.id)) ctx.addIssue({ code: "custom", path: ["measures", i, "id"], message: `id en double : ${m.id}` });
      ids.add(m.id);
      if (!sections.has(m.sectionId)) {
        ctx.addIssue({ code: "custom", path: ["measures", i, "sectionId"], message: `section inconnue : ${m.sectionId}` });
      }
    });
  });
export type GroundTruth = z.infer<typeof GroundTruth>;

/** Vérité terrain rapportée aux pages du corpus. */
export interface ResolvedGroundTruth {
  gt: GroundTruth;
  /** Pages du corpus couvertes par les sections annotées. */
  scope: Set<number>;
  measures: (GroundTruthMeasure & { unit: number })[];
}

/** Vérifie que chaque document et chaque page existent dans le corpus, et que chaque mesure est dans sa section. */
export function resolveGroundTruth(gt: GroundTruth, corpus: Corpus): ResolvedGroundTruth {
  if (gt.corpusSha256 !== corpus.manifestSha256) {
    throw new Error("La vérité terrain porte sur une autre collecte (empreinte du manifeste différente)");
  }
  const errors: string[] = [];
  const sectionUnits = new Map<string, Set<number>>();
  for (const s of gt.sections) {
    const units = new Set<number>();
    for (const part of s.parts) {
      const docUnits = corpus.units.filter((u) => u.documentId === part.documentId);
      if (docUnits.length === 0) errors.push(`section ${s.id} : document inconnu ${part.documentId}`);
      for (const u of docUnits) {
        if (!part.pages || (u.page >= part.pages.from && u.page <= part.pages.to)) units.add(u.index);
      }
    }
    sectionUnits.set(s.id, units);
  }
  const measures = gt.measures.flatMap((m) => {
    const unit = corpus.unitOf(m.documentId, m.page);
    if (unit === null) {
      errors.push(`${m.id} : page ${m.page} de ${m.documentId} absente du corpus`);
      return [];
    }
    if (!sectionUnits.get(m.sectionId)?.has(unit)) errors.push(`${m.id} : hors des pages de la section ${m.sectionId}`);
    return [{ ...m, unit }];
  });
  if (errors.length > 0) throw new Error(`Vérité terrain incohérente avec le corpus :\n  - ${errors.join("\n  - ")}`);
  return { gt, scope: new Set([...sectionUnits.values()].flatMap((s) => [...s])), measures };
}
