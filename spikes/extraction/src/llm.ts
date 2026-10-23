/**
 * Appels LLM : extraction et relecture croisée. Le LLM lit et reformule ; il ne calcule rien
 * et ne produit aucun code exécuté. Toute sortie est validée par un schéma Zod.
 */
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { generateText, Output, type LanguageModel } from "ai";
import { LlmExtraction, type LlmMeasure } from "./llm-schema.js";
import { CrossCheck } from "./run.js";

/** « fournisseur:modèle », ex. « anthropic:claude-opus-5-5 ». */
export function parseModelSpec(spec: string): { provider: "anthropic" | "openai"; model: string } {
  const [provider, ...rest] = spec.split(":");
  const model = rest.join(":");
  if ((provider !== "anthropic" && provider !== "openai") || model.length === 0) {
    throw new Error(`Modèle illisible : « ${spec} » (attendu « anthropic:<id> » ou « openai:<id> »)`);
  }
  return { provider, model };
}

function languageModel(spec: string): LanguageModel {
  const { provider, model } = parseModelSpec(spec);
  return provider === "anthropic" ? anthropic(model) : openai(model);
}

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

function providerOptions(effort: Effort) {
  // Sortie structurée native : Claude Opus 5.5 refuse l'appel d'outil forcé (mode « jsonTool »).
  return { anthropic: { structuredOutputMode: "outputFormat" as const, effort } };
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

function usageOf(u: { inputTokens: number | undefined; outputTokens: number | undefined }): TokenUsage {
  return { inputTokens: u.inputTokens ?? 0, outputTokens: u.outputTokens ?? 0 };
}

export function renderPages(pages: readonly { page: number; text: string }[]): string {
  return pages.map((p) => `<page numero="${p.page}">\n${p.text}\n</page>`).join("\n\n");
}

export async function extractBatch(args: {
  modelSpec: string;
  systemPrompt: string;
  pages: readonly { page: number; text: string }[];
  effort: Effort;
}): Promise<{ measures: LlmMeasure[]; usage: TokenUsage }> {
  const result = await generateText({
    model: languageModel(args.modelSpec),
    system: args.systemPrompt,
    prompt: `Pages du programme :\n\n${renderPages(args.pages)}\n\nRelève toutes les mesures de ces pages.`,
    output: Output.object({ schema: LlmExtraction }),
    maxOutputTokens: 16_000,
    providerOptions: providerOptions(args.effort),
  });
  return { measures: LlmExtraction.parse(result.output).measures, usage: usageOf(result.usage) };
}

export async function crossCheck(args: {
  modelSpec: string;
  systemPrompt: string;
  quotes: readonly { page: number; quote: string }[];
  pages: readonly { page: number; text: string }[];
  measureCard: unknown;
}): Promise<{ result: CrossCheck; usage: TokenUsage }> {
  const quotes = args.quotes.map((q) => `- p. ${q.page} : « ${q.quote} »`).join("\n");
  const result = await generateText({
    model: languageModel(args.modelSpec),
    system: args.systemPrompt,
    prompt: [
      `Citations :\n${quotes}`,
      `Pages complètes :\n\n${renderPages(args.pages)}`,
      `Fiche à vérifier :\n${JSON.stringify(args.measureCard, null, 2)}`,
    ].join("\n\n"),
    output: Output.object({ schema: CrossCheck }),
    maxOutputTokens: 4_000,
    providerOptions: providerOptions("medium"),
  });
  return { result: CrossCheck.parse(result.output), usage: usageOf(result.usage) };
}
