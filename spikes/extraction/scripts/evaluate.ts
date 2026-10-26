/**
 * Bilan du test n°1 sans vérité terrain saisie à la main (voir src/evaluation.ts).
 *
 *   npm run evaluate -- echantillon --corpus nouvelle-energie-2026-10 [--seed 2027] [--pages 20] [--mesures 40]
 *     → data/evaluations/<corpus>/echantillon.json, pages.txt (à lire en premier, sans voir les mesures),
 *       mesures.txt (fiches tirées au sort et leurs citations, pour la relecture)
 *   npm run evaluate -- bilan --corpus nouvelle-energie-2026-10
 *     lit engagements.json, couverture.json et verdicts.json du même dossier → rapport.md
 */
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { Measure } from "@mon-quinquennat/schema";
import { z } from "zod";
import { checkCitations } from "../src/checks.js";
import { loadCorpus, type Corpus } from "../src/corpus.js";
import { KNOWN_PRICES } from "../src/cost.js";
import { CoverageFile, EngagementsFile, recall, sampleIndices, VerdictsFile, wilson, type Engagement } from "../src/evaluation.js";
import { REPO_ROOT, SPIKE_DIR } from "../src/files.js";
import { checkFigures } from "../src/figures.js";
import { locateQuote } from "../src/normalize.js";

const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    corpus: { type: "string" },
    seed: { type: "string", default: "2027" },
    pages: { type: "string", default: "20" },
    mesures: { type: "string", default: "40" },
  },
});
const command = positionals[0];
if (!args.corpus || (command !== "echantillon" && command !== "bilan")) {
  console.error("Usage : npm run evaluate -- echantillon|bilan --corpus <id>");
  process.exit(1);
}
const corpusId = args.corpus;
const dir = resolve(REPO_ROOT, "data/evaluations", corpusId);
const corpus = await loadCorpus(resolve(REPO_ROOT, "data/archives", corpusId, "manifest.json"));
const published = z
  .object({ measures: z.array(Measure) })
  .parse(JSON.parse(await readFile(resolve(REPO_ROOT, "data/measures", `${corpusId}.json`), "utf8"))).measures;

const Sample = z.object({
  corpus: z.string(),
  manifestSha256: z.string(),
  seed: z.number().int(),
  pages: z.array(z.object({ documentId: z.string(), page: z.number().int(), url: z.string() })),
  mesures: z.array(z.string()),
});

const pagesOf = (c: Corpus, documentId: string) => c.units.filter((u) => u.documentId === documentId).map((u) => u.text);
const pct = (x: number) => `${(100 * x).toFixed(1)} %`;
const interval = (k: number, n: number) => {
  const { low, high } = wilson(k, n);
  return `${pct(k / n)} (IC 95 % : ${pct(low)} – ${pct(high)}, n = ${n})`;
};

if (command === "echantillon") {
  const seed = Number(args.seed);
  const units = sampleIndices(corpus.units.length, Number(args.pages), seed).map((i) => corpus.units[i]!);
  const measures = sampleIndices(published.length, Number(args.mesures), seed + 1).map((i) => published[i]!);
  const sample = {
    corpus: corpusId,
    manifestSha256: corpus.manifestSha256,
    seed,
    pages: units.map((u) => ({ documentId: u.documentId, page: u.page, url: u.url })),
    mesures: measures.map((m) => m.id),
  };
  await mkdir(dir, { recursive: true });
  await writeFile(resolve(dir, "echantillon.json"), JSON.stringify(Sample.parse(sample), null, 2) + "\n");
  await writeFile(
    resolve(dir, "pages.txt"),
    units.map((u) => `===== ${u.documentId} · p. ${u.page} · ${u.url} =====\n${u.text}\n`).join("\n"),
  );
  await writeFile(
    resolve(dir, "mesures.txt"),
    measures
      .map((m) =>
        [
          `===== ${m.id} =====`,
          JSON.stringify(
            { title: m.title, summary: m.summary, subMeasures: m.subMeasures, schedule: m.schedule, effects: m.effects },
            null,
            1,
          ),
          ...[...m.sources, ...m.subMeasures.map((s) => s.source)].map((s) => `CITATION (${s.documentId} p. ${s.page}) : ${s.quote}`),
        ].join("\n"),
      )
      .join("\n\n") + "\n",
  );
  console.log(`${units.length} pages et ${measures.length} mesures tirées (graine ${seed}) → ${dir}`);
  process.exit(0);
}

