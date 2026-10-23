/**
 * Ce que le LLM renvoie (schéma « de transport »), et sa conversion en brouillon de `Measure`.
 *
 * Le schéma de transport reste simple pour passer dans les sorties structurées des fournisseurs :
 * pas de récursion, pas de dictionnaire libre, pas de champ optionnel (null à la place).
 * Le brouillon obtenu est ensuite validé par le vrai schéma `Measure` (contrôle « format »).
 * Champs laissés au code, jamais au LLM : identifiants, document source, contexte chiffré,
 * chiffrages, liens de financement, vérification (`review`).
 */
import { Measure, ProfileField, Theme, TicketLine, type Condition } from "@mon-quinquennat/schema";
import { z } from "zod";
import type { Quoted } from "./match.js";

const LlmQuote = z.object({
  page: z.number().int().describe("Numéro de page du PDF indiqué dans la balise <page>"),
  quote: z.string().describe("Citation recopiée mot pour mot, sans coupure ni ellipse"),
});

const LlmLeafCondition = z.object({
  field: ProfileField,
  op: z.enum(["eq", "in", "gte", "lte"]),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number()]))]),
});

/** Conditions sur deux niveaux au plus : c'est un sous-ensemble du mini-langage `Condition`. */
const LlmCondition = z.union([
  LlmLeafCondition,
  z.object({ all: z.array(z.union([LlmLeafCondition, z.object({ not: LlmLeafCondition })])) }),
  z.object({ any: z.array(z.union([LlmLeafCondition, z.object({ not: LlmLeafCondition })])) }),
  z.object({ not: LlmLeafCondition }),
]);

const LlmComputation = z.object({
  kind: z.enum(["bareme", "formule", "estimation", "qualitatif"]),
  /** bareme : paramètres de la législation modifiés, décrits en clair (le chemin OpenFisca est calé par le code). */
  reform: z.array(z.object({ parameter: z.string(), value: z.number(), from: z.string() })),
  formulaId: z
    .enum(["retraite_age_depart", "revalorisation_pension", "smic_mensuel_net", "tva_consommation", "energie_facture"])
    .nullable(),
  params: z.array(z.object({ name: z.string(), value: z.number() })),
  hypothesisLabel: z.string().nullable(),
});

const LlmTwoLevels = z.object({ simple: z.string(), normal: z.string() });

export const LlmMeasure = z.object({
  theme: Theme,
  title: z.string(),
  summary: LlmTwoLevels,
  sources: z.array(LlmQuote),
  rationale: LlmQuote.nullable(),
  subMeasures: z.array(z.object({ text: z.string(), source: LlmQuote })),
  precision: Measure.shape.precision,
  legalPath: Measure.shape.legalPath,
  schedule: z.object({
    effectiveDate: z.string().describe("AAAA-MM-JJ"),
    dateOrigin: z.enum(["annoncee", "estimee"]),
    estimationRule: z.string().nullable(),
  }),
  effects: z.array(
    z.object({
      ticketLine: TicketLine,
      section: z.enum(["portefeuille", "temps", "vie"]),
      appliesTo: LlmCondition,
      computation: LlmComputation,
      sentence: LlmTwoLevels.nullable(),
    }),
  ),
});
export type LlmMeasure = z.infer<typeof LlmMeasure>;

export const LlmExtraction = z.object({ measures: z.array(LlmMeasure) });
export type LlmExtraction = z.infer<typeof LlmExtraction>;

/** Brouillon : une `Measure` complète, sauf la vérification. */
export const MeasureDraft = Measure.omit({ review: true });
export type MeasureDraft = z.infer<typeof MeasureDraft>;

/** Placeholder explicite : la source de l'hypothèse d'une estimation est choisie par un humain, jamais par le LLM. */
export const HYPOTHESIS_SOURCE_PLACEHOLDER = "a_definir";

type LlmComputation = z.infer<typeof LlmComputation>;

function toComputation(c: LlmComputation): unknown {
  const params = Object.fromEntries(c.params.map((p) => [p.name, p.value]));
  switch (c.kind) {
    case "bareme":
      return { kind: "bareme", engine: "openfisca", reform: c.reform };
    case "formule":
      return { kind: "formule", formulaId: c.formulaId, params };
    case "estimation":
      return {
        kind: "estimation",
        formulaId: c.formulaId,
        params,
        hypothesis: { label: c.hypothesisLabel ?? "", dataSourceId: HYPOTHESIS_SOURCE_PLACEHOLDER },
      };
    case "qualitatif":
      return { kind: "qualitatif" };
  }
}

/**
 * Convertit la sortie du LLM en objet à valider par `MeasureDraft`.
 * Ne valide rien elle-même : une incohérence (formule inconnue pour un barème, date invalide…)
 * est laissée telle quelle pour que le contrôle « format » la rejette.
 */
export function toDraftInput(m: LlmMeasure, ids: { id: string; candidateId: string; documentId: string }): unknown {
  const quote = (q: { page: number; quote: string }) => ({ documentId: ids.documentId, page: q.page, quote: q.quote });
  return {
    id: ids.id,
    candidateId: ids.candidateId,
    theme: m.theme,
    title: m.title,
    summary: m.summary,
    sources: m.sources.map(quote),
    ...(m.rationale ? { rationale: quote(m.rationale) } : {}),
    subMeasures: m.subMeasures.map((s) => ({ text: s.text, source: quote(s.source) })),
    precision: m.precision,
    legalPath: m.legalPath,
    schedule: {
      effectiveDate: m.schedule.effectiveDate,
      dateOrigin: m.schedule.dateOrigin,
      ...(m.schedule.estimationRule ? { estimationRule: m.schedule.estimationRule } : {}),
    },
    effects: m.effects.map((e, i) => ({
      id: `${ids.id}-e${i + 1}`,
      ticketLine: e.ticketLine,
      section: e.section,
      appliesTo: e.appliesTo satisfies Condition,
      computation: toComputation(e.computation),
      ...(e.sentence ? { sentence: e.sentence } : {}),
    })),
    version: 1,
  };
}

/** Toutes les citations d'une mesure (sources, justification, sous-mesures), brute ou validée. */
export function allQuotes(m: {
  sources: readonly Quoted[];
  rationale?: Quoted | null | undefined;
  subMeasures: readonly { source: Quoted }[];
}): Quoted[] {
  return [...m.sources, ...(m.rationale ? [m.rationale] : []), ...m.subMeasures.map((s) => s.source)];
}
