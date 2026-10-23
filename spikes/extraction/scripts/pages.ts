/**
 * Écrit le texte du PDF page par page, pour relever la vérité terrain à la main :
 * les citations doivent être copiées depuis ce texte (c'est lui que le contrôle compare).
 *
 *   npm run pages -- data/archives/doc-01-v1.pdf
 *   → data/archives/doc-01-v1.pages.txt
 */
import { writeFile } from "node:fs/promises";
import { relative } from "node:path";
import { fromRepo, REPO_ROOT } from "../src/files.js";
import { pdfPages } from "../src/pdf.js";

const [input] = process.argv.slice(2);
if (!input) {
  console.error("Usage : npm run pages -- <fichier.pdf>");
  process.exit(1);
}

const path = fromRepo(input);
const pages = await pdfPages(path);
const out = path.replace(/\.pdf$/i, "") + ".pages.txt";
await writeFile(out, pages.map((text, i) => `===== PAGE ${i + 1} =====\n${text}\n`).join("\n"));
console.log(`${pages.length} pages → ${relative(REPO_ROOT, out)}`);
