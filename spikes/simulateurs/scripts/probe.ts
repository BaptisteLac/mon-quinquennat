/**
 * Exploration des simulateurs officiels : pour chaque page, HTML, capture, liens, champs de
 * formulaire et appels réseau. Sert à écrire ensuite le remplissage automatique (relever.ts).
 *
 *   npm run probe            (lit probe-request.json, écrit probe/<id>/)
 * Lancé depuis GitHub Actions (accès internet ouvert) ; CHROMIUM_PATH = navigateur à utiliser.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Page } from "playwright-core";
import { z } from "zod";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const Request = z.object({
  targets: z.array(
    z.object({ id: z.string().regex(/^[a-z0-9-]+$/), url: z.string().url(), follow: z.string().optional(), maxFollow: z.number().int().max(10).default(0) }),
  ),
});

interface NetworkCall {
  method: string;
  url: string;
  resourceType: string;
  postData: string | null;
  status?: number;
}

async function snapshot(page: Page, url: string, dir: string): Promise<{ href: string; text: string }[]> {
  const calls: NetworkCall[] = [];
  const onRequest = (r: import("playwright-core").Request) => {
    if (["xhr", "fetch", "document"].includes(r.resourceType())) {
      calls.push({ method: r.method(), url: r.url(), resourceType: r.resourceType(), postData: r.postData() });
    }
  };
  page.on("request", onRequest);
  await mkdir(dir, { recursive: true });
  let status: number | null = null;
  try {
    const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
    status = resp?.status() ?? null;
  } catch (e) {
    await writeFile(resolve(dir, "erreur.txt"), String(e));
  }
  await page.waitForTimeout(1500);
  page.off("request", onRequest);
  const html = await page.content();
  await writeFile(resolve(dir, "page.html"), html);
  await page.screenshot({ path: resolve(dir, "page.png"), fullPage: true }).catch(() => undefined);
  const links = await page.$$eval("a[href]", (as) =>
    as.map((a) => ({ href: (a as HTMLAnchorElement).href, text: (a.textContent ?? "").replace(/\s+/g, " ").trim() })),
  );
  const fields = await page.$$eval("input, select, textarea, button", (els) =>
    els.map((el) => {
      const e = el as HTMLInputElement;
      const label = e.id ? document.querySelector(`label[for="${CSS.escape(e.id)}"]`)?.textContent : null;
      return {
        tag: e.tagName.toLowerCase(),
        type: e.type ?? null,
        name: e.name ?? null,
        id: e.id ?? null,
        value: e.tagName === "SELECT" ? Array.from((e as unknown as HTMLSelectElement).options).map((o) => `${o.value}=${o.text}`) : e.value ?? null,
        label: (label ?? e.getAttribute("aria-label") ?? e.getAttribute("title") ?? "").replace(/\s+/g, " ").trim(),
      };
    }),
  );
  const iframes = page.frames().map((f) => f.url());
  await writeFile(
    resolve(dir, "meta.json"),
    JSON.stringify({ requested: url, final: page.url(), status, title: await page.title(), iframes, links, fields, calls }, null, 2),
  );
  return links;
}

const req = Request.parse(JSON.parse(await readFile(resolve(ROOT, "probe-request.json"), "utf8")));
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const context = await browser.newContext({
  locale: "fr-FR",
  userAgent: "MonQuinquennat-ReleveSimulateurs/0.1 (+https://github.com/BaptisteLac/mon-quinquennat)",
  viewport: { width: 1280, height: 1600 },
});
for (const t of req.targets) {
  const page = await context.newPage();
  const dir = resolve(ROOT, "probe", t.id);
  const links = await snapshot(page, t.url, dir);
  console.log(`${t.id} : ${page.url()} (${links.length} liens)`);
  if (t.follow && t.maxFollow > 0) {
    const re = new RegExp(t.follow, "i");
    const seen = new Set<string>();
    const next = links.filter((l) => re.test(l.href) || re.test(l.text)).map((l) => l.href.split("#")[0]!).filter((h) => h.startsWith("http") && !seen.has(h) && seen.add(h));
    for (const [i, href] of next.slice(0, t.maxFollow).entries()) {
      await snapshot(page, href, resolve(dir, `suivi-${i + 1}`));
      console.log(`  suivi ${i + 1} : ${href}`);
    }
  }
  await page.close();
}
await browser.close();
