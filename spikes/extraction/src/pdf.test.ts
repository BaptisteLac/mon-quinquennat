import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { minimalPdf } from "./fixtures.test-helpers.js";
import { batches, parsePageRanges, pdfPages } from "./pdf.js";

describe("pdfPages", () => {
  it("renvoie le texte de chaque page, dans l'ordre", async () => {
    const path = join(await mkdtemp(join(tmpdir(), "spike-extraction-")), "test.pdf");
    await writeFile(path, minimalPdf(["Page de test un", "Page de test deux"]));
    const pages = await pdfPages(path);
    expect(pages).toHaveLength(2);
    expect(pages[0]).toContain("Page de test un");
    expect(pages[1]).toContain("Page de test deux");
  });
});

describe("batches", () => {
  it("regroupe des pages consécutives par lots", () => {
    expect(batches([1, 2, 3, 4, 5, 9, 10], 2)).toEqual([[1, 2], [3, 4], [5], [9, 10]]);
  });
});

describe("parsePageRanges", () => {
  it("lit des plages et des pages isolées", () => {
    expect(parsePageRanges("2-4, 7", 10)).toEqual([2, 3, 4, 7]);
  });

  it("refuse une plage hors document ou illisible", () => {
    expect(() => parsePageRanges("9-12", 10)).toThrow();
    expect(() => parsePageRanges("a-b", 10)).toThrow();
  });
});
