/**
 * Exécute l'extraction et ses contrôles sur le programme décrit par la vérité terrain.
 *
 *   npm run extract                       # pages des sections annotées
 *   npm run extract -- --pages 12-20      # pages choisies
 *   npm run extract -- --all              # programme complet (coût réel, sans extrapolation)
 *
 * Options : --gt <fichier> --batch-pages <n> --effort <low|medium|high|xhigh|max> --no-double --no-crosscheck
 * Modèles (variables d'environnement, format « fournisseur:modèle ») :
 *   EXTRACT_MODEL_A  (défaut anthropic:claude-opus-5-5)
 *   EXTRACT_MODEL_B  (défaut anthropic:claude-sonnet-5-5) — seconde extraction indépendante
 *   CROSSCHECK_MODEL (obligatoire sauf --no-crosscheck) — relecture par un autre fournisseur, ex. openai:<id>
 * Clés : ANTHROPIC_API_KEY, OPENAI_API_KEY (dans .env à la racine du dépôt).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import { loadArchivedPages, loadDotEnv, loadGroundTruth, REPO_ROOT, SPIKE_DIR } from "../src/files.js";
import { crossCheck, extractBatch, parseModelSpec, type Effort } from "../src/llm.js";
import { parsePageRanges } from "../src/pdf.js";
import { runPipeline } from "../src/pipeline.js";
import { RunFile, sha256 } from "../src/run.js";

const PROMPT_VERSION = "extract-v1";
const CROSSCHECK_PROMPT_VERSION = "crosscheck-v1";
const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;

loadDotEnv();
const { values: args } = parseArgs({
  options: {
    gt: { type: "string", default: "ground-truth.json" },
    pages: { type: "string" },
    all: { type: "boolean", default: false },
    "batch-pages": { type: "string", default: "6" },
    effort: { type: "string", default: "high" },
    "no-double": { type: "boolean", default: false },
    "no-crosscheck": { type: "boolean", default: false },
  },
});

const effort = EFFORTS.find((e) => e === args.effort);
if (!effort) throw new Error(`--effort doit valoir ${EFFORTS.join(", ")}`);
const batchPages = Number(args["batch-pages"]);
if (!Number.isInteger(batchPages) || batchPages < 1) throw new Error("--batch-pages doit être un entier positif");

const extractA = process.env.EXTRACT_MODEL_A ?? "anthropic:claude-opus-5-5";
const extractB = args["no-double"] ? null : (process.env.EXTRACT_MODEL_B ?? "anthropic:claude-sonnet-5-5");
const crossModel = args["no-crosscheck"] ? null : (process.env.CROSSCHECK_MODEL ?? null);
if (!args["no-crosscheck"]) {
  if (!crossModel) throw new Error("CROSSCHECK_MODEL manquant (ou passer --no-crosscheck)");
  if (parseModelSpec(crossModel).provider === parseModelSpec(extractA).provider) {
    throw new Error("La relecture croisée doit venir d'un autre fournisseur que l'extraction");
  }
}
if (extractB && extractB === extractA) throw new Error("La seconde extraction doit utiliser un autre modèle");

const gt = await loadGroundTruth(resolve(SPIKE_DIR, args.gt));
const pages = await loadArchivedPages(gt.document);
const pagesToProcess = args.all
  ? pages.map((_, i) => i + 1)
  : args.pages
    ? parsePageRanges(args.pages, pages.length)
    : gt.sections.flatMap((s) => parsePageRanges(`${s.pages.from}-${s.pages.to}`, pages.length));

const extractPrompt = await readFile(resolve(SPIKE_DIR, `prompts/${PROMPT_VERSION}.md`), "utf8");
const crossPrompt = await readFile(resolve(SPIKE_DIR, `prompts/${CROSSCHECK_PROMPT_VERSION}.md`), "utf8");

const startedAt = new Date();
const runId = startedAt.toISOString().replace(/[:.]/g, "-");
console.log(`Exécution ${runId} : ${pagesToProcess.length} pages, A=${extractA}, B=${extractB ?? "—"}, relecture=${crossModel ?? "—"}`);

const { calls, records } = await runPipeline({
  pages,
  pagesToProcess,
  batchPages,
  document: { id: gt.document.id, candidateId: gt.document.candidateId },
  models: { extractA, extractB, crossCheck: crossModel },
  prompts: { extract: extractPrompt, extractVersion: PROMPT_VERSION, crossCheck: crossPrompt },
  effort: effort satisfies Effort,
  llm: { extractBatch, crossCheck },
  log: (m) => console.log(m),
});

const run = RunFile.parse({
  runId,
  startedAt: startedAt.toISOString(),
  finishedAt: new Date().toISOString(),
  document: {
    id: gt.document.id,
    candidateId: gt.document.candidateId,
    sha256: gt.document.sha256,
    totalPages: gt.document.totalPages,
  },
  pagesProcessed: pagesToProcess,
  config: {
    promptVersion: PROMPT_VERSION,
    promptSha256: sha256(extractPrompt),
    crossCheckPromptVersion: CROSSCHECK_PROMPT_VERSION,
    crossCheckPromptSha256: sha256(crossPrompt),
    models: { extractA, extractB, crossCheck: crossModel },
    effort,
    batchPages,
  },
  calls,
  records,
});

const dir = resolve(SPIKE_DIR, "runs");
await mkdir(dir, { recursive: true });
const out = resolve(dir, `${runId}.json`);
await writeFile(out, JSON.stringify(run, null, 2) + "\n");

const a = records.filter((r) => r.extraction === "A");
const count = (s: string) => a.filter((r) => r.review.status === s).length;
const failedCalls = calls.filter((c) => c.error !== null).length;
console.log(
  `${a.length} mesures (A) : ${count("auto_validee")} auto-validées, ${count("en_attente")} en attente, ${count("rejetee")} rejetées.`,
);
if (failedCalls > 0) console.warn(`${failedCalls} appel(s) en échec : voir « calls » dans le fichier.`);
console.log(`→ ${relative(REPO_ROOT, out)}\nScore : npm run score -- ${relative(SPIKE_DIR, out)}`);
