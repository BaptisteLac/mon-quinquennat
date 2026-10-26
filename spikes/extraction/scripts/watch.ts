/**
 * Veille hebdomadaire : pour chaque programme de data/sources.yaml, nouvelle collecte puis comparaison
 * avec la dernière collecte exploitée (celle qui a des mesures publiées dans data/measures).
 *
 *   npm run watch [-- --candidate c-01] [--date 2026-11-02]
 *
 * Nouvelle collecte : data/archives/<corpusPrefix>-<date>/. Si rien n'a changé sur le fond, elle est
 * supprimée ; sinon elle est gardée avec le rapport data/veille/<corpus>.md, à soumettre en PR.
 * Écrit `changed=true|false` et `corpora=<ids>` dans $GITHUB_OUTPUT quand il existe.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { appendFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { Measure } from "@mon-quinquennat/schema";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { loadCorpus } from "../src/corpus.js";
import { REPO_ROOT } from "../src/files.js";
import { compileVolatile, veille, veilleReport } from "../src/veille.js";

const Volatile = z.union([z.string(), z.object({ pattern: z.string(), url: z.string().optional() })]);
const Sources = z.object({
  candidates: z.array(
    z.object({
      candidateId: z.string(),
      displayName: z.string(),
      corpusPrefix: z.string().regex(/^[a-z0-9-]+$/),
      programme: z.object({
        start: z.array(z.string().url()).min(1),
        include: z.array(z.string()).default([]),
        exclude: z.array(z.string()).default([]),
        /** Pause entre deux pages (ms), pour les sites protégés contre les robots. */
        delayMs: z.number().int().positive().optional(),
        render: z.boolean().default(false),
        watch: z.enum(["weekly", "daily"]).default("weekly"),
        volatile: z.array(Volatile).default([]),
      }),
    }),
  ),
});

const { values: args } = parseArgs({ options: { candidate: { type: "string" }, date: { type: "string" } } });
const date = args.date ?? new Date().toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("--date au format AAAA-MM-JJ");

const sources = Sources.parse(parseYaml(await readFile(resolve(REPO_ROOT, "data/sources.yaml"), "utf8")));
const published = (await readdir(resolve(REPO_ROOT, "data/measures"))).filter((f) => /^[a-z0-9-]+\.json$/.test(f) && !f.includes(".a-relire"));
const archived = (await readdir(resolve(REPO_ROOT, "data/archives"))).filter((d) => existsSync(resolve(REPO_ROOT, "data/archives", d, "manifest.json")));
const changedCorpora: string[] = [];

for (const c of sources.candidates.filter((x) => !args.candidate || x.candidateId === args.candidate)) {
  const ofCandidate = (ids: string[]) => ids.filter((id) => id.startsWith(`${c.corpusPrefix}-`)).sort().at(-1);
  // Référence : la dernière collecte exploitée ; à défaut, la dernière collecte archivée (programme
  // pas encore extrait, ex. en attente de sa version définitive) : on signale alors tout changement.
  const exploited = ofCandidate(published.map((f) => f.replace(/\.json$/, "")));
  const baseline = exploited ?? ofCandidate(archived);
  if (!baseline) {
    console.log(`${c.displayName} : aucune collecte archivée, rien à comparer.`);
    continue;
  }
  const newId = `${c.corpusPrefix}-${date}`;
  if (newId === baseline) throw new Error(`La collecte ${newId} existe déjà et est exploitée.`);
  const collectArgs = ["tsx", "scripts/collect.ts", "--corpus", newId, "--candidate", c.candidateId];
  for (const u of c.programme.start) collectArgs.push("--start", u);
  for (const u of c.programme.include) collectArgs.push("--include", u);
  for (const u of c.programme.exclude) collectArgs.push("--exclude", u);
  if (c.programme.render) collectArgs.push("--render");
  if (c.programme.delayMs) collectArgs.push("--delay-ms", String(c.programme.delayMs));
  const run = spawnSync("npx", collectArgs, { stdio: "inherit", env: process.env });
  if (run.status !== 0) throw new Error(`Collecte en échec pour ${c.displayName}`);

  const oldC = await loadCorpus(resolve(REPO_ROOT, "data/archives", baseline, "manifest.json"));
  const newC = await loadCorpus(resolve(REPO_ROOT, "data/archives", newId, "manifest.json"));
  const measures = exploited
    ? z.object({ measures: z.array(Measure) }).parse(JSON.parse(await readFile(resolve(REPO_ROOT, "data/measures", `${baseline}.json`), "utf8"))).measures
    : [];
  const report = veille(oldC, newC, measures, compileVolatile(c.programme.volatile));

  if (!report.changed) {
    await rm(resolve(REPO_ROOT, "data/archives", newId), { recursive: true, force: true });
    console.log(`${c.displayName} : aucun changement de fond depuis ${baseline}.`);
    continue;
  }
  const outDir = resolve(REPO_ROOT, "data/veille");
  await mkdir(outDir, { recursive: true });
  await writeFile(resolve(outDir, `${newId}.json`), JSON.stringify(report, null, 2) + "\n");
  await writeFile(resolve(outDir, `${newId}.md`), veilleReport(report));
  changedCorpora.push(newId);
  console.log(`${c.displayName} : changements depuis ${baseline} → data/veille/${newId}.md`);
}

if (process.env.GITHUB_OUTPUT && existsSync(process.env.GITHUB_OUTPUT)) {
  await appendFile(process.env.GITHUB_OUTPUT, `changed=${changedCorpora.length > 0}\ncorpora=${changedCorpora.join(" ")}\n`);
}
