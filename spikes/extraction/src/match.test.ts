import { describe, expect, it } from "vitest";
import { matchOneToOne, quoteOverlap, similarity } from "./match.js";

describe("quoteOverlap", () => {
  it("vaut 1 quand une citation est contenue dans l'autre", () => {
    expect(quoteOverlap("le taux passera à 9 %", "Mesure : le taux passera à 9 % en 2028")).toBe(1);
  });

  it("est faible pour deux citations différentes", () => {
    expect(quoteOverlap("un guichet dans chaque commune", "le taux passera à 9 %")).toBeLessThan(0.3);
  });
});

describe("similarity", () => {
  it("ignore les citations trop éloignées en pages", () => {
    expect(similarity([{ page: 2, quote: "même texte de test" }], [{ page: 5, quote: "même texte de test" }])).toBe(0);
    expect(similarity([{ page: 2, quote: "même texte de test" }], [{ page: 3, quote: "même texte de test" }])).toBe(1);
  });
});

describe("matchOneToOne", () => {
  it("apparie au plus une fois chaque élément, meilleur score d'abord", () => {
    const left = [[{ page: 1, quote: "alpha bêta gamma delta" }], [{ page: 1, quote: "alpha bêta gamma" }]];
    const right = [[{ page: 1, quote: "alpha bêta gamma delta" }]];
    expect(matchOneToOne(left, right)).toEqual([{ left: 0, right: 0, score: 1 }]);
  });
});
