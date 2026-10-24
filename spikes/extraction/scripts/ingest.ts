/**
 * Transforme les extractions d'un corpus en mesures publiables, avec contrôles et score de confiance.
 *
 *   npm run ingest -- --corpus nouvelle-energie-2026-10 [--threshold 1]
 *
 * Lit   data/extractions/<corpus>/*.json (sauf relecture.json) et data/archives/<corpus>/manifest.json
 * Écrit data/measures/<corpus>.json (mesures validées par le schéma Measure), <corpus>.report.md
 *       et <corpus>.a-relire.json (mesures dont la relecture du sens manque ou est obsolète)
 * Sort en erreur si deux mesures ont la même première citation (doublon à fusionner).
 */
import { existsSync } from "node:fs";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import { AuthoredFile, MeaningReviews, toLlmMeasure } from "../src/authored.js";
import { loadCorpus } from "../src/corpus.js";
import { readJson, REPO_ROOT } from "../src/files.js";
import { ingest, ingestReport } from "../src/ingest.js";

const { values: args } = parseArgs({
  options: {
    corpus: { type: "string" },
    threshold: { type: "string", default: "1" },
    "prompt-version": { type: "string", default: "extract-v1" },
  },
});
if (!args.corpus) {
  console.error("Usage : npm run ingest -- --corpus <id> [--threshold 1]");
  process.exit(1);
}
const threshold = Number(args.threshold);
const corpus = await loadCorpus(resolve(REPO_ROOT, "data/archives", args.corpus, "manifest.json"));
const dir = resolve(REPO_ROOT, "data/extractions", args.corpus);
const files = (await readdir(dir)).filter((f) => f.endsWith(".json") && f !== "relecture.json").sort();

const measures = [];
for (const file of files) {
  const parsed = AuthoredFile.safeParse(await readJson(resolve(dir, file)));
  if (!parsed.success) {
    console.error(`${file} invalide :\n${parsed.error.issues.map((i) => `  - ${i.path.join(".")} : ${i.message}`).join("\n")}`);
    process.exit(1);
  }
  measures.push(...parsed.data.measures.map((m) => ({ raw: toLlmMeasure(m), file })));
}
const relecturePath = resolve(dir, "relecture.json");
const meaning = existsSync(relecturePath) ? MeaningReviews.parse(await readJson(relecturePath)) : {};

const items = ingest({
  corpus,
  measures,
  meaning,
  threshold,
  extractedBy: { model: "session Claude Code", promptVersion: args["prompt-version"], at: new Date().toISOString() },
});

const duplicates = items.filter((i) => /-\d+$/.test(i.key));
if (duplicates.length > 0) {
  console.error(`Doublons (même première citation) : ${duplicates.map((d) => `${d.key} (${d.file})`).join(", ")}`);
  process.exit(1);
}

const outDir = resolve(REPO_ROOT, "data/measures");
await mkdir(outDir, { recursive: true });
const out = resolve(outDir, `${args.corpus}.json`);
await writeFile(
  out,
  JSON.stringify(
    {
      corpusId: corpus.manifest.corpusId,
      candidateId: corpus.manifest.candidateId,
      manifestSha256: corpus.manifestSha256,
      threshold,
      measures: items.flatMap((i) => (i.measure ? [i.measure] : [])),
    },
    null,
    2,
  ) + "\n",
);
// Mesures dont la relecture du sens manque ou est obsolète : la session de relecture complète relecture.json.
const toReview = items.filter((i) => meaning[i.key]?.contentSha256 !== i.contentSha256);
await writeFile(
  out.replace(/\.json$/, ".a-relire.json"),
  JSON.stringify(
    toReview.map((i) => ({ key: i.key, contentSha256: i.contentSha256, file: i.file, title: i.raw.title })),
    null,
    2,
  ) + "\n",
);
const report = ingestReport(items, threshold, corpus);
await writeFile(out.replace(/\.json$/, ".report.md"), report);
console.log(report.split("\n## ")[0]);
console.log(`→ ${relative(REPO_ROOT, out)}`);
