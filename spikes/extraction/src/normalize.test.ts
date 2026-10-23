import { describe, expect, it } from "vitest";
import { locateQuote, normalizeText, pageVariants, tokens } from "./normalize.js";

describe("normalizeText", () => {
  it("unifie espaces, apostrophes, guillemets et tirets", () => {
    expect(normalizeText("l’impôt sur  le\nrevenu – “test”")).toBe(
      "l'impôt sur le revenu - \"test\"",
    );
  });

  it("ignore l'espace avant la ponctuation haute et le signe %", () => {
    expect(normalizeText("taux : 9 %")).toBe(normalizeText("taux: 9%"));
    expect(normalizeText("« exemple »")).toBe(normalizeText("«exemple»"));
  });

  it("décompose les ligatures et les points de suspension", () => {
    expect(normalizeText("ﬁnancer…")).toBe("financer...");
  });
});

describe("pageVariants", () => {
  it("recolle une césure de fin de ligne, ou la garde", () => {
    const variants = pageVariants("le bud-\nget de l'État, peut-\nêtre");
    expect(variants).toContain("le budget de l'État, peutêtre");
    expect(variants).toContain("le bud-get de l'État, peut-être");
  });
});

describe("locateQuote", () => {
  const pages = [
    "Page un. [texte de test, page 1]",
    "Page deux : nous ferons une première chose. Et une seconde chose\n",
    "qui continue ici. Fin de la page trois.",
  ];

  it("trouve une citation exacte à la bonne page", () => {
    expect(locateQuote("nous ferons une première chose", 2, pages)).toEqual({ found: true, on: "page" });
  });

  it("accepte une citation à cheval sur la page suivante", () => {
    expect(locateQuote("Et une seconde chose qui continue ici", 2, pages)).toEqual({
      found: true,
      on: "page_et_suivante",
    });
  });

  it("refuse une citation entièrement sur la page suivante", () => {
    expect(locateQuote("qui continue ici", 2, pages)).toEqual({ found: false, foundOnPages: [3] });
  });

  it("refuse un mot changé", () => {
    expect(locateQuote("nous ferons une deuxième chose", 2, pages)).toEqual({ found: false, foundOnPages: [] });
  });

  it("refuse une ellipse", () => {
    expect(locateQuote("nous ferons […] chose", 2, pages).found).toBe(false);
  });

  it("signale la bonne page quand le numéro est faux", () => {
    expect(locateQuote("Fin de la page trois", 1, pages)).toEqual({ found: false, foundOnPages: [3] });
  });

  it("refuse une page hors document", () => {
    expect(locateQuote("Page un", 9, pages)).toEqual({ found: false, foundOnPages: [1] });
  });
});

describe("tokens", () => {
  it("découpe en mots minuscules", () => {
    expect(tokens("L’impôt, 9 % !")).toEqual(["l", "impôt", "9"]);
  });
});
