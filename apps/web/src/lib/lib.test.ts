import { describe, expect, it } from "vitest";
import type { Measure } from "@mon-quinquennat/schema";
import { BADGES, drawBadges } from "./badges";
import { formatDate, plural } from "./format";
import { natureKind, natureLabel } from "./nature";
import { shuffle } from "./shuffle";
import { slugify } from "./slug";
import { themesByCount } from "./themes";

type Effects = Measure["effects"];
const qualitative = [{ computation: { kind: "qualitatif" } }] as unknown as Effects;
const bareme = [{ computation: { kind: "bareme" } }] as unknown as Effects;

describe("nature d'une mesure", () => {
  it("floue prime sur la présence d'un effet chiffré", () => {
    expect(natureKind({ precision: "floue", effects: bareme })).toBe("floue");
  });
  it("chiffrée seulement avec un effet non qualitatif", () => {
    expect(natureKind({ precision: "precise", effects: bareme })).toBe("chiffree");
    expect(natureKind({ precision: "precise", effects: qualitative })).toBe("qualitative");
    expect(natureKind({ precision: "partielle", effects: [] })).toBe("qualitative");
  });
  it("ajoute la voie juridique quand elle est connue", () => {
    expect(natureLabel({ precision: "precise", effects: bareme, legalPath: "loi_de_finances" })).toBe("Chiffrée · loi de finances");
    expect(natureLabel({ precision: "partielle", effects: [], legalPath: "loi" })).toBe("Qualitative · loi à voter");
    expect(natureLabel({ precision: "floue", effects: [], legalPath: "inconnu" })).toBe("Floue");
  });
});

describe("tirages", () => {
  it("shuffle garde les mêmes éléments", () => {
    const seq = [0.9, 0.1, 0.5, 0.3];
    let i = 0;
    const out = shuffle([1, 2, 3, 4, 5], () => seq[i++ % seq.length] as number);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
  });
  it("un badge attribué ne change pas et deux candidats n'ont jamais le même", () => {
    const first = drawBadges({}, ["c-01"], () => 0);
    expect(first["c-01"]).toBe(BADGES[0]);
    const next = drawBadges(first, ["c-01", "c-02", "c-03"], () => 0);
    expect(next["c-01"]).toBe(BADGES[0]);
    expect(new Set(Object.values(next)).size).toBe(3);
  });
  it("refuse quand il n'y a plus de forme libre", () => {
    const ids = BADGES.map((_, i) => `c-${i}`);
    const full = drawBadges({}, ids, () => 0.5);
    expect(() => drawBadges(full, ["c-x"], () => 0.5)).toThrow(/Plus de badge libre/);
  });
});

describe("textes", () => {
  it("slugify retire accents et ponctuation", () => {
    expect(slugify("Jean-Luc Mélenchon")).toBe("jean-luc-melenchon");
    expect(slugify("  Élise  d'Arc ")).toBe("elise-d-arc");
  });
  it("formatDate en français, heure de Paris", () => {
    expect(formatDate("2026-10-23T14:41:07.276Z")).toBe("23 octobre 2026");
    expect(formatDate("2026-12-31T23:30:00Z")).toBe("1 janvier 2027");
  });
  it("plural", () => {
    expect(plural(1, "mesure")).toBe("1 mesure");
    expect(plural(260, "mesure")).toBe("260 mesures");
  });
  it("themesByCount trie par nombre puis par libellé", () => {
    const t = themesByCount([{ theme: "sante" }, { theme: "fiscalite" }, { theme: "sante" }, { theme: "agriculture" }]);
    expect(t.map((x) => x.theme)).toEqual(["sante", "agriculture", "fiscalite"]);
  });
});
