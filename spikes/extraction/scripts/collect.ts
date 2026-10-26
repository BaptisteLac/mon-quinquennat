/**
 * Collecte le programme d'un candidat sur son site officiel et l'archive dans data/archives/<corpus>/ (non commité).
 *
 *   npm run collect -- --corpus lisnard-2026-10 --candidate c-01 \
 *     --start https://exemple-officiel.fr/notre-programme/ \
 *     [--include https://exemple-officiel.fr/notre-programme/ --include https://exemple-officiel.fr/axes/] \
 *     [--render] [--max-pages 200] [--delay-ms 1000]
 *
 * Les URL d'entrée sont copiées depuis le site officiel, jamais écrites de mémoire.
 * Par défaut, seuls les liens sous les URL d'entrée sont suivis. Le fichier liens-exclus.txt liste
 * les autres liens du site, pour ajouter les bons préfixes (--include) et relancer.
 * --render : pages rendues par Chromium (contenu chargé en JavaScript) ; CHROMIUM_PATH si besoin.
 * Produit : manifest.json (documents, empreintes), raw/ (fichiers reçus), text/ (texte par page),
 * corpus.txt (texte numéroté, pour relever la vérité terrain).
 */
import { writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import { corpusAsText, loadCorpus, writeCorpus } from "../src/corpus.js";
import { crawl } from "../src/crawl.js";
import { browserFetcher, httpFetcher } from "../src/fetchers.js";
import { loadDotEnv, REPO_ROOT } from "../src/files.js";

loadDotEnv();
const { values: args } = parseArgs({
  options: {
    corpus: { type: "string" },
    candidate: { type: "string" },
    start: { type: "string", multiple: true },
    include: { type: "string", multiple: true, default: [] },
    exclude: { type: "string", multiple: true, default: [] },
    render: { type: "boolean", default: false },
    "max-pages": { type: "string", default: "200" },
    "delay-ms": { type: "string", default: "1000" },
  },
});
if (!args.corpus || !/^[a-z0-9-]+$/.test(args.corpus) || !args.candidate || !args.start?.length) {
  console.error("Usage : npm run collect -- --corpus <id-en-minuscules> --candidate <c-XX> --start <url> [--include <préfixe>]… [--exclude <préfixe>]… [--render]");
  process.exit(1);
}

const fetcher = args.render ? browserFetcher({ executablePath: process.env.CHROMIUM_PATH }) : httpFetcher();
const collectedAt = new Date().toISOString();
let result;
try {
  result = await crawl({
    startUrls: args.start,
    include: args.include,
    exclude: args.exclude,
    maxPages: Number(args["max-pages"]),
    delayMs: Number(args["delay-ms"]),
    fetcher,
    log: (m) => console.log(m),
  });
} finally {
  await fetcher.close();
}
if (result.pages.length === 0) {
  console.error("Aucune page collectée.", result.skipped);
  process.exit(1);
}

const dir = resolve(REPO_ROOT, "data/archives", args.corpus);
const manifest = await writeCorpus({
  dir,
  corpusId: args.corpus,
  candidateId: args.candidate,
  startUrls: args.start,
  include: args.include.length > 0 ? args.include : args.start,
  rendered: args.render,
  collectedAt,
  pages: result.pages,
  excludedLinks: result.excludedLinks,
  externalPdfs: result.externalPdfs,
  skipped: result.skipped,
});
const corpus = await loadCorpus(resolve(dir, "manifest.json"));
await writeFile(resolve(dir, "corpus.txt"), corpusAsText(corpus));
await writeFile(resolve(dir, "liens-exclus.txt"), [...result.excludedLinks, ...result.externalPdfs.map((u) => `${u}  (PDF externe)`)].join("\n") + "\n");

const thin = corpus.units.filter((u) => u.text.length < 200);
console.log(
  `\n${manifest.documents.length} documents (${manifest.documents.filter((d) => d.kind === "pdf").length} PDF), ${corpus.units.length} pages de citation.`,
);
console.log(`Liens du site non suivis : ${result.excludedLinks.length} ; PDF externes : ${result.externalPdfs.length} ; ignorés : ${result.skipped.length}`);
if (thin.length > 0 && !args.render) {
  console.warn(`${thin.length} page(s) presque vide(s) : contenu peut-être chargé en JavaScript, relancer avec --render.`);
}
console.log(`→ ${relative(REPO_ROOT, dir)}/ (manifeste sha256 ${corpus.manifestSha256})`);
console.log("Copie publique de chaque URL : https://web.archive.org/save");