// ----- bilan -----
const sample = Sample.parse(JSON.parse(await readFile(resolve(dir, "echantillon.json"), "utf8")));
if (sample.manifestSha256 !== corpus.manifestSha256) throw new Error("L'échantillon ne porte pas sur ce corpus (manifeste différent).");
const engagementsFile = EngagementsFile.parse(JSON.parse(await readFile(resolve(dir, "engagements.json"), "utf8")));
const verdictsFile = VerdictsFile.parse(JSON.parse(await readFile(resolve(dir, "verdicts.json"), "utf8")));
const coverageFile = CoverageFile.parse(JSON.parse(await readFile(resolve(dir, "couverture.json"), "utf8")));

// Lecture indépendante : elle couvre exactement les pages tirées, et chaque citation est exacte.
const sampled = new Set(sample.pages.map((p) => `${p.documentId}#${p.page}`));
const read = new Set(engagementsFile.pages.map((p) => `${p.documentId}#${p.page}`));
const notRead = [...sampled].filter((k) => !read.has(k));
const extra = [...read].filter((k) => !sampled.has(k));
if (notRead.length || extra.length) throw new Error(`Pages lues ≠ pages tirées. Manquantes : ${notRead.join(", ")} ; en trop : ${extra.join(", ")}`);
const engagements: Engagement[] = engagementsFile.pages.flatMap((p) => p.engagements.map((e) => ({ ...e, documentId: p.documentId, page: p.page })));
const badQuotes = engagements.filter((e) => !locateQuote(e.quote, e.page, pagesOf(corpus, e.documentId)).found);
if (badQuotes.length) throw new Error(`Citations d'engagements introuvables : ${badQuotes.map((e) => `${e.documentId} p. ${e.page} « ${e.quote.slice(0, 60)} »`).join(" ; ")}`);

const missingVerdicts = sample.mesures.filter((id) => !verdictsFile.verdicts[id]);
if (missingVerdicts.length) throw new Error(`Mesures tirées sans verdict : ${missingVerdicts.join(", ")}`);

// Contrôles automatiques sur toutes les mesures publiées.
const citations = published.map((m) =>
  m.sources.every((s) => checkCitations({ sources: [s], subMeasures: [] }, pagesOf(corpus, s.documentId)).passed) &&
  m.subMeasures.every((s) => checkCitations({ sources: [s.source], subMeasures: [] }, pagesOf(corpus, s.source.documentId)).passed),
);
const figures = published.map((m) => checkFigures(m).passed);
const statuses = new Map<string, number>();
for (const m of published) statuses.set(m.review.status, (statuses.get(m.review.status) ?? 0) + 1);
const autoValidated = statuses.get("auto_validee") ?? 0;

const r = recall(engagements, published);
const publishedIds = new Set(published.map((m) => m.id));
for (const [quote, c] of Object.entries(coverageFile.couvertures)) {
  if (!r.missed.some((e) => e.quote === quote)) throw new Error(`Couverture pour un engagement déjà apparié ou inconnu : « ${quote.slice(0, 60)} »`);
  if (!publishedIds.has(c.measureId)) throw new Error(`Mesure inconnue dans couverture.json : ${c.measureId}`);
}
const adjudicated = r.missed.filter((e) => coverageFile.couvertures[e.quote]);
const stillMissed = r.missed.filter((e) => !coverageFile.couvertures[e.quote]);
const verdicts = sample.mesures.map((id) => ({ id, ...verdictsFile.verdicts[id]! }));
const correct = verdicts.filter((v) => v.sens === "correct").length;
const withParams = verdicts.filter((v) => v.parametres !== "sans_parametre");
const paramsOk = withParams.filter((v) => v.parametres === "justes").length;

