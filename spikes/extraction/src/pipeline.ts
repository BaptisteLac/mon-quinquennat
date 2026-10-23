/**
 * Enchaînement du test n°1 : extraction A (+ B) par lots de pages → format → citation exacte →
 * double extraction → relecture croisée → routage. Les appels LLM sont injectés, pour tester sans réseau.
 */
import { Measure } from "@mon-quinquennat/schema";
import { checkCitations, riskLevel, route, type CheckResult, type Review } from "./checks.js";
import type { crossCheck as CrossCheckFn, extractBatch as ExtractBatchFn, Effort, TokenUsage } from "./llm.js";
import { MeasureDraft, toDraftInput, type LlmMeasure } from "./llm-schema.js";
import { matchOneToOne } from "./match.js";
import { batches } from "./pdf.js";
import { measureKeys, type CallRecord, type CrossCheck, type RunRecord } from "./run.js";
import { extractedValues, sameValues } from "./values.js";

export interface PipelineInput {
  /** Texte de toutes les pages du PDF ; la page n est `pages[n - 1]`. */
  pages: readonly string[];
  pagesToProcess: readonly number[];
  batchPages: number;
  document: { id: string; candidateId: string };
  models: { extractA: string; extractB: string | null; crossCheck: string | null };
  prompts: { extract: string; extractVersion: string; crossCheck: string };
  effort: Effort;
  llm: { extractBatch: typeof ExtractBatchFn; crossCheck: typeof CrossCheckFn };
  now?: () => Date;
  concurrency?: number;
  log?: (message: string) => void;
}

export interface PipelineOutput {
  calls: CallRecord[];
  records: RunRecord[];
}

