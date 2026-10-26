/**
 * Veille : ce qui a changé entre deux collectes d'un même programme, et les mesures à relire.
 *
 * Les documents se correspondent par leur URL officielle. Avant comparaison, on retire les éléments
 * qui changent sans que le programme change (compteur d'adhérents, « mis à jour le … »), déclarés par
 * source dans data/sources.yaml (`volatile`), puis on normalise la typographie.
 */
import type { Measure } from "@mon-quinquennat/schema";
import type { Corpus } from "./corpus.js";
import { normalizeText, pageVariants } from "./normalize.js";

export type DocStatus = "ajoute" | "supprime" | "modifie" | "inchange";

export interface DocChange {
  url: string;
  status: DocStatus;
  /** Lignes apparues ou disparues (normalisées, hors éléments volatils), au plus `MAX_LINES`. */
  added: string[];
  removed: string[];
}

export interface MeasureToReview {
  measureId: string;
  title: string;
  /** Citations introuvables dans le document de même URL de la nouvelle collecte. */
  missing: { url: string; quote: string }[];
}

export interface VeilleReport {
  oldCorpusId: string;
  newCorpusId: string;
  changed: boolean;
  documents: DocChange[];
  measuresToReview: MeasureToReview[];
}

const MAX_LINES = 40;

/** Élément volatil : expression régulière, éventuellement limitée aux URL qui commencent par `url`. */
export interface VolatileRule {
  re: RegExp;
  url?: string;
}

export function compileVolatile(rules: readonly (string | { pattern: string; url?: string })[]): VolatileRule[] {
  return rules.map((r) =>
    typeof r === "string" ? { re: new RegExp(r, "gu") } : { re: new RegExp(r.pattern, "gu"), ...(r.url ? { url: r.url } : {}) },
  );
}

function docTexts(corpus: Corpus): Map<string, string[]> {
  const byId = new Map(corpus.manifest.documents.map((d) => [d.id, d.officialUrl]));
  const out = new Map<string, string[]>();
  for (const u of corpus.units) {
    const url = byId.get(u.documentId) ?? u.url;
    out.set(url, [...(out.get(url) ?? []), u.text]);
  }
  return out;
}

function lines(texts: readonly string[], volatile: readonly VolatileRule[], url: string): string[] {
  const rules = volatile.filter((r) => !r.url || url.startsWith(r.url)).map((r) => r.re);
  return texts
    .join("\n")
    .split(/\r?\n/)
    .map((l) => normalizeText(rules.reduce((acc, re) => acc.replace(re, ""), l)))
    .filter((l) => l.length > 0);
}

/** Lignes de `a` absentes de `b` (comparaison en multiensemble : l'ordre ne compte pas). */
function minus(a: readonly string[], b: readonly string[]): string[] {
  const counts = new Map<string, number>();
  for (const l of b) counts.set(l, (counts.get(l) ?? 0) + 1);
  const out: string[] = [];
  for (const l of a) {
    const n = counts.get(l) ?? 0;
    if (n > 0) counts.set(l, n - 1);
    else out.push(l);
  }
  return out;
}

export function compareCorpora(oldC: Corpus, newC: Corpus, volatile: readonly VolatileRule[]): DocChange[] {
  const before = docTexts(oldC);
  const after = docTexts(newC);
  const urls = [...new Set([...before.keys(), ...after.keys()])].sort();
  return urls.map((url) => {
    const a = before.get(url);
    const b = after.get(url);
    if (!a) return { url, status: "ajoute", added: lines(b ?? [], volatile, url).slice(0, MAX_LINES), removed: [] };
    if (!b) return { url, status: "supprime", added: [], removed: lines(a, volatile, url).slice(0, MAX_LINES) };
    const la = lines(a, volatile, url);
    const lb = lines(b, volatile, url);
    const added = minus(lb, la);
    const removed = minus(la, lb);
    const status: DocStatus = added.length || removed.length ? "modifie" : "inchange";
    return { url, status, added: added.slice(0, MAX_LINES), removed: removed.slice(0, MAX_LINES) };
  });
}

/** Mesures dont au moins une citation n'est plus dans le document de même URL. */
export function measuresToReview(measures: readonly Measure[], oldC: Corpus, newC: Corpus): MeasureToReview[] {
  const urlOf = new Map(oldC.manifest.documents.map((d) => [d.id, d.officialUrl]));
  const after = docTexts(newC);
  const variants = new Map<string, string[]>();
  const pagesOf = (url: string) => {
    let v = variants.get(url);
    if (!v) {
      v = (after.get(url) ?? []).flatMap(pageVariants);
      variants.set(url, v);
    }
    return v;
  };
  const out: MeasureToReview[] = [];
  for (const m of measures) {
    const quotes = [...m.sources, ...m.subMeasures.map((s) => s.source)];
    const missing = quotes
      .map((q) => ({ url: urlOf.get(q.documentId) ?? q.documentId, quote: q.quote }))
      .filter(({ url, quote }) => !pagesOf(url).some((p) => p.includes(normalizeText(quote))));
    if (missing.length) out.push({ measureId: m.id, title: m.title, missing });
  }
  return out;
}

export function veille(
  oldC: Corpus,
  newC: Corpus,
  measures: readonly Measure[],
  volatile: readonly VolatileRule[],
): VeilleReport {
  const documents = compareCorpora(oldC, newC, volatile);
  const toReview = measuresToReview(measures, oldC, newC);
  return {
    oldCorpusId: oldC.manifest.corpusId,
    newCorpusId: newC.manifest.corpusId,
    changed: documents.some((d) => d.status !== "inchange") || toReview.length > 0,
    documents,
    measuresToReview: toReview,
  };
}

export function veilleReport(r: VeilleReport): string {
  const count = (s: DocStatus) => r.documents.filter((d) => d.status === s).length;
  const out = [
    `# Veille — ${r.oldCorpusId} → ${r.newCorpusId}`,
    "",
    r.changed ? "**Le programme a changé.**" : "Aucun changement de fond.",
    "",
    `| Documents | Nombre |`,
    `|---|---|`,
    `| Modifiés | ${count("modifie")} |`,
    `| Ajoutés | ${count("ajoute")} |`,
    `| Supprimés | ${count("supprime")} |`,
    `| Inchangés | ${count("inchange")} |`,
    "",
    `## Mesures à relire (${r.measuresToReview.length})`,
    "",
    ...(r.measuresToReview.length
      ? r.measuresToReview.map((m) => `- \`${m.measureId}\` ${m.title} — ${m.missing.length} citation(s) introuvable(s)`)
      : ["Aucune."]),
  ];
  for (const d of r.documents.filter((x) => x.status !== "inchange")) {
    out.push("", `## ${d.status} : ${d.url}`, "");
    out.push(...d.removed.map((l) => `- − ${l}`), ...d.added.map((l) => `- + ${l}`));
  }
  return out.join("\n") + "\n";
}
