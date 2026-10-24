import { existsSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { browserFetcher, httpFetcher } from "./fetchers.js";
import { htmlToText } from "./html.js";

/** Page sans encodage déclaré dans le HTML (il est donné par l'en-tête HTTP), dont le contenu n'existe qu'après exécution du JavaScript (cas des sites de campagne en React, Nuxt, Webflow…). */
const JS_PAGE = `<!doctype html><html><body><main id="app"></main>
<script>document.getElementById("app").innerHTML = "<p>Mesure fictive chargée en JavaScript.</p>";</script></body></html>`;

let server: Server;
let url = "";

beforeAll(async () => {
  server = createServer((_req, res) => res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(JS_PAGE));
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
});

afterAll(() => new Promise<void>((r) => server.close(() => r())));

const decode = (b: Uint8Array) => htmlToText(new TextDecoder().decode(b)).text;

describe("httpFetcher", () => {
  it("ne voit pas le contenu ajouté en JavaScript", async () => {
    const f = httpFetcher();
    expect(decode((await f.fetch(url)).body)).not.toContain("Mesure fictive");
  });
});

// Nécessite un Chromium local : CHROMIUM_PATH, ou celui préinstallé dans l'environnement cloud.
const chromiumPath = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
describe.runIf(existsSync(chromiumPath))("browserFetcher", () => {
  it("voit le contenu ajouté en JavaScript", async () => {
    const f = browserFetcher({ executablePath: chromiumPath });
    try {
      expect(decode((await f.fetch(url)).body)).toContain("Mesure fictive chargée en JavaScript.");
    } finally {
      await f.close();
    }
  }, 60_000);
});
