import { describe, expect, it } from "vitest";
import { checkCitations, route } from "./checks.js";
import { PAGES } from "./fixtures.test-helpers.js";

describe("checkCitations", () => {
  it("passe quand toutes les citations sont exactes", () => {
    const m = { sources: [{ page: 2, quote: "nous créerons un guichet fictif dans chaque commune test" }], rationale: null, subMeasures: [] };
    expect(checkCitations(m, PAGES)).toEqual({ id: "citation_exacte", passed: true });
  });

  it("échoue si une sous-mesure est mal citée, et indique la bonne page", () => {
    const m = {
      sources: [{ page: 2, quote: "nous créerons un guichet fictif dans chaque commune test" }],
      rationale: null,
      subMeasures: [{ source: { page: 2, quote: "l'âge fictif de départ sera fixé à 62 ans" } }],
    };
    const r = checkCitations(m, PAGES);
    expect(r.passed).toBe(false);
    expect(r.detail).toContain("trouvée p. 3");
  });
});

describe("route", () => {
  const ok = (id: "format" | "citation_exacte" | "relecture_croisee" | "double_extraction") => ({ id, passed: true });
  const ko = (id: "format" | "citation_exacte" | "relecture_croisee" | "double_extraction") => ({ id, passed: false });

  it("rejette une citation fausse, même si tout le reste passe", () => {
    expect(route([ok("format"), ko("citation_exacte"), ok("relecture_croisee"), ok("double_extraction")], "qualitatif").status).toBe("rejetee");
  });

  it("auto-valide une mesure qualitative sans double extraction", () => {
    expect(route([ok("format"), ok("citation_exacte"), ok("relecture_croisee")], "qualitatif").status).toBe("auto_validee");
  });

  it("exige la double extraction pour une ligne chiffrée", () => {
    expect(route([ok("format"), ok("citation_exacte"), ok("relecture_croisee")], "chiffre_ticket").status).toBe("en_attente");
    expect(route([ok("format"), ok("citation_exacte"), ok("relecture_croisee"), ok("double_extraction")], "chiffre_ticket")).toEqual({
      status: "auto_validee",
      score: 1,
    });
  });

  it("met en attente quand la relecture n'a pas été faite", () => {
    expect(route([ok("format"), ok("citation_exacte")], "qualitatif").status).toBe("en_attente");
  });
});
