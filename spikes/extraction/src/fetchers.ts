/**
 * Récupération des pages : HTTP simple, ou rendu par un navigateur sans écran pour les sites
 * dont le contenu n'apparaît qu'après exécution du JavaScript.
 */
import { chromium, type Browser } from "playwright-core";

export interface FetchResult {
  /** URL finale, après redirections. */
  url: string;
  status: number;
  contentType: string;
  body: Uint8Array;
}

export interface Fetcher {
  fetch(url: string): Promise<FetchResult>;
  close(): Promise<void>;
}

export const USER_AGENT = "MonQuinquennatBot/0.1 (veille des programmes officiels ; https://github.com/BaptisteLac/mon-quinquennat)";

export function isPdf(r: Pick<FetchResult, "contentType" | "url">): boolean {
  return r.contentType.includes("application/pdf") || new URL(r.url).pathname.toLowerCase().endsWith(".pdf");
}

export function isHtml(r: Pick<FetchResult, "contentType">): boolean {
  return r.contentType.includes("text/html") || r.contentType.includes("application/xhtml");
}

export function httpFetcher(): Fetcher {
  return {
    async fetch(url) {
      const res = await fetch(url, { redirect: "follow", headers: { "user-agent": USER_AGENT } });
      return {
        url: res.url || url,
        status: res.status,
        contentType: res.headers.get("content-type") ?? "",
        body: new Uint8Array(await res.arrayBuffer()),
      };
    },
    async close() {},
  };
}

/**
 * Pages HTML rendues par Chromium (contenu ajouté en JavaScript, accordéons chargés à la demande…).
 * Les PDF et autres fichiers passent par HTTP.
 * `executablePath` : chemin de Chromium s'il ne correspond pas à la version attendue par playwright-core
 * (variable CHROMIUM_PATH).
 */
export function browserFetcher(options: { executablePath?: string | undefined } = {}): Fetcher {
  const http = httpFetcher();
  let browser: Promise<Browser> | null = null;
  const getBrowser = () => (browser ??= chromium.launch({
      headless: true,
      executablePath: options.executablePath,
      // Réseau filtré par un proxy (environnement cloud) : Chromium doit passer par lui aussi.
      ...(process.env.HTTPS_PROXY
        ? { proxy: { server: process.env.HTTPS_PROXY, bypass: process.env.NO_PROXY ?? process.env.no_proxy ?? "localhost,127.0.0.1" } }
        : {}),
      // Pas de connexion de fond de Chromium (mises à jour, services Google) : seul le site visé est contacté.
      args: ["--disable-background-networking", "--disable-component-update", "--no-first-run"],
    }));
  return {
    async fetch(url) {
      const raw = await http.fetch(url);
      if (raw.status >= 400 || !isHtml(raw)) return raw;
      const context = await (await getBrowser()).newContext({ userAgent: USER_AGENT });
      try {
        const page = await context.newPage();
        const response = await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
        const html = await page.content();
        // Le HTML rendu est réencodé en UTF-8 : on l'indique, quel que soit l'encodage d'origine.
        return {
          url: page.url(),
          status: response?.status() ?? raw.status,
          contentType: "text/html; charset=utf-8",
          body: new TextEncoder().encode(html),
        };
      } finally {
        await context.close();
      }
    },
    async close() {
      if (browser) await (await browser).close();
    },
  };
}
