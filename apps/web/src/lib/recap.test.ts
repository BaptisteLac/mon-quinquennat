import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Profile } from "@mon-quinquennat/schema";
import { buildCatalog } from "./catalog";
import { dataDir, loadProgrammes } from "./data";
import { biggestChange, certainty, certaintyLabel, glance, themes } from "./recap";
import { buildTicket } from "./ticket/build";
import { CalculResponse } from "./ticket/calc-client";

const programmes = loadProgrammes(dataDir());
const catalog = buildCatalog(programmes);
const lisnard = programmes.find((p) => p.candidate.id === "c-01");
if (!lisnard) throw new Error("programme c-01 absent");
function ticketFor(name: string) {
  const raw = JSON.parse(readFileSync(new URL(`./ticket/fixtures/${name}.json`, import.meta.url), "utf8")) as { profile: unknown; calcul: unknown };
  return buildTicket(lisnard as NonNullable<typeof lisnard>, Profile.parse(raw.profile), CalculResponse.parse(raw.calcul));
}

describe("récap", () => {
  it("coup d'œil : sommes annuelles des lignes du ticket", () => {
    const t = ticketFor("retraitee-seule-petite-pension");
    const g = glance(t);
    const pension = t.lines.find((l) => l.ticketLine === "pension");
    expect(g.aides).toBeCloseTo((pension?.value?.low ?? 0) * 12, 1);
    expect(g.annual).toBeCloseTo(t.solde.low * 12, 1);
    expect(g.impot).toBe(0);
    expect(g.retraite).toBeNull();
    expect(g.sure).toBe(g.figures);
  });

  it("thèmes : seulement ce qui change, du plus grand écart au plus petit", () => {
    const ts = readdirSync(new URL("./ticket/fixtures/", import.meta.url)).map((f) => ticketFor(f.replace(/\.json$/, "")));
    const rows = themes(ts);
    for (const r of rows) {
      expect(r.values).toHaveLength(ts.length);
      expect(r.values.some((v) => v !== 0)).toBe(true);
    }
    const spreads = rows.map((r) => Math.max(...r.values, 0) - Math.min(...r.values, 0));
    expect([...spreads].sort((a, b) => b - a)).toEqual(spreads);
    expect(rows.find((r) => r.ticketLine === "age_depart_retraite")?.unit).toBe("annees");
  });

  it("certitude : chaque mesure du ticket comptée une fois, selon sa nature", () => {
    const t = ticketFor("celibataire-smic-locataire");
    const c = certainty(t, catalog);
    expect(c.chiffree + c.qualitative + c.floue).toBe(new Set(t.lines.flatMap((l) => l.measureIds)).size);
  });

  it("ce qui change le plus : le plus grand montant", () => {
    const t = ticketFor("retraitee-seule-petite-pension");
    expect(biggestChange(t, catalog)?.line.ticketLine).toBe("pension");
  });
});

describe("liens officiels de la fin du récap", () => {
  it("chaque adresse figure dans une page officielle relevée (data/sources)", async () => {
    const { CIVIC_LINKS } = await import("./civic-links");
    const { readFileSync, readdirSync } = await import("node:fs");
    const dir = new URL("../../../../data/sources/", import.meta.url);
    const archived = readdirSync(dir).map((f) => readFileSync(new URL(f, dir), "utf8")).join("\n");
    for (const link of Object.values(CIVIC_LINKS)) {
      if (!link) continue;
      const u = new URL(link.url);
      expect(archived.includes(link.url) || archived.includes(u.hostname)).toBe(true);
    }
  });
});

describe("certaintyLabel", () => {
  it("écrit la légende en toutes lettres, avec les accords", () => {
    expect(certaintyLabel({ chiffree: 1, qualitative: 27, floue: 1 })).toBe("1 chiffrée · 27 qualitatives · 1 floue");
    expect(certaintyLabel({ chiffree: 0, qualitative: 2, floue: 3 })).toBe("0 chiffrée · 2 qualitatives · 3 floues");
  });
});
