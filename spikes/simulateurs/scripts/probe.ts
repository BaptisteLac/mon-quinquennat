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
/** Action sur la page, repérée par le texte visible (bouton, lien) ou par l'étiquette (champ). */
const Action = z.union([
  z.object({ click: z.string() }),
  z.object({ fill: z.string(), value: z.string() }),
  z.object({ select: z.string(), option: z.string() }),
  z.object({ check: z.string() }),
  z.object({ wait: z.number().int().max(30_000) }),
  // Ciblage par sélecteur CSS, quand le texte est ambigu (plusieurs « OUI ») ou absent.
  z.object({ clickCss: z.string() }),
  z.object({ fillCss: z.string(), value: z.string() }),
  z.object({ selectCss: z.string(), option: z.string() }),
  z.object({ press: z.string() }),
]);
type Action = z.infer<typeof Action>;

const Request = z.object({
  /** Numéro de run : le modifier relance l'exploration. */
  run: z.number().int().optional(),
  targets: z.array(
    z.object({
      id: z.string().regex(/^[a-z0-9-]+$/),
      url: z.string().url(),
      follow: z.string().optional(),
      maxFollow: z.number().int().max(10).default(0),
      waitUntil: z.enum(["load", "domcontentloaded", "networkidle"]).default("networkidle"),
      timeoutMs: z.number().int().max(180_000).default(45_000),
      /** Actions enchaînées après le chargement ; une capture après chacune (step-N). */
      actions: z.array(Action).default([]),
      /** Poursuivre après une action en échec (exploration : les suivantes peuvent réussir). */
      continueOnError: z.boolean().default(false),
    }),
  ),
});

interface NetworkCall {
  method: string;
  url: string;
  resourceType: string;
  postData: string | null;
  status?: number;
}

async function snapshot(
  page: Page,
  url: string | null,
  dir: string,
  opts: { waitUntil: "load" | "domcontentloaded" | "networkidle"; timeoutMs: number } = { waitUntil: "networkidle", timeoutMs: 45_000 },
): Promise<{ href: string; text: string }[]> {
  const calls: NetworkCall[] = [];
  const onRequest = (r: import("playwright-core").Request) => {
    if (["xhr", "fetch", "document"].includes(r.resourceType())) {
      calls.push({ method: r.method(), url: r.url(), resourceType: r.resourceType(), postData: r.postData() });
    }
  };
  page.on("request", onRequest);
  await mkdir(dir, { recursive: true });
  let status: number | null = null;
  if (url !== null) {
    try {
      const resp = await page.goto(url, { waitUntil: opts.waitUntil, timeout: opts.timeoutMs });
      status = resp?.status() ?? null;
    } catch (e) {
      await writeFile(resolve(dir, "erreur.txt"), String(e));
    }
  }
  await page.waitForTimeout(1500);
  page.off("request", onRequest);
  // Une page peut encore naviguer (redirection en JavaScript) : on attend qu'elle se stabilise.
  let html = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
      html = await page.content();
      break;
    } catch {
      await page.waitForTimeout(2000);
    }
  }
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
  const text = await page.evaluate(() => document.body?.innerText ?? "").catch(() => "");
  await writeFile(resolve(dir, "texte.txt"), text);
  return links;
}

async function act(page: Page, a: Action): Promise<void> {
  if ("wait" in a) return void (await page.waitForTimeout(a.wait));
  if ("clickCss" in a) {
    await page.locator(a.clickCss).first().click({ timeout: 15_000 });
  } else if ("fillCss" in a) {
    await page.locator(a.fillCss).first().fill(a.value, { timeout: 15_000 });
  } else if ("selectCss" in a) {
    const el = page.locator(a.selectCss).first();
    await el.selectOption({ label: a.option }, { timeout: 5_000 }).catch(() => el.selectOption(a.option, { timeout: 10_000 }));
  } else if ("press" in a) {
    await page.keyboard.press(a.press);
  } else if ("click" in a) {
    const target = page.getByRole("button", { name: a.click }).or(page.getByRole("link", { name: a.click })).or(page.getByText(a.click, { exact: true }));
    await target.first().click({ timeout: 15_000 });
  } else if ("fill" in a) {
    await page.getByLabel(a.fill).first().fill(a.value, { timeout: 15_000 });
  } else if ("select" in a) {
    await page.getByLabel(a.select).first().selectOption({ label: a.option }, { timeout: 15_000 });
  } else {
    await page.getByLabel(a.check).first().check({ timeout: 15_000 });
  }
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);
  await page.waitForTimeout(1500);
}

const req = Request.parse(JSON.parse(await readFile(resolve(ROOT, "probe-request.json"), "utf8")));
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const context = await browser.newContext({
  locale: "fr-FR",
  userAgent: "MonQuinquennat-ReleveSimulateurs/0.1 (+https://github.com/BaptisteLac/mon-quinquennat)",
  viewport: { width: 1280, height: 1600 },
});
// Une page en échec est notée dans probe/<id>/erreur.txt ; les autres continuent.
async function safeSnapshot(
  page: Page,
  url: string | null,
  dir: string,
  opts?: { waitUntil: "load" | "domcontentloaded" | "networkidle"; timeoutMs: number },
): Promise<{ href: string; text: string }[]> {
  try {
    return await snapshot(page, url, dir, opts);
  } catch (e) {
    await mkdir(dir, { recursive: true });
    await writeFile(resolve(dir, "erreur.txt"), String(e));
    console.log(`  échec : ${url} (${String(e).slice(0, 120)})`);
    return [];
  }
}

for (const t of req.targets) {
  const page = await context.newPage();
  const dir = resolve(ROOT, "probe", t.id);
  const links = await safeSnapshot(page, t.url, dir, { waitUntil: t.waitUntil, timeoutMs: t.timeoutMs });
  console.log(`${t.id} : ${page.url()} (${links.length} liens)`);
  for (const [i, a] of t.actions.entries()) {
    const stepDir = resolve(dir, `step-${i + 1}`);
    try {
      await act(page, a);
      console.log(`  action ${i + 1} : ${JSON.stringify(a)}`);
    } catch (e) {
      await mkdir(stepDir, { recursive: true });
      await writeFile(resolve(stepDir, "erreur.txt"), String(e));
      console.log(`  action ${i + 1} en échec : ${String(e).slice(0, 120)}`);
      await safeSnapshot(page, null, stepDir);
      if (t.continueOnError) continue;
      break;
    }
    await safeSnapshot(page, null, stepDir);
  }
  if (t.follow && t.maxFollow > 0) {
    const re = new RegExp(t.follow, "i");
    const seen = new Set<string>();
    const next = links.filter((l) => re.test(l.href) || re.test(l.text)).map((l) => l.href.split("#")[0]!).filter((h) => h.startsWith("http") && !seen.has(h) && seen.add(h));
    for (const [i, href] of next.slice(0, t.maxFollow).entries()) {
      await safeSnapshot(page, href, resolve(dir, `suivi-${i + 1}`));
      console.log(`  suivi ${i + 1} : ${href}`);
    }
  }
  await page.close();
}
await browser.close();