// Coût d'une extraction par l'API (aujourd'hui faite en session, sans clé) : volumes réels du corpus,
// des prompts et des sorties ; ≈ 1 jeton pour 3 caractères (hypothèse prudente pour du français).
const CHARS_PER_TOKEN = 3;
const corpusChars = corpus.units.reduce((n, u) => n + u.text.length, 0);
const promptChars = async (f: string) => (await readFile(resolve(SPIKE_DIR, "prompts", f), "utf8")).length;
const extractionDir = resolve(REPO_ROOT, "data/extractions", corpusId);
let outputChars = 0;
for (const f of (await readdir(extractionDir)).filter((f) => f.endsWith(".json") && f !== "relecture.json")) {
  outputChars += (await stat(resolve(extractionDir, f))).size;
}
const tok = (chars: number) => chars / CHARS_PER_TOKEN;
const extractIn = 2 * (tok(corpusChars) + corpus.units.length * tok(await promptChars("extract-v1.md"))); // extractions A et B
const extractOut = 2 * tok(outputChars);
const measureChars = JSON.stringify(published).length / published.length;
const crossIn = published.length * (tok(measureChars) + tok(await promptChars("crosscheck-v1.md")));
const crossOut = published.length * 200;
const costLines = ["claude-sonnet-5-5", "claude-opus-5-5"].map((model) => {
  const p = KNOWN_PRICES[model]!;
  const usd = ((extractIn + crossIn) * p.inputUsdPerMTok + (extractOut + crossOut) * p.outputUsdPerMTok) / 1e6;
  return `| ${model} | ${usd.toFixed(2)} $ | ${(usd / 2).toFixed(2)} $ |`;
});

const report = `# Test n°1 : bilan automatique — corpus \`${corpusId}\`

Généré par \`npm run evaluate -- bilan --corpus ${corpusId}\`. Échantillons tirés avec la graine ${sample.seed} (\`echantillon.json\`).

## Contrôles automatiques (${published.length} mesures publiées)
- Citations exactes : ${citations.filter(Boolean).length} / ${published.length} (${pct(citations.filter(Boolean).length / published.length)}).
- Chiffres de la fiche présents dans la citation : ${figures.filter(Boolean).length} / ${published.length} (${pct(figures.filter(Boolean).length / published.length)}).
- Auto-validation : ${autoValidated} / ${published.length} (${pct(autoValidated / published.length)}) ; statuts : ${[...statuses].map(([s, n]) => `${s} ${n}`).join(", ")}.

## Rappel (lecture indépendante de ${sample.pages.length} pages tirées au sort)
Lecteur : ${engagementsFile.lecteur}. Consigne : ${engagementsFile.consigne}

- Engagements relevés : ${r.total} ; appariés automatiquement à une mesure publiée (citations proches) : ${r.found} ; couverts par une mesure à la citation différente (\`couverture.json\`) : ${adjudicated.length}.
- Rappel automatique seul : ${interval(r.found, r.total)}.
- **Rappel : ${interval(r.found + adjudicated.length, r.total)}.**

Couverts par une autre citation :
${adjudicated.map((e) => `- « ${e.quote} » → ${coverageFile.couvertures[e.quote]!.measureId} (${coverageFile.couvertures[e.quote]!.note})`).join("\n") || "- aucun"}

Engagements non couverts :
${stillMissed.map((e) => `- ${e.documentId} p. ${e.page} : « ${e.quote} » — ${e.description}`).join("\n") || "- aucun"}

## Précision et paramètres (relecture de ${verdicts.length} mesures tirées au sort)
Lecteur : ${verdictsFile.lecteur}. Consigne : ${verdictsFile.consigne}

- **Précision : ${interval(correct, verdicts.length)}.**
- **Paramètres justes : ${withParams.length ? interval(paramsOk, withParams.length) : "aucune mesure chiffrée dans l'échantillon"}.**

Écarts relevés :
${verdicts.filter((v) => v.sens === "incorrect" || v.parametres === "faux").map((v) => `- ${v.id} : sens ${v.sens}, paramètres ${v.parametres}${v.note ? ` — ${v.note}` : ""}`).join("\n") || "- aucun"}

## Coût d'une extraction par l'API (estimation ≈)
Volumes réels : corpus ${corpusChars.toLocaleString("fr-FR")} caractères (${corpus.units.length} pages), sorties d'extraction ${outputChars.toLocaleString("fr-FR")} caractères, ${published.length} mesures. Hypothèses : ≈ ${CHARS_PER_TOKEN} caractères par jeton ; deux extractions indépendantes (A et B), chaque page envoyée avec le prompt \`extract-v1\` ; relecture croisée de chaque mesure (\`crosscheck-v1\`, ≈ 200 jetons de sortie) ; tarifs de \`src/cost.ts\` (USD par million de jetons), sans cache.

| Modèle | Coût par programme | Avec l'API Batch (−50 %) |
|---|---|---|
${costLines.join("\n")}
`;
await writeFile(resolve(dir, "rapport.md"), report);
console.log(report);
if (!existsSync(resolve(dir, "rapport.md"))) process.exit(1);
