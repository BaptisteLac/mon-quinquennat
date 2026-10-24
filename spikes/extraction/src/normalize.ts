/**
 * Contrôle « citation exacte » : la citation doit se trouver mot pour mot dans le texte de la page.
 *
 * On ne tolère que des différences typographiques qui ne changent aucun mot :
 * espaces (insécables, multiples, retours à la ligne), apostrophes et guillemets typographiques,
 * tirets, ligatures, césures en fin de ligne, espace avant la ponctuation haute.
 * Tout le reste (mot changé, ajouté, retiré, ellipse « […] ») fait échouer le contrôle.
 */

const APOSTROPHES = /[‘’‚‛ʼ`´]/g;
const DOUBLE_QUOTES = /[“”„‟]/g;
const DASHES = /[‐‑‒–—―−]/g;
const SPACES = /[\s     ]+/g;
const SOFT_HYPHEN = /­/g;
const ZERO_WIDTH = /[​‌‍﻿]/g;

function normalizeCommon(text: string): string {
  return text
    .normalize("NFKC") // ligatures (ﬁ → fi), points de suspension (… → ...)
    .replace(SOFT_HYPHEN, "")
    .replace(ZERO_WIDTH, "")
    .replace(APOSTROPHES, "'")
    .replace(DOUBLE_QUOTES, '"')
    .replace(DASHES, "-");
}

function collapse(text: string): string {
  return text
    .replace(SPACES, " ")
    .replace(/ ([:;!?%»)\].,])/g, "$1") // « taux : 9 % » ≡ « taux: 9% »
    .replace(/([«(\[]) /g, "$1")
    .trim();
}

/** Normalise un texte (citation ou page) pour la comparaison. */
export function normalizeText(text: string): string {
  return collapse(normalizeCommon(text));
}

/**
 * Variantes normalisées d'un texte de page : césure de fin de ligne recollée (« bud-\nget » → « budget »)
 * ou conservée (« peut-\nêtre » → « peut-être »). La citation doit apparaître dans l'une des deux.
 */
export function pageVariants(pageText: string): string[] {
  const common = normalizeCommon(pageText);
  const dehyphenated = common.replace(/(\p{L})-[ \t]*\r?\n\s*(\p{L})/gu, "$1$2");
  const keptHyphen = common.replace(/(\p{L})-[ \t]*\r?\n\s*(\p{L})/gu, "$1-$2");
  return [...new Set([collapse(dehyphenated), collapse(keptHyphen)])];
}

export type QuoteLocation =
  | { found: true; on: "page" | "page_et_suivante" }
  | { found: false; foundOnPages: number[] };

/**
 * Cherche une citation à la page indiquée (1 = première page du PDF).
 * Une citation à cheval sur deux pages est acceptée si elle commence à la page indiquée.
 * En cas d'échec, indique les pages où elle se trouve (erreur de numéro de page).
 */
export function locateQuote(quote: string, page: number, pages: readonly string[]): QuoteLocation {
  const q = normalizeText(quote);
  if (q.length === 0) return { found: false, foundOnPages: [] };
  const current = pages[page - 1];
  if (current !== undefined) {
    if (pageVariants(current).some((v) => v.includes(q))) return { found: true, on: "page" };
    const next = pages[page];
    // À cheval seulement si elle n'est pas entièrement sur la page suivante (sinon : mauvais numéro de page).
    if (
      next !== undefined &&
      !pageVariants(next).some((v) => v.includes(q)) &&
      pageVariants(`${current}\n${next}`).some((v) => v.includes(q))
    ) {
      return { found: true, on: "page_et_suivante" };
    }
  }
  const foundOnPages: number[] = [];
  pages.forEach((text, i) => {
    if (i !== page - 1 && pageVariants(text).some((v) => v.includes(q))) foundOnPages.push(i + 1);
  });
  return { found: false, foundOnPages };
}

/** Mots normalisés en minuscules, pour comparer deux citations (appariement, pas contrôle d'exactitude). */
export function tokens(text: string): string[] {
  return normalizeText(text)
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 0);
}
