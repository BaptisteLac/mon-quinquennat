/**
 * Extractions écrites dans une session Claude Code (sans appel d'API) : même contenu que la sortie
 * du LLM (`LlmMeasure`), avec des valeurs par défaut pour ne pas répéter les champs vides.
 * Fichiers : data/extractions/<corpus>/*.json ; relecture du sens : data/extractions/<corpus>/relecture.json.
 */
import { z } from "zod";
import { LlmMeasure } from "./llm-schema.js";

/** Règle unique pour tous les candidats quand le programme ne donne pas de date. */
export const DEFAULT_SCHEDULE = {
  effectiveDate: "2028-01-01",
  dateOrigin: "estimee" as const,
  estimationRule: "Date non annoncée : 1er janvier suivant la première loi de finances du quinquennat (règle par défaut)",
};

const s = LlmMeasure.shape;
const effect = s.effects.element.shape;
const computation = effect.computation.shape;

const AuthoredComputation = z.object({
  kind: computation.kind,
  reform: computation.reform.default([]),
  formulaId: computation.formulaId.default(null),
  params: computation.params.default([]),
  hypothesisLabel: computation.hypothesisLabel.default(null),
});

const AuthoredEffect = z.object({
  ticketLine: effect.ticketLine,
  section: effect.section,
  appliesTo: effect.appliesTo.default({ all: [] }),
  computation: AuthoredComputation.default({ kind: "qualitatif" }),
  sentence: effect.sentence.default(null),
});

export const AuthoredMeasure = z
  .object({
    theme: s.theme,
    title: s.title,
    summary: s.summary,
    sources: s.sources,
    rationale: s.rationale.default(null),
    subMeasures: s.subMeasures.default([]),
    precision: s.precision,
    legalPath: s.legalPath.default("inconnu"),
    schedule: s.schedule.default(DEFAULT_SCHEDULE),
    effects: z.array(AuthoredEffect).default([]),
  })
  .strict();

export const AuthoredFile = z.object({ measures: z.array(AuthoredMeasure) }).strict();

/** Après application des valeurs par défaut, c'est exactement une sortie de LLM. */
export function toLlmMeasure(m: z.infer<typeof AuthoredMeasure>): LlmMeasure {
  return LlmMeasure.parse(m);
}

export const MeaningReviews = z.record(
  z.string(),
  z.object({ verdict: z.enum(["fidele", "a_revoir"]), note: z.string().optional() }).strict(),
);
