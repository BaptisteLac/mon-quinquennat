/**
 * Veille : compare deux collectes d'un même programme et liste les mesures à relire.
 *
 *   npm run veille -- --old nouvelle-energie-2026-10 --new nouvelle-energie-2026-11 [--old-dir …] [--new-dir …]
 *
 * Lit data/archives/<corpus>/manifest.json (ou --old-dir / --new-dir), data/measures/<old>.json et les
 * éléments volatils du candidat dans data/sources.yaml. Écrit data/veille/<new>.md et .json.
 * Code de sortie 0 ; `changed` dans le JSON dit s'il faut lancer une extraction.
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { Measure } from "@mon-quinquennat/schema";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { loadCorpus } from "../src/corpus.js";
import { REPO_ROOT } from "../src/files.js";
import { compileVolatile, veille, veilleReport } from "../src/veille.js";

const { values: args } = parseArgs({
  options: { old: { type: "string" }, new: { type: "string" }, "old-dir": { type: "string" }, "new-dir": { type: "string" } },
});
if (!args.old || !args.new) {
  console.error("Usage : npm run veille -- --old <corpus> --new <corpus>");
  process.exit(1);
}
const dir = (id: string, override?: string) => resolve(override ?? resolve(REPO_ROOT, "data/archives", id));
const oldC = await loadCorpus(resolve(dir(args.old, args["old-dir"]), "manifest.json"));
const newC = await loadCorpus(resolve(dir(args.new, args["new-dir"]), "manifest.json"));

const Sources = z.object({
  candidates: z.array(
    z.object({
      candidateId: z.string(),
      programme: z.object({ volatile: z.array(z.union([z.string(), z.object({ pattern: z.string(), url: z.string().optional() })])).default([]) }).passthrough(),
    }).passthrough(),
  ),
});
const sources = Sources.parse(parseYaml(await readFile(resolve(REPO_ROOT, "data/sources.yaml"), "utf8")));
const volatile = compileVolatile(sources.candidates.find((c) => c.candidateId === oldC.manifest.candidateId)?.programme.volatile ?? []);

const measuresPath = resolve(REPO_ROOT, "data/measures", `${args.old}.json`);
const measures = existsSync(measuresPath)
  ? z.object({ measures: z.array(Measure) }).parse(JSON.parse(await readFile(measuresPath, "utf8"))).measures
  : [];

const report = veille(oldC, newC, measures, volatile);
const outDir = resolve(REPO_ROOT, "data/veille");
await mkdir(outDir, { recursive: true });
await writeFile(resolve(outDir, `${args.new}.json`), JSON.stringify(report, null, 2) + "\n");
await writeFile(resolve(outDir, `${args.new}.md`), veilleReport(report));
console.log(veilleReport(report).split("\n## ")[0]);
