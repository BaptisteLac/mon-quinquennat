/**
 * Corpus d'un programme : toutes les pages web officielles et tous les PDF qui le composent,
 * archivés avec leur empreinte. Le corpus est découpé en « pages » de citation numérotées 1…N :
 * un PDF = une page par page du fichier ; une page web = une page, ou plusieurs « parties » numérotées
 * si elle est très longue (programme entier sur une seule page), coupées entre deux paragraphes.
 * C'est ce découpage que voient le LLM et le contrôle « citation exacte ».
 */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { z } from "zod";
import type { CollectedPage } from "./crawl.js";
import { decodeHtml, htmlToText } from "./html.js";
import { pdfPages } from "./pdf.js";
import { sha256 } from "./run.js";

export const CorpusDocument = z.object({
  /** Identifiant stable, dérivé de l'URL : la même URL garde le même identifiant d'une collecte à l'autre. */
  id: z.string(),
  kind: z.enum(["html", "pdf"]),
  officialUrl: z.string().url(),
  contentType: z.string(),
  title: z.string(),
  retrievedAt: z.string().datetime(),
  /** Fichier brut archivé (HTML tel que reçu ou rendu, ou PDF), relatif au dossier du corpus. */
  file: z.string(),
  sha256: z.string().length(64),
  /** Texte par page (JSON : tableau de chaînes), relatif au dossier du corpus. */
  textFile: z.string(),
  /** Empreinte du texte : c'est elle qui signale un changement de contenu (le HTML brut varie sans cesse). */
  textSha256: z.string().length(64),
  pageCount: z.number().int().positive(),
});
export type CorpusDocument = z.infer<typeof CorpusDocument>;

export const CorpusManifest = z.object({
  corpusId: z.string(),
  candidateId: z.string(),
  collectedAt: z.string().datetime(),
  startUrls: z.array(z.string().url()).min(1),
  include: z.array(z.string()),
  rendered: z.boolean(),
  documents: z.array(CorpusDocument).min(1),
  excludedLinks: z.array(z.string()),
  externalPdfs: z.array(z.string()),
  skipped: z.array(z.object({ url: z.string(), reason: z.string() })),
});
export type CorpusManifest = z.infer<typeof CorpusManifest>;

/** Une page de citation du corpus. `index` va de 1 à N sur tout le corpus. */
export interface CorpusUnit {
  index: number;
  documentId: string;
  /** Page dans le document (pour une page web : numéro de partie, 1 le plus souvent). */
  page: number;
  url: string;
  title: string;
  text: string;
}

export interface Corpus {
  manifest: CorpusManifest;
  manifestSha256: string;
  units: CorpusUnit[];
  /** Page de corpus correspondant à (document, page), ou null. */
  unitOf(documentId: string, page: number): number | null;
}

/** Taille maximale d'une partie de page web : assez petite pour qu'un lot reste extractible en une réponse. */
export const MAX_PART_CHARS = 15_000;

/** Coupe un long texte entre deux paragraphes, en parties d'au plus `max` caractères (sauf paragraphe plus long). */
export function splitText(text: string, max = MAX_PART_CHARS): string[] {
  if (text.length <= max) return [text];
  const parts: string[] = [];
  let current = "";
  for (const para of text.split(/\n(?=\S)/)) {
    if (current && current.length + para.length + 1 > max) {
      parts.push(current);
      current = para;
    } else {
      current = current ? `${current}\n${para}` : para;
    }
  }
  if (current) parts.push(current);
  return parts;
}

/** Identifiant lisible et stable à partir de l'URL. */
export function documentIdFromUrl(corpusId: string, url: string): string {
  const u = new URL(url);
  const path = decodeURIComponent(u.pathname)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\.(pdf|html?)$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const slug = (path || "accueil").slice(-60).replace(/^-+/, "");
  const query = u.search ? `-${sha256(u.search).slice(0, 6)}` : "";
  return `${corpusId}-${slug}${query}`;
}

export function buildCorpus(units: Omit<CorpusUnit, "index">[]): CorpusUnit[] {
  return units.map((u, i) => ({ ...u, index: i + 1 }));
}

