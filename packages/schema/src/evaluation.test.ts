import { describe, expect, it } from "vitest";
import { Proportion, proportion, wilson } from "./evaluation.ts";

describe("wilson", () => {
  it("encadre la proportion observée", () => {
    const { low, high } = wilson(90, 100);
    expect(low).toBeGreaterThan(0.82);
    expect(low).toBeLessThan(0.9);
    expect(high).toBeGreaterThan(0.9);
    expect(high).toBeLessThan(0.95);
  });

  it("reste dans [0, 1] aux extrêmes", () => {
    expect(wilson(0, 10).low).toBe(0);
    expect(wilson(10, 10).high).toBe(1);
  });
});

describe("Proportion", () => {
  it("accepte une proportion calculée", () => {
    expect(Proportion.parse(proportion(39, 40))).toMatchObject({ k: 39, n: 40 });
  });

  it("refuse un intervalle qui n'encadre pas k / n ou k > n", () => {
    expect(Proportion.safeParse({ k: 39, n: 40, low: 0.99, high: 1 }).success).toBe(false);
    expect(Proportion.safeParse({ k: 41, n: 40, low: 0, high: 1 }).success).toBe(false);
  });
});

describe("intervalle de Wilson aux extrêmes", () => {
  it("toutes les réussites : borne haute exactement 1, quel que soit n (erreur corrigée : n = 21)", () => {
    for (let n = 1; n <= 200; n++) {
      expect(wilson(n, n).high).toBe(1);
      expect(wilson(0, n).low).toBe(0);
    }
  });
});

