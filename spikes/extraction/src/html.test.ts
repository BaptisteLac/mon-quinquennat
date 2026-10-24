import { describe, expect, it } from "vitest";
import { canonicalUrl, decodeHtml, extractLinks, htmlToText } from "./html.js";

const PAGE = `<!doctype html><html><head><title>Programme fictif</title><style>.x{}</style></head><body>
<header><nav><a href="/">Accueil</a> <a href="/dons">Faire un don</a></nav></header>
<main>
  <article><header><h1>Axe fictif 1</h1></header>
    <p>Nous ferons une mesure&nbsp;fictive de test.</p>
    <ul><li>Point fictif A</li><li>Point fictif B</li></ul>
    <details><summary>Détail</summary><p>Contenu replié fictif.</p></details>
    <script>console.log("non")</script>
  </article>
</main>
<footer>Mentions légales fictives</footer>
<form><button>S'abonner</button></form>
</body></html>`;

describe("htmlToText", () => {
  const { title, text } = htmlToText(PAGE);

  it("garde le contenu, y compris replié, avec le titre de l'article", () => {
    expect(title).toBe("Programme fictif");
    expect(text).toContain("Axe fictif 1");
    expect(text).toContain("Nous ferons une mesure fictive de test.");
    expect(text).toContain("- Point fictif A\n- Point fictif B");
    expect(text).toContain("Contenu replié fictif.");
  });

  it("retire menus, pied de page, formulaires et scripts", () => {
    expect(text).not.toContain("Faire un don");
    expect(text).not.toContain("Mentions légales");
    expect(text).not.toContain("S'abonner");
    expect(text).not.toContain("console.log");
  });

  it("prend tout le corps quand <main> ne porte qu'une petite partie du texte", () => {
    const html = `<body><main><p>Bandeau fictif.</p></main><div><p>${"Texte fictif hors main. ".repeat(20)}</p></div></body>`;
    expect(htmlToText(html).text).toContain("Texte fictif hors main.");
  });
});

describe("extractLinks", () => {
  it("rend les liens absolus, sans fragment ni paramètre de suivi, et ignore mailto", () => {
    const html = `<a href="/axe-1#haut">a</a><a href="axe-2?utm_source=x&p=2">b</a><a href="mailto:x@example.org">c</a><a href="https://autre.example.org/doc.pdf">d</a>`;
    expect(extractLinks(html, "https://example.org/programme/")).toEqual([
      "https://example.org/axe-1",
      "https://example.org/programme/axe-2?p=2",
      "https://autre.example.org/doc.pdf",
    ]);
  });
});

describe("canonicalUrl", () => {
  it("retire fragment et paramètres de suivi", () => {
    expect(canonicalUrl("https://example.org/a?gclid=1&utm_medium=x#top")).toBe("https://example.org/a");
  });
});

describe("decodeHtml", () => {
  const latin1 = Uint8Array.from([...'<meta charset="iso-8859-1"><p>Mesure fictive : r'].map((c) => c.charCodeAt(0)).concat([0xe9, 0x66, 0x6f, 0x72, 0x6d, 0x65]));

  it("suit l'encodage déclaré dans <meta> ou dans l'en-tête", () => {
    expect(decodeHtml(latin1)).toContain("réforme");
    expect(decodeHtml(latin1.slice(26), "text/html; charset=ISO-8859-1")).toContain("réforme");
  });

  it("lit l'UTF-8 par défaut", () => {
    expect(decodeHtml(new TextEncoder().encode("<p>réforme fictive</p>"))).toContain("réforme");
  });
});