/** Écrit les fichiers d'un corpus collecté et renvoie son manifeste. */
export async function writeCorpus(args: {
  dir: string;
  corpusId: string;
  candidateId: string;
  startUrls: string[];
  include: string[];
  rendered: boolean;
  collectedAt: string;
  pages: CollectedPage[];
  excludedLinks: string[];
  externalPdfs: string[];
  skipped: { url: string; reason: string }[];
}): Promise<CorpusManifest> {
  await mkdir(resolve(args.dir, "raw"), { recursive: true });
  await mkdir(resolve(args.dir, "text"), { recursive: true });
  const ids = new Map<string, number>();
  const documents: CorpusDocument[] = [];
  for (const p of args.pages) {
    const base = documentIdFromUrl(args.corpusId, p.url);
    const n = (ids.get(base) ?? 0) + 1;
    ids.set(base, n);
    const id = n === 1 ? base : `${base}-${n}`;
    const file = `raw/${id}.${p.kind}`;
    await writeFile(resolve(args.dir, file), p.body);
    const texts = p.kind === "pdf" ? await pdfPages(resolve(args.dir, file)) : splitText(htmlToText(decodeHtml(p.body, p.contentType)).text);
    const textJson = JSON.stringify(texts, null, 1);
    const textFile = `text/${id}.json`;
    await writeFile(resolve(args.dir, textFile), textJson);
    documents.push({
      id,
      kind: p.kind,
      officialUrl: p.url,
      contentType: p.contentType,
      title: p.title,
      retrievedAt: p.retrievedAt,
      file,
      sha256: sha256(p.body),
      textFile,
      textSha256: sha256(textJson),
      pageCount: Math.max(1, texts.length),
    });
  }
  const manifest = CorpusManifest.parse({
    corpusId: args.corpusId,
    candidateId: args.candidateId,
    collectedAt: args.collectedAt,
    startUrls: args.startUrls,
    include: args.include,
    rendered: args.rendered,
    documents,
    excludedLinks: args.excludedLinks,
    externalPdfs: args.externalPdfs,
    skipped: args.skipped,
  });
  await writeFile(resolve(args.dir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}

/** Charge un corpus après avoir vérifié chaque empreinte : on ne cite jamais un fichier modifié. */
export async function loadCorpus(manifestPath: string): Promise<Corpus> {
  const manifestJson = await readFile(manifestPath, "utf8");
  const manifest = CorpusManifest.parse(JSON.parse(manifestJson));
  const dir = dirname(manifestPath);
  const units: Omit<CorpusUnit, "index">[] = [];
  for (const d of manifest.documents) {
    const raw = new Uint8Array(await readFile(resolve(dir, d.file)));
    if (sha256(raw) !== d.sha256) throw new Error(`Empreinte différente pour ${d.file}`);
    const textJson = await readFile(resolve(dir, d.textFile), "utf8");
    if (sha256(textJson) !== d.textSha256) throw new Error(`Empreinte différente pour ${d.textFile}`);
    const texts = z.array(z.string()).parse(JSON.parse(textJson));
    texts.forEach((text, i) => units.push({ documentId: d.id, page: i + 1, url: d.officialUrl, title: d.title, text }));
  }
  return corpusFrom(manifest, sha256(manifestJson), buildCorpus(units));
}

export function corpusFrom(manifest: CorpusManifest, manifestSha256: string, units: CorpusUnit[]): Corpus {
  const byKey = new Map(units.map((u) => [`${u.documentId}#${u.page}`, u.index]));
  return { manifest, manifestSha256, units, unitOf: (documentId, page) => byKey.get(`${documentId}#${page}`) ?? null };
}

/** Texte du corpus pour la lecture humaine (relevé de la vérité terrain). */
export function corpusAsText(corpus: Corpus): string {
  return corpus.units
    .map((u) => `===== PAGE ${u.index} · ${u.documentId} · p. ${u.page} · ${u.url} =====\n${u.text}\n`)
    .join("\n");
}
