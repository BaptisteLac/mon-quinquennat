/**
 * Texte principal d'une page web officielle, et liens qu'elle contient.
 *
 * Extraction déterministe (pas d'heuristique de « lecture ») : on retire ce qui n'est jamais du programme
 * (scripts, menus, en-tête, pied de page, formulaires), on garde tout le reste, y compris le contenu
 * replié (accordéons, onglets). Mieux vaut un peu de bruit qu'une mesure perdue :
 * le contrôle de citation ne cherche que dans ce texte.
 */
import { DOMParser } from "linkedom";

const REMOVED = [
  "script",
  "style",
  "noscript",
  "template",
  "svg",
  "canvas",
  "iframe",
  "form",
  "button",
  "nav",
  "aside",
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
  '[role="search"]',
].join(",");

const BLOCKS = new Set([
  "ADDRESS", "ARTICLE", "BLOCKQUOTE", "DD", "DIV", "DL", "DT", "FIGCAPTION", "FIGURE", "H1", "H2", "H3", "H4", "H5", "H6",
  "HR", "LI", "MAIN", "OL", "P", "PRE", "SECTION", "SUMMARY", "DETAILS", "TABLE", "TBODY", "THEAD", "TR", "UL",
]);

interface DomNode {
  nodeType: number;
  nodeName: string;
  textContent: string | null;
  childNodes: ArrayLike<DomNode>;
}

function render(node: DomNode, out: string[]): void {
  if (node.nodeType === 3) {
    out.push((node.textContent ?? "").replace(/\s+/g, " "));
    return;
  }
  if (node.nodeType !== 1) return;
  const name = node.nodeName.toUpperCase();
  if (name === "BR") {
    out.push("\n");
    return;
  }
  const block = BLOCKS.has(name);
  if (block) out.push("\n");
  if (name === "LI") out.push("- ");
  if (name === "TD" || name === "TH") out.push(" | ");
  for (const child of Array.from(node.childNodes)) render(child, out);
  if (block) out.push("\n");
}

function tidy(text: string): string {
  return text
    .split("\n")
    .map((l) => l.replace(/[ \t ]+/g, " ").trim())
    .filter((l) => l.length > 0)
    .join("\n")
    .trim();
}

/** Le sous-ensemble du DOM utilisé ici (les types de linkedom sont trop lâches). */
interface El {
  textContent: string | null;
  parentElement: El | null;
  remove(): void;
  closest(selector: string): El | null;
  getAttribute(name: string): string | null;
}

function parse(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return {
    one: (selector: string) => doc.querySelector(selector) as El | null,
    all: (selector: string) => Array.from(doc.querySelectorAll(selector) as ArrayLike<El>),
  };
}

export interface PageText {
  title: string;
  text: string;
}

export function htmlToText(html: string): PageText {
  const doc = parse(html);
  const title = (doc.one("title")?.textContent ?? "").trim();
  for (const el of doc.all(REMOVED)) el.remove();
  // En-tête et pied de page du site, mais pas ceux d'un article (qui portent souvent son titre).
  for (const el of doc.all("header, footer")) {
    if (!el.parentElement?.closest("main, article")) el.remove();
  }
  const body = doc.one("body");
  const main = doc.one("main");
  const bodyText = body ? tidy(collect(body)) : "";
  // <main> s'il porte l'essentiel du texte ; sinon tout le corps (certains sites mettent le contenu hors de <main>).
  const mainText = main ? tidy(collect(main)) : "";
  return { title, text: mainText.length >= 0.5 * bodyText.length ? mainText : bodyText };
}

function collect(node: unknown): string {
  const out: string[] = [];
  render(node as DomNode, out);
  return out.join("");
}

/**
 * Décode une page HTML selon l'encodage déclaré (en-tête Content-Type, puis balise <meta>), UTF-8 sinon.
 * Une page lue avec le mauvais encodage ferait échouer toutes ses citations.
 */
export function decodeHtml(body: Uint8Array, contentType = ""): string {
  const head = new TextDecoder("latin1").decode(body.slice(0, 2048));
  const declared =
    /charset=["']?([\w-]+)/i.exec(contentType)?.[1] ??
    /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1] ??
    "utf-8";
  try {
    return new TextDecoder(declared.toLowerCase()).decode(body);
  } catch {
    return new TextDecoder("utf-8").decode(body); // encodage inconnu
  }
}

/** Liens absolus d'une page (sans fragment). */
export function extractLinks(html: string, baseUrl: string): string[] {
  const doc = parse(html);
  const links = new Set<string>();
  for (const a of doc.all("a[href]")) {
    const href = a.getAttribute("href");
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) continue;
    try {
      const url = new URL(href, baseUrl);
      if (url.protocol !== "http:" && url.protocol !== "https:") continue;
      links.add(canonicalUrl(url.href));
    } catch {
      // lien mal formé : ignoré
    }
  }
  return [...links];
}

/** URL sans fragment ni paramètres de suivi, pour ne pas collecter deux fois la même page. */
export function canonicalUrl(href: string): string {
  const url = new URL(href);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|fbclid$|gclid$|mc_)/.test(key)) url.searchParams.delete(key);
  }
  return url.href;
}
