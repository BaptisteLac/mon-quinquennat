/**
 * Télécharge un programme officiel dans data/archives/ (non commité) et calcule son empreinte.
 *
 *   npm run archive -- <url officielle du PDF> <id du document, ex. doc-01-v1>
 *
 * L'URL est copiée depuis le site officiel du candidat, jamais écrite de mémoire.
 * L'archive publique (Internet Archive) se fait à la main : https://web.archive.org/save
 */
import { mkdir, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { REPO_ROOT } from "../src/files.js";
import { pdfPages } from "../src/pdf.js";
import { sha256 } from "../src/run.js";

const [url, id] = process.argv.slice(2);
if (!url || !id) {
  console.error("Usage : npm run archive -- <url> <id-document>");
  process.exit(1);
}

const response = await fetch(url);
if (!response.ok) throw new Error(`Téléchargement impossible : HTTP ${response.status}`);
const data = new Uint8Array(await response.arrayBuffer());
if (new TextDecoder().decode(data.slice(0, 5)) !== "%PDF-") throw new Error("Le fichier téléchargé n'est pas un PDF");

const dir = resolve(REPO_ROOT, "data/archives");
await mkdir(dir, { recursive: true });
const path = resolve(dir, `${id}.pdf`);
await writeFile(path, data);
const totalPages = (await pdfPages(path)).length;

console.log(`Enregistré : ${relative(REPO_ROOT, path)}`);
console.log("À reporter dans le bloc « document » de ground-truth.json :");
console.log(
  JSON.stringify(
    {
      id,
      officialUrl: url,
      sha256: sha256(data),
      retrievedAt: new Date().toISOString(),
      localPath: relative(REPO_ROOT, path),
      totalPages,
    },
    null,
    2,
  ),
);
