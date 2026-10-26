import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Profile, Ticket } from "@mon-quinquennat/schema";
import { buildCatalog, effectSentence, sourceLink, sourcePlace } from "./catalog";
import { dataDir, loadProgrammes } from "./data";
import { buildTimeline, cumulAt, END_MONTH, spread, START_MONTH, type Lane } from "./frise";
import { describeTime, formatDuration, formatMoney, formatMonth } from "./ticket-labels";
import { buildTicket } from "./ticket/build";
import { CalculResponse } from "./ticket/calc-client";

const programmes = loadProgrammes(dataDir());
const catalog = buildCatalog(programmes);
const lisnard = programmes.find((p) => p.candidate.id === "c-01");
if (!lisnard) throw new Error("programme c-01 absent");

function ticketFor(fixture: string): Ticket {
  const raw = JSON.parse(readFileSync(new URL(`./ticket/fixtures/${fixture}.json`, import.meta.url), "utf8")) as { profile: unknown; calcul: unknown };
  return buildTicket(lisnard as NonNullable<typeof lisnard>, Profile.parse(raw.profile), CalculResponse.parse(raw.calcul));
}

describe("formats", () => {
  it("montants signés, fourchettes", () => {
    expect(formatMoney({ low: 12.3, high: 12.3 })).toBe("+12,30 €");
    expect(formatMoney({ low: -43.59, high: -43.59 })).toBe("−43,59 €");
    expect(formatMoney({ low: 0, high: 0 })).toBe("0,00 €");
    expect(formatMoney({ low: 10, high: 14 })).toBe("≈ +10,00 à +14,00 €");
  });
  it("durées et mois", () => {
    expect(formatDuration(1)).toBe("1 an");
    expect(formatDuration(1.25)).toBe("1 an et 3 mois");
    expect(formatDuration(0.75)).toBe("9 mois");
    expect(describeTime({ ticketLine: "age_depart_retraite", value: { low: 1, high: 1 } })).toBe("1 an de travail en plus avant la retraite");
    expect(formatMonth("2028-01-01")).toBe("Janvier 2028");
  });
});

describe("catalogue envoyé au navigateur", () => {
  it("contient chaque mesure publiée et les documents qu'elle cite", () => {
    expect(Object.keys(catalog.measures).length).toBe(programmes.reduce((n, p) => n + p.measures.length, 0));
    for (const m of Object.values(catalog.measures)) {
      const docs = catalog.programmes[m.candidateId]?.documents ?? {};
      for (const s of m.sources) {
        const doc = docs[s.documentId];
        expect(doc).toBeDefined();
        if (doc) {
          expect(sourceLink(doc, s.page)).toMatch(/^https:\/\//);
          expect(sourcePlace(doc, s.page).length).toBeGreaterThan(0);
        }
      }
      for (const e of m.effects) expect(effectSentence(m, e.ticketLine).length).toBeGreaterThan(0);
    }
  });
});

describe("frise", () => {
  const ticket = ticketFor("retraitee-seule-petite-pension");
  const lanes: Lane[] = [{ key: "c-01", candidateId: "c-01", mystery: false, ticket }];

  it("commence en mai 2027, finit en mai 2032, une case par date d'effet, des intervalles entre", () => {
    const items = buildTimeline(lanes, catalog);
    const moments = items.filter((i) => i.kind === "moment");
    expect(moments[0]).toMatchObject({ month: START_MONTH, position: "start" });
    expect(moments.at(-1)).toMatchObject({ month: END_MONTH, position: "end" });
    const placed = moments.flatMap((m) => m.entries.flatMap((e) => e.lines));
    expect(placed.length).toBe(ticket.lines.length); // chaque ligne apparaît une fois
    for (const m of moments) {
      for (const l of m.entries.flatMap((e) => e.lines)) {
        expect(l.effectiveDate.slice(0, 7) <= m.month || m.position === "start").toBe(true);
      }
    }
    const gaps = items.filter((i) => i.kind === "gap");
    for (const g of gaps) expect(g.months).toBeGreaterThan(0);
  });

  it("le cumul à la fin du mandat est celui du ticket ; il part de zéro", () => {
    expect(cumulAt(ticket, START_MONTH)).toEqual({ low: 0, high: 0 });
    expect(cumulAt(ticket, END_MONTH)).toEqual(ticket.cumul5ans);
  });

  it("écart entre programmes : nul avec un seul programme", () => {
    expect(spread(lanes, END_MONTH)).toBe(0);
  });
});
