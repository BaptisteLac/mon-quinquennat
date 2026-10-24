/** Découpage d'un PDF en texte, page par page. La page n (1 = première page du fichier) est `pages[n - 1]`. */
import { readFile } from "node:fs/promises";
import { extractText, getDocumentProxy } from "unpdf";

export async function pdfPages(path: string): Promise<string[]> {
  const data = new Uint8Array(await readFile(path));
  const pdf = await getDocumentProxy(data);
  const { text } = await extractText(pdf, { mergePages: false });
  return text;
}

/** Regroupe des numéros de page en lots consécutifs d'au plus `size` pages. */
export function batches(pages: readonly number[], size: number): number[][] {
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  const out: number[][] = [];
  for (const p of sorted) {
    const last = out.at(-1);
    const prev = last?.at(-1);
    if (last && prev !== undefined && p === prev + 1 && last.length < size) last.push(p);
    else out.push([p]);
  }
  return out;
}

/** Plages « 3-7,12 » → [3, 4, 5, 6, 7, 12]. */
export function parsePageRanges(spec: string, totalPages: number): number[] {
  const pages: number[] = [];
  for (const part of spec.split(",").map((s) => s.trim()).filter(Boolean)) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(part);
    if (!m) throw new Error(`Plage de pages illisible : « ${part} »`);
    const from = Number(m[1]);
    const to = m[2] ? Number(m[2]) : from;
    if (from < 1 || to > totalPages || from > to) throw new Error(`Plage hors document : « ${part} » (${totalPages} pages)`);
    for (let p = from; p <= to; p++) pages.push(p);
  }
  return pages;
}
