import { describe, expect, it } from "vitest";
import { compareValues, sameValues } from "./values.js";

describe("compareValues", () => {
  const expected = [
    { label: "taux", value: 9, unit: "pourcent" as const },
    { label: "date", value: "2028", unit: "date" as const },
  ];

  it("accepte un taux en fraction ou en pourcentage, et une date à l'année près", () => {
    expect(compareValues(expected, { numbers: [0.09], dates: ["2028-01-01"] }).ok).toBe(true);
    expect(compareValues(expected, { numbers: [9], dates: ["2028-01-01"] }).ok).toBe(true);
  });

  it("signale une valeur manquante", () => {
    const r = compareValues(expected, { numbers: [0.09], dates: [] });
    expect(r.ok).toBe(false);
    expect(r.missing.map((m) => m.label)).toEqual(["date"]);
  });

  it("signale une valeur en trop ou fausse", () => {
    const r = compareValues(expected, { numbers: [0.09, 0.11], dates: ["2028-01-01"] });
    expect(r.ok).toBe(false);
    expect(r.unexpectedNumbers).toEqual([0.11]);
    expect(compareValues(expected, { numbers: [0.1], dates: ["2028-01-01"] }).ok).toBe(false);
  });

  it("ne confond pas un montant avec un pourcentage", () => {
    expect(compareValues([{ label: "montant", value: 100, unit: "euros" }], { numbers: [1], dates: [] }).ok).toBe(false);
  });
});

describe("sameValues", () => {
  it("compare deux extractions sans tenir compte de l'ordre", () => {
    expect(sameValues({ numbers: [1, 2], dates: ["2028-01-01"] }, { numbers: [2, 1], dates: ["2028-01-01"] })).toBe(true);
    expect(sameValues({ numbers: [1], dates: [] }, { numbers: [1, 2], dates: [] })).toBe(false);
    expect(sameValues({ numbers: [], dates: ["2028-01-01"] }, { numbers: [], dates: [] })).toBe(false);
  });
});
