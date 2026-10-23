import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { corpusAsText, documentIdFromUrl, loadCorpus, splitText, writeCorpus } from "./corpus.js";
import { minimalPdf } from "./fixtures.test-helpers.js";

describe("documentIdFromUrl", () => {
  it("donne un identifiant lisible et stable", () => {
    expect(documentIdFromUrl("c1", "https://example.org/notre-programme/Économie/")).toBe("c1-notre-programme-economie");
    expect(documentIdFromUrl("c1", "https://example.org/")).toBe("c1-accueil");
    expect(documentIdFromUrl("c1", "https://example.org/docs/Livret.pdf")).toBe("c1-docs-livret");
    expect(documentIdFromUrl("c1", "https://example.org/a?p=2")).not.toBe(documentIdFromUrl("c1", "https://example.org/a?p=3"));
    // Chemin long : tronqué entre deux mots, jamais au milieu d'un mot.
    const long = documentIdFromUrl("c1", "https://example.org/media/legacy/2026/06/Discours-de-David-Lisnard-a-Bayeux-17062026.pdf");
    expect(long).toBe("c1-legacy-2026-06-discours-de-david-lisnard-a-bayeux-17062026");
  });
});

describe("splitText", () => {
  it("ne coupe pas un texte court", () => {
    expect(splitText("court")).toEqual(["court"]);
  });

  it("coupe un long texte entre deux paragraphes", () => {
    const parts = splitText(["aaaa", "bbbb", "cccc"].join("\n"), 9);
    expect(parts).toEqual(["aaaa\nbbbb", "cccc"]);
  });
});

describe("writeCorpus / loadCorpus", async () => {
  const dir = await mkdtemp(join(tmpdir(), "corpus-"));
  const html = new TextEncoder().encode("<main><p>Page web fictive : nous ferons une mesure fictive.</p></main>");
  await writeCorpus({
    dir,
    corpusId: "test",
    candidateId: "c-test",
    startUrls: ["https://example.org/programme/"],
    include: ["https://example.org/programme/"],
    rendered: false,
    collectedAt: "2026-10-23T00:00:00Z",
    pages: [
      { url: "https://example.org/programme/", kind: "html", contentType: "text/html", body: html, retrievedAt: "2026-10-23T00:00:00Z", title: "Fictif" },
      { url: "https://example.org/livret.pdf", kind: "pdf", contentType: "application/pdf", body: minimalPdf(["Livret fictif un", "Livret fictif deux"]), retrievedAt: "2026-10-23T00:00:00Z", title: "" },
    ],
    excludedLinks: [],
    externalPdfs: [],
    skipped: [],
  });

  it("numérote les pages de citation sur tout le corpus", async () => {
    const corpus = await loadCorpus(join(dir, "manifest.json"));
    expect(corpus.units.map((u) => [u.index, u.documentId, u.page])).toEqual([
      [1, "test-programme", 1],
      [2, "test-livret", 1],
      [3, "test-livret", 2],
    ]);
    expect(corpus.unitOf("test-livret", 2)).toBe(3);
    expect(corpus.unitOf("test-livret", 3)).toBeNull();
    expect(corpusAsText(corpus)).toContain("===== PAGE 3 · test-livret · p. 2 · https://example.org/livret.pdf =====");
  });

  it("refuse un fichier modifié après la collecte", async () => {
    await writeFile(join(dir, "text/test-programme.json"), JSON.stringify(["texte modifié"]));
    await expect(loadCorpus(join(dir, "manifest.json"))).rejects.toThrow(/Empreinte différente/);
  });
});
