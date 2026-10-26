import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { crawl, parseRobots } from "./crawl.js";
import { httpFetcher } from "./fetchers.js";
import { minimalPdf } from "./fixtures.test-helpers.js";

/** Site officiel fictif servi en local. */
const SITE: Record<string, { type: string; body: string | Uint8Array }> = {
  "/robots.txt": { type: "text/plain", body: "User-agent: *\nDisallow: /programme/brouillon" },
  "/programme/": {
    type: "text/html",
    body: `<nav><a href="/">Accueil</a><a href="/actualites/">Actus</a></nav><main><h1>Programme fictif</h1>
      <a href="/programme/axe-1/">Axe 1</a> <a href="/programme/axe-2/?utm_source=x">Axe 2</a>
      <a href="/programme/brouillon/">Brouillon</a> <a href="/programme/axe-1/#mesures">Ancre</a>
      <a href="/wp-content/livret.pdf">Livret</a> <a href="https://ailleurs.example.org/annexe.pdf">Annexe</a></main>`,
  },
  "/programme/axe-1/": { type: "text/html; charset=utf-8", body: "<main><p>Axe fictif 1 : nous ferons une mesure fictive.</p></main>" },
  "/programme/axe-2/": { type: "text/html", body: "<main><p>Axe fictif 2 : une autre mesure fictive.</p><a href='/programme/axe-2-copie/'>copie</a></main>" },
  "/programme/axe-2-copie/": { type: "text/html", body: "<main><p>Axe fictif 2 : une autre mesure fictive.</p><a href='/programme/axe-2-copie/'>copie</a></main>" },
  "/programme/brouillon/": { type: "text/html", body: "<p>Ne doit pas être collecté.</p>" },
  "/wp-content/livret.pdf": { type: "application/pdf", body: minimalPdf(["Livret fictif page un"]) },
};

let server: Server;
let base = "";

beforeAll(async () => {
  server = createServer((req, res) => {
    const path = new URL(req.url ?? "/", "http://localhost").pathname;
    const page = SITE[path];
    if (!page) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { "content-type": page.type }).end(page.body);
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((r) => server.close(() => r())));

describe("parseRobots", () => {
  it("lit les règles du groupe *", () => {
    expect(parseRobots("User-agent: autre\nDisallow: /a\n\nUser-agent: *\nDisallow: /b\nDisallow:\n")).toEqual(["/b"]);
  });
});

describe("crawl", () => {
  it("collecte les pages du programme et les PDF du site, rien d'autre", async () => {
    const r = await crawl({ startUrls: [`${base}/programme/`], fetcher: httpFetcher() });
    const urls = r.pages.map((p) => p.url.replace(base, ""));
    expect(urls).toEqual(["/programme/", "/programme/axe-1/", "/programme/axe-2/", "/wp-content/livret.pdf"]);
    expect(r.pages.find((p) => p.kind === "pdf")).toBeDefined();
    expect(r.skipped).toEqual(
      expect.arrayContaining([
        { url: `${base}/programme/brouillon/`, reason: "interdit par robots.txt" },
        { url: `${base}/programme/axe-2-copie/`, reason: "doublon (même texte qu'une page déjà collectée)" },
      ]),
    );
    expect(r.excludedLinks.map((u) => u.replace(base, ""))).toEqual(["/", "/actualites/"]);
    expect(r.externalPdfs).toEqual(["https://ailleurs.example.org/annexe.pdf"]);
  });

  it("ne collecte pas un préfixe exclu, même lié depuis le programme", async () => {
    const r = await crawl({ startUrls: [`${base}/programme/`], exclude: [`${base}/wp-content/livret.pdf`], fetcher: httpFetcher() });
    const urls = r.pages.map((p) => p.url.replace(base, ""));
    expect(urls).not.toContain("/wp-content/livret.pdf");
    expect(r.excludedLinks.map((u) => u.replace(base, ""))).toContain("/wp-content/livret.pdf");
  });

  it("suit les préfixes ajoutés et respecte la limite de pages", async () => {
    const r = await crawl({ startUrls: [`${base}/programme/`], include: [`${base}/programme/`, `${base}/actualites/`], maxPages: 2, fetcher: httpFetcher() });
    expect(r.pages).toHaveLength(2);
  });
});
