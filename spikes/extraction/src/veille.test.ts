import { describe, expect, it } from "vitest";
import { buildCorpus, corpusFrom, type Corpus } from "./corpus.js";
import { CORPUS, MANIFEST, PAGES } from "./fixtures.test-helpers.js";
import { compileVolatile, veille } from "./veille.js";
import type { Measure } from "@mon-quinquennat/schema";

// Nouvelle collecte fictive : identifiants différents (autre corpus), mêmes URL.
function recollect(pages: readonly string[]): Corpus {
  const docs = [
    { id: "corpus-test-2-sommaire", url: "https://example.org/programme-fictif/", texts: [pages[0] ?? ""] },
    { id: "corpus-test-2-programme", url: "https://example.org/programme-fictif.pdf", texts: pages.slice(1) },
  ];
  const manifest = {
    ...MANIFEST,
    corpusId: "corpus-test-2",
    documents: MANIFEST.documents.map((d, i) => ({ ...d, id: docs[i]!.id })),
  };
  return corpusFrom(
    manifest,
    "2".repeat(64),
    buildCorpus(docs.flatMap((d) => d.texts.map((text, i) => ({ documentId: d.id, page: i + 1, url: d.url, title: "[titre fictif]", text })))),
  );
}

const measure = (quote: string) =>
  ({
    id: "m-test",
    title: "Mesure fictive",
    sources: [{ documentId: "corpus-test-programme", page: 1, quote }],
    subMeasures: [],
  }) as unknown as Measure;

const VOLATILE = compileVolatile(["\\d[\\d  ]* adhérents fictifs"]);

describe("veille", () => {
  it("ne voit aucun changement quand seul un élément volatil bouge", () => {
    const before = PAGES.map((p, i) => (i === 0 ? `${p}\n1 234 adhérents fictifs` : p));
    const after = PAGES.map((p, i) => (i === 0 ? `${p}\n1 299 adhérents fictifs` : p));
    const r = veille(recollect(before), recollect(after), [], VOLATILE);
    expect(r.changed).toBe(false);
  });

  it("signale un changement de programme même sans mesure publiée (programme pas encore extrait)", () => {
    const after = PAGES.map((p, i) => (i === 2 ? `${p}\nNouvelle section fictive publiée.` : p));
    const r = veille(CORPUS, recollect(after), [], VOLATILE);
    expect(r.changed).toBe(true);
    expect(r.measuresToReview).toEqual([]);
  });

  it("signale une page modifiée et la mesure dont la citation a disparu", () => {
    const after = PAGES.map((p, i) => (i === 1 ? p.replace("9 %", "8 %") : p));
    const r = veille(CORPUS, recollect(after), [measure("le taux fictif de la tranche test passera à 9 % en 2028")], VOLATILE);
    expect(r.changed).toBe(true);
    const doc = r.documents.find((d) => d.url.endsWith(".pdf"));
    expect(doc?.status).toBe("modifie");
    expect(doc?.added.join(" ")).toContain("8%");
    expect(r.measuresToReview.map((m) => m.measureId)).toEqual(["m-test"]);
  });

  it("garde une mesure dont la citation a seulement changé de page", () => {
    const after = [PAGES[0]!, PAGES[3]!, PAGES[1]!, PAGES[2]!];
    const r = veille(CORPUS, recollect(after), [measure("nous créerons un guichet fictif dans chaque commune test")], VOLATILE);
    expect(r.measuresToReview).toEqual([]);
  });

  it("applique une règle volatile limitée à une URL, et seulement à elle", () => {
    const rules = compileVolatile([{ pattern: "^\\d+$", url: "https://example.org/programme-fictif/" }]);
    const sommaire = veille(recollect([`${PAGES[0]}\n1234`, ...PAGES.slice(1)]), recollect([`${PAGES[0]}\n1299`, ...PAGES.slice(1)]), [], rules);
    expect(sommaire.changed).toBe(false);
    const pdf = veille(recollect([...PAGES, "1234"]), recollect([...PAGES, "1299"]), [], rules);
    expect(pdf.changed).toBe(true);
  });

  it("signale un document supprimé", () => {
    const r = veille(CORPUS, recollect([PAGES[0]!]), [], VOLATILE);
    expect(r.documents.find((d) => d.url.endsWith(".pdf"))?.status).toBe("supprime");
  });
});
