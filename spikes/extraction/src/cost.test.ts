import { describe, expect, it } from "vitest";
import { priceFromEnv, totalCost } from "./cost.js";

describe("totalCost", () => {
  it("additionne entrée et sortie au tarif connu", () => {
    const r = totalCost([{ model: "anthropic:claude-opus-5-5", inputTokens: 1_000_000, outputTokens: 0 }], {
      PRICE_ANTHROPIC_CLAUDE_OPUS_5_5: "1,2",
    });
    expect(r.usd).toBe(1);
    expect(r.eur).toBeNull();
  });

  it("trouve le tarif publié d'un modèle enregistré avec son fournisseur", () => {
    const r = totalCost([{ model: "anthropic:claude-sonnet-5-5", inputTokens: 1_000_000, outputTokens: 1_000_000 }], {});
    expect(r.unpricedModels).toEqual([]);
    expect(r.usd).toBe(12);
  });

  it("convertit en euros avec le taux fourni et signale les modèles sans tarif", () => {
    const r = totalCost(
      [
        { model: "modele-test", inputTokens: 500_000, outputTokens: 100_000 },
        { model: "modele-inconnu", inputTokens: 1, outputTokens: 1 },
      ],
      { PRICE_MODELE_TEST: "2,10", EUR_PER_USD: "0.5" },
    );
    expect(r.usd).toBeCloseTo(2);
    expect(r.eur).toBeCloseTo(1);
    expect(r.unpricedModels).toEqual(["modele-inconnu"]);
  });

  it("refuse un tarif illisible", () => {
    expect(() => priceFromEnv("x", { PRICE_X: "abc" })).toThrow();
  });
});
