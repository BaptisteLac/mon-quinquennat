/**
 * Compare une exécution à la vérité terrain et écrit le rapport à côté du fichier d'exécution.
 *
 *   npm run score                             # dernière exécution de runs/
 *   npm run score -- runs/<runId>.json
 *
 * Options : --gt <fichier> --adjudications <fichier> (défaut adjudications.json s'il existe)
 * Coût en euros : EUR_PER_USD (taux de change du jour, à noter dans RESULTATS.md).
 */
import { existsSync } from "node:fs";
import { readdir, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import { loadDotEnv, loadGroundTruthAndCorpus, readJson, REPO_ROOT, SPIKE_DIR } from "../src/files.js";
import { Adjudications, computeMetrics } from "../src/metrics.js";
import { costReport, renderReport } from "../src/report.js";
import { RunFile } from "../src/run.js";

loadDotEnv();
const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    gt: { type: "string", default: "ground-truth.json" },
    adjudications: { type: "string", default: "adjudications.json" },
  },
});

async function latestRun(): Promise<string> {
  const dir = resolve(SPIKE_DIR, "runs");
  const files = existsSync(dir) ? (await readdir(dir)).filter((f) => f.endsWith(".json")).sort() : [];
  const last = files.at(-1);
  if (!last) throw new Error("Aucune exécution dans runs/ : lancer d'abord npm run extract");
  return resolve(dir, last);
}

const runPath = positionals[0] ? resolve(SPIKE_DIR, positionals[0]) : await latestRun();
const run = RunFile.parse(await readJson(runPath));
const { resolved } = await loadGroundTruthAndCorpus(resolve(SPIKE_DIR, args.gt));
if (resolved.gt.corpusSha256 !== run.corpus.manifestSha256) {
  throw new Error("L'exécution ne porte pas sur le même corpus que la vérité terrain (manifeste différent)");
}
const adjPath = resolve(SPIKE_DIR, args.adjudications);
const adjudications = existsSync(adjPath) ? Adjudications.parse(await readJson(adjPath)) : {};

const metrics = computeMetrics(
  run.records.filter((r) => r.extraction === "A"),
  resolved,
  adjudications,
);
const report = renderReport(run, resolved, metrics, costReport(run, process.env));
const out = runPath.replace(/\.json$/, ".report.md");
await writeFile(out, report);
console.log(report);
console.log(`→ ${relative(REPO_ROOT, out)}`);
