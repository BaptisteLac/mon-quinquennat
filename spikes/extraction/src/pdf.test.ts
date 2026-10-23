import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { batches, parsePageRanges, pdfPages } from "./pdf.js";

/** PDF minimal, une ligne de texte ASCII par page. */
function minimalPdf(lines: string[]): Uint8Array {
  const n = lines.length;
  const pageIds = lines.map((_, i) => 4 + i * 2);
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${n} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  lines.forEach((line, i) => {
    const stream = `BT /F1 12 Tf 72 720 Td (${line}) Tj ET`;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${pageIds[i]! + 1} 0 R >>`);
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(out);
}

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