interface Extracted {
  raw: LlmMeasure;
  batch: number;
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

async function pool<T>(items: readonly T[], size: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const item = items[next++] as T;
      await fn(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
}

export async function runPipeline(input: PipelineInput): Promise<PipelineOutput> {
  const now = input.now ?? (() => new Date());
  const log = input.log ?? (() => {});
  const calls: CallRecord[] = [];
  const pageText = (p: number) => ({ page: p, text: input.pages[p - 1] ?? "" });
  const call = (role: CallRecord["role"], model: string, batch: number | null, usage: TokenUsage | null, error: string | null) =>
    calls.push({ role, model, batch, inputTokens: usage?.inputTokens ?? 0, outputTokens: usage?.outputTokens ?? 0, error });

  // 1. Extractions A et B, lot par lot.
  const extracted: Record<"A" | "B", Extracted[]> = { A: [], B: [] };
  const lots = batches(input.pagesToProcess, input.batchPages);
  for (const [batch, lot] of lots.entries()) {
    log(`Lot ${batch + 1}/${lots.length} : pages ${lot[0]}–${lot.at(-1)}`);
    const runs: ["A" | "B", string][] = [["A", input.models.extractA]];
    if (input.models.extractB) runs.push(["B", input.models.extractB]);
    await Promise.all(
      runs.map(async ([which, modelSpec]) => {
        const role = which === "A" ? "extraction_A" : "extraction_B";
        try {
          const { measures, usage } = await input.llm.extractBatch({
            modelSpec,
            systemPrompt: input.prompts.extract,
            pages: lot.map(pageText),
            effort: input.effort,
          });
          call(role, modelSpec, batch, usage, null);
          extracted[which].push(...measures.map((raw) => ({ raw, batch })));
        } catch (e) {
          call(role, modelSpec, batch, null, errorMessage(e));
          log(`  échec ${role} : ${errorMessage(e)}`);
        }
      }),
    );
  }

  // 2. Format et citation exacte, pour chaque extraction.
  const prepare = (which: "A" | "B") => {
    const list = extracted[which];
    const keys = measureKeys(list.map((e) => e.raw.sources[0]?.quote ?? ""));
    return list.map((e, i) => {
      const key = keys[i] ?? String(i);
      const parsed = MeasureDraft.safeParse(
        toDraftInput(e.raw, { id: `x-${key}`, candidateId: input.document.candidateId, documentId: input.document.id }),
      );
      const formatErrors = parsed.success ? [] : parsed.error.issues.map((iss) => `${iss.path.join(".")} : ${iss.message}`);
      const citation = checkCitations(e.raw, input.pages);
      return { ...e, which, key, draft: parsed.success ? parsed.data : null, formatErrors, citation };
    });
  };
  const A = prepare("A");
  const B = prepare("B");

  // 3. Double extraction : même mesure trouvée par B, avec les mêmes valeurs.
  const pairs = matchOneToOne(
    A.map((a) => a.raw.sources),
    B.map((b) => b.raw.sources),
  );
  const pairOfA = new Map(pairs.map((p) => [p.left, p.right]));
  const pairOfB = new Map(pairs.map((p) => [p.right, p.left]));
  const doubleCheck = (self: (typeof A)[number], other: (typeof A)[number] | undefined): CheckResult | null => {
    if (!input.models.extractB) return null;
    if (!other) return { id: "double_extraction", passed: false, detail: "absente de l'autre extraction" };
    if (!self.draft || !other.draft) return { id: "double_extraction", passed: false, detail: "format invalide d'un côté" };
    return sameValues(extractedValues(self.draft), extractedValues(other.draft))
      ? { id: "double_extraction", passed: true }
      : { id: "double_extraction", passed: false, detail: "valeurs différentes entre les deux extractions" };
  };

  // 4. Relecture croisée des mesures A qui ont passé format et citation.
  const crossResults = new Map<number, CrossCheck>();
  const crossModel = input.models.crossCheck;
  if (crossModel) {
    const eligible = A.flatMap((a, i) => (a.draft && a.citation.passed ? [i] : []));
    await pool(eligible, input.concurrency ?? 4, async (i) => {
      const a = A[i];
      if (!a?.draft) return;
      const quotes = a.draft.sources.map((s) => ({ page: s.page, quote: s.quote }));
      const pageNumbers = [...new Set(quotes.flatMap((q) => [q.page, q.page + 1]))].filter((p) => p <= input.pages.length);
      const { id: _id, candidateId: _c, version: _v, ...card } = a.draft;
      try {
        const { result, usage } = await input.llm.crossCheck({
          modelSpec: crossModel,
          systemPrompt: input.prompts.crossCheck,
          quotes,
          pages: pageNumbers.map(pageText),
          measureCard: card,
        });
        call("relecture", crossModel, a.batch, usage, null);
        crossResults.set(i, result);
      } catch (e) {
        call("relecture", crossModel, a.batch, null, errorMessage(e));
      }
    });
  }

  // 5. Routage et assemblage. B sert de témoin : jamais relue ni publiée, elle reste « en attente ».
  const at = now().toISOString();
  const build = (item: (typeof A)[number], index: number, other: (typeof A)[number] | undefined): RunRecord => {
    const checks: CheckResult[] = [
      item.draft ? { id: "format", passed: true } : { id: "format", passed: false, detail: item.formatErrors.join(" ; ") },
      item.citation,
    ];
    const double = doubleCheck(item, other);
    if (double) checks.push(double);
    const cross = item.which === "A" ? (crossResults.get(index) ?? null) : null;
    if (cross) {
      checks.push(
        cross.verdict === "fidele"
          ? { id: "relecture_croisee", passed: true }
          : { id: "relecture_croisee", passed: false, detail: `${cross.verdict} : ${cross.problems.join(" ; ")}` },
      );
    }
    const risk = item.draft ? riskLevel(item.draft) : "chiffre_ticket";
    const review: Review = {
      ...route(checks, risk),
      riskLevel: risk,
      checks,
      extractedBy: {
        model: item.which === "A" ? input.models.extractA : (input.models.extractB ?? ""),
        promptVersion: input.prompts.extractVersion,
        at,
      },
      ...(cross && crossModel ? { crossCheckedBy: { model: crossModel, at } } : {}),
    };
    return {
      key: item.key,
      extraction: item.which,
      batch: item.batch,
      raw: item.raw,
      formatErrors: item.formatErrors,
      measure: item.draft ? Measure.parse({ ...item.draft, review }) : null,
      review,
      crossCheck: cross,
      pairedWith: other?.key ?? null,
    };
  };

  const records = [
    ...A.map((a, i) => build(a, i, B[pairOfA.get(i) ?? -1])),
    ...B.map((b, j) => build(b, j, A[pairOfB.get(j) ?? -1])),
  ];
  return { calls, records };
}
