/** Fichier de résultat d'une exécution (`runs/<runId>.json`), relu par le script de score. */
import { createHash } from "node:crypto";
import { Measure } from "@mon-quinquennat/schema";
import { z } from "zod";
import { LlmMeasure } from "./llm-schema.js";
import { normalizeText } from "./normalize.js";

export const CallRecord = z.object({
  role: z.enum(["extraction_A", "extraction_B", "relecture"]),
  model: z.string(),
  batch: z.number().int().nullable(),
  inputTokens: z.number().int(),
  outputTokens: z.number().int(),
  error: z.string().nullable(),
});
export type CallRecord = z.infer<typeof CallRecord>;

export const CrossCheck = z.object({
  verdict: z.enum(["fidele", "infidele", "incertain"]),
  problems: z.array(z.string()),
});
export type CrossCheck = z.infer<typeof CrossCheck>;

export const RunRecord = z.object({
  /** Empreinte de la première citation normalisée : stable d'une exécution à l'autre (sert aux adjudications). */
  key: z.string(),
  extraction: z.enum(["A", "B"]),
  batch: z.number().int(),
  raw: LlmMeasure,
  formatErrors: z.array(z.string()),
  /** Mesure complète (avec sa vérification) si le format est valide. */
  measure: Measure.nullable(),
  review: Measure.shape.review,
  crossCheck: CrossCheck.nullable(),
  /** Clé de la mesure appariée dans l'autre extraction. */
  pairedWith: z.string().nullable(),
});
export type RunRecord = z.infer<typeof RunRecord>;

export const RunFile = z.object({
  runId: z.string(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime(),
  document: z.object({
    id: z.string(),
    candidateId: z.string(),
    sha256: z.string(),
    totalPages: z.number().int().positive(),
  }),
  pagesProcessed: z.array(z.number().int().positive()),
  config: z.object({
    promptVersion: z.string(),
    promptSha256: z.string(),
    crossCheckPromptVersion: z.string(),
    crossCheckPromptSha256: z.string(),
    models: z.object({ extractA: z.string(), extractB: z.string().nullable(), crossCheck: z.string().nullable() }),
    effort: z.string(),
    batchPages: z.number().int().positive(),
  }),
  calls: z.array(CallRecord),
  records: z.array(RunRecord),
});
export type RunFile = z.infer<typeof RunFile>;

export function sha256(data: string | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

/** Clés stables et uniques dans une liste de mesures. */
export function measureKeys(firstQuotes: readonly string[]): string[] {
  const seen = new Map<string, number>();
  return firstQuotes.map((q) => {
    const base = sha256(normalizeText(q)).slice(0, 12);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  });
}
