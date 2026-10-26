/**
 * Collecte d'un programme publié sur un site officiel : on part des pages d'entrée et on suit
 * seulement les liens qui commencent par l'un des préfixes déclarés. Les PDF liés depuis ces pages
 * sont collectés s'ils sont sur le même site. Rien d'autre du web n'est collecté.
 */
import { canonicalUrl, decodeHtml, extractLinks, htmlToText } from "./html.js";
import { isHtml, isPdf, type Fetcher } from "./fetchers.js";
import { sha256 } from "./run.js";

export interface CollectedPage {
  url: string;
  kind: "html" | "pdf";
  contentType: string;
  body: Uint8Array;
  retrievedAt: string;
  /** Titre de la page HTML (vide pour un PDF). */
  title: string;
}

export interface CrawlResult {
  pages: CollectedPage[];
  /** Liens du même site non suivis (hors préfixes) : à relire pour ajuster les préfixes. */
  excludedLinks: string[];
  /** PDF liés depuis le programme mais hébergés ailleurs : non collectés. */
  externalPdfs: string[];
  /** Pages ignorées et pourquoi (robots.txt, erreur HTTP, doublon…). */
  skipped: { url: string; reason: string }[];
}

export interface CrawlOptions {
  startUrls: readonly string[];
  /** Préfixes d'URL autorisés. Par défaut : chaque URL d'entrée. */
  include?: readonly string[];
  /** Préfixes d'URL jamais collectés, même liés depuis le programme (ex. document d'une autre élection). */
  exclude?: readonly string[];
  maxPages?: number;
  delayMs?: number;
  fetcher: Fetcher;
  now?: () => Date;
  log?: (message: string) => void;
}

/** Règles « Disallow » du groupe `User-agent: *` (sous-ensemble simple de robots.txt). */
export function parseRobots(text: string): string[] {
  const disallow: string[] = [];
  let applies = false;
  let inAgents = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = (m[1] ?? "").toLowerCase();
    const value = (m[2] ?? "").trim();
    if (key === "user-agent") {
      applies = inAgents ? applies || value === "*" : value === "*";
      inAgents = true;
    } else {
      inAgents = false;
      if (key === "disallow" && applies && value) disallow.push(value);
    }
  }
  return disallow;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function crawl(options: CrawlOptions): Promise<CrawlResult> {
  const now = options.now ?? (() => new Date());
  const log = options.log ?? (() => {});
  const starts = options.startUrls.map(canonicalUrl);
  const include = (options.include?.length ? options.include : starts).map(canonicalUrl);
  const origins = new Set(starts.map((u) => new URL(u).origin));
  const maxPages = options.maxPages ?? 200;

  const robots = new Map<string, string[]>();
  for (const origin of origins) {
    try {
      const r = await options.fetcher.fetch(`${origin}/robots.txt`);
      robots.set(origin, r.status < 400 ? parseRobots(new TextDecoder().decode(r.body)) : []);
    } catch {
      robots.set(origin, []);
    }
  }
  const allowedByRobots = (url: string) => {
    const u = new URL(url);
    return !(robots.get(u.origin) ?? []).some((rule) => (u.pathname + u.search).startsWith(rule));
  };
  const exclude = (options.exclude ?? []).map(canonicalUrl);
  const included = (url: string) => include.some((p) => url.startsWith(p));
  const isExcluded = (url: string) => exclude.some((p) => url.startsWith(p));
  const sameSite = (url: string) => origins.has(new URL(url).origin);

  const queue: { url: string; pdfOnly: boolean }[] = starts.map((url) => ({ url, pdfOnly: false }));
  const seen = new Set(starts);
  const seenText = new Set<string>();
  const result: CrawlResult = { pages: [], excludedLinks: [], externalPdfs: [], skipped: [] };
  const excluded = new Set<string>();
  const externalPdfs = new Set<string>();

  while (queue.length > 0 && result.pages.length < maxPages) {
    const { url, pdfOnly } = queue.shift() as { url: string; pdfOnly: boolean };
    if (!allowedByRobots(url)) {
      result.skipped.push({ url, reason: "interdit par robots.txt" });
      continue;
    }
    if (result.pages.length > 0 && options.delayMs) await sleep(options.delayMs);
    let res;
    try {
      res = await options.fetcher.fetch(url);
    } catch (e) {
      result.skipped.push({ url, reason: e instanceof Error ? e.message : String(e) });
      continue;
    }
    if (res.status >= 400) {
      result.skipped.push({ url, reason: `HTTP ${res.status}` });
      continue;
    }
    const finalUrl = canonicalUrl(res.url);
    const retrievedAt = now().toISOString();
    if (isPdf(res)) {
      const hash = sha256(res.body);
      if (seenText.has(hash)) {
        result.skipped.push({ url, reason: "doublon" });
        continue;
      }
      seenText.add(hash);
      result.pages.push({ url: finalUrl, kind: "pdf", contentType: res.contentType, body: res.body, retrievedAt, title: "" });
      log(`PDF  ${finalUrl}`);
      continue;
    }
    if (pdfOnly || !isHtml(res)) {
      result.skipped.push({ url, reason: `type non pris en charge (${res.contentType || "inconnu"})` });
      continue;
    }
    const html = decodeHtml(res.body, res.contentType);
    const { title, text } = htmlToText(html);
    const textHash = sha256(text);
    if (seenText.has(textHash)) {
      result.skipped.push({ url, reason: "doublon (même texte qu'une page déjà collectée)" });
      continue;
    }
    seenText.add(textHash);
    result.pages.push({ url: finalUrl, kind: "html", contentType: res.contentType, body: res.body, retrievedAt, title });
    log(`HTML ${finalUrl}`);

    for (const link of extractLinks(html, finalUrl)) {
      if (seen.has(link)) continue;
      if (isExcluded(link)) {
        excluded.add(link);
        continue;
      }
      const looksPdf = new URL(link).pathname.toLowerCase().endsWith(".pdf");
      if (included(link)) {
        seen.add(link);
        queue.push({ url: link, pdfOnly: false });
      } else if (looksPdf && sameSite(link)) {
        seen.add(link);
        queue.push({ url: link, pdfOnly: true });
      } else if (looksPdf) {
        externalPdfs.add(link);
      } else if (sameSite(link)) {
        excluded.add(link);
      }
    }
  }
  if (queue.length > 0) log(`Limite de ${maxPages} pages atteinte : ${queue.length} lien(s) non visité(s).`);
  result.excludedLinks = [...excluded].filter((u) => !seen.has(u)).sort();
  result.externalPdfs = [...externalPdfs].sort();
  return result;
}
