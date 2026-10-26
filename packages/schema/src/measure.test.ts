import { describe, expect, it } from "vitest";
import { Computation, Condition, Measure, Profile, avatarAgeBand, childAgeBand, isPublishable } from "./measure.js";

const validMeasure = {
  id: "m-001",
  candidateId: "c-07",
  theme: "fiscalite",
  title: "Baisse du taux de la 2e tranche de l'impôt sur le revenu",
  summary: {
    simple: "Moins d'impôt pour les revenus moyens.",
    normal: "Le taux de la 2e tranche du barème passe de 11 % à 9 %.",
  },
  sources: [{ documentId: "doc-07-v1", page: 12, quote: "[citation exacte du programme, page 12]" }],
  precision: "precise",
  legalPath: "loi_de_finances",
  schedule: { effectiveDate: "2028-01-01", dateOrigin: "estimee", estimationRule: "prochaine loi de finances" },
  effects: [
    {
      id: "e-001",
      ticketLine: "impot_revenu",
      section: "portefeuille",
      appliesTo: { all: [{ field: "revenusFoyerMensuels", op: "gte", value: 1500 }] },
      computation: {
        kind: "bareme",
        engine: "openfisca",
        reform: [{ parameter: "impot_revenu_taux_tranche_2", value: 9, from: "2028-01-01" }],
      },
    },
  ],
  review: {
    status: "auto_validee",
    riskLevel: "chiffre_ticket",
    score: 0.94,
    checks: [
      { id: "format", passed: true },
      { id: "citation_exacte", passed: true },
    ],
    extractedBy: { model: "modele-extraction", promptVersion: "extract-v1", at: "2026-10-23T15:00:00Z" },
  },
  version: 1,
};

describe("Measure", () => {
  it("accepte une mesure complète", () => {
    expect(Measure.safeParse(validMeasure).success).toBe(true);
  });

  it("refuse une mesure sans citation", () => {
    expect(Measure.safeParse({ ...validMeasure, sources: [] }).success).toBe(false);
  });

  it("refuse une citation de moins de 10 caractères (impossible à vérifier sans ambiguïté)", () => {
    const atLimit = { ...validMeasure, sources: [{ documentId: "doc-07-v1", page: 12, quote: "0123456789" }] };
    expect(Measure.safeParse(atLimit).success).toBe(true);
    const tooShort = { ...validMeasure, sources: [{ documentId: "doc-07-v1", page: 12, quote: "court" }] };
    expect(Measure.safeParse(tooShort).success).toBe(false);
  });

  it("ne publie que les mesures validées", () => {
    expect(isPublishable(validMeasure as never)).toBe(true);
    expect(isPublishable({ review: { ...validMeasure.review, status: "en_attente" } } as never)).toBe(false);
    expect(isPublishable({ review: { ...validMeasure.review, status: "rejetee" } } as never)).toBe(false);
  });
});

describe("Condition", () => {
  it("accepte des conditions imbriquées", () => {
    const c = {
      all: [
        { field: "situationPro", op: "in", value: ["salarie_prive", "fonctionnaire"] },
        { not: { field: "logement", op: "eq", value: "heberge" } },
      ],
    };
    expect(Condition.safeParse(c).success).toBe(true);
  });

  it("refuse un champ de profil inconnu", () => {
    expect(Condition.safeParse({ field: "nationalite", op: "eq", value: "x" }).success).toBe(false);
  });
});

describe("ReformLever", () => {
  it("refuse un paramètre hors de la liste des leviers", () => {
    const m = { kind: "bareme", engine: "openfisca", reform: [{ parameter: "impot_revenu.bareme", value: 9, from: "2028-01-01" }] };
    expect(Computation.safeParse(m).success).toBe(false);
  });

  it("accepte un levier sans valeur (suppression)", () => {
    const m = { kind: "bareme", engine: "openfisca", reform: [{ parameter: "quotient_familial_sans_plafond", value: null, from: "2028-01-01" }] };
    expect(Computation.safeParse(m).success).toBe(true);
  });
});

describe("Profile", () => {
  it("refuse un profil de moins de 18 ans", () => {
    const p = {
      age: 17,
      genre: "autre",
      situationFamiliale: "seul",
      enfants: [],
      situationPro: "etudiant",
      revenusNetsMensuels: 0,
      logement: "heberge",
      lieuDeVie: "grande_ville",
      mobilite: "transports",
    };
    expect(Profile.safeParse(p).success).toBe(false);
  });
});

describe("Profile : questions du calcul", () => {
  const base = {
    age: 38,
    genre: "autre",
    situationFamiliale: "couple_non_marie",
    enfants: [{ anneeNaissance: 2012 }],
    situationPro: "independant",
    revenusNetsMensuels: 2000,
    situationProConjoint: "salarie_prive",
    logement: "locataire_prive",
    loyerMensuel: 700,
    lieuDeVie: "grande_ville",
    codeCommune: "2A004",
    mobilite: "velo_pied",
    entreprise: { statut: "micro", salaries: "0", chiffreAffairesAnnuel: 30000, activite: "liberale" },
  };

  it("accepte loyer, commune, année de naissance, chiffre d'affaires et situation du conjoint", () => {
    expect(Profile.safeParse(base).success).toBe(true);
  });

  it("refuse un code commune mal formé", () => {
    expect(Profile.safeParse({ ...base, codeCommune: "750" }).success).toBe(false);
  });
});

describe("childAgeBand", () => {
  it.each([
    [2026, "0_2"],
    [2024, "0_2"],
    [2023, "3_10"],
    [2016, "3_10"],
    [2015, "11_17"],
    [2009, "11_17"],
    [2008, "18_25"],
    [2001, "18_25"],
  ])("né en %i, en 2026 → %s", (annee, band) => {
    expect(childAgeBand(annee, 2026)).toBe(band);
  });

  it("au-delà de 25 ans ou pas encore né : aucune tranche", () => {
    expect(childAgeBand(2000, 2026)).toBeNull();
    expect(childAgeBand(2027, 2026)).toBeNull();
  });
});

describe("avatarAgeBand", () => {
  it.each([
    [18, "18_24"],
    [24, "18_24"],
    [25, "25_44"],
    [44, "25_44"],
    [45, "45_64"],
    [64, "45_64"],
    [65, "65_plus"],
  ])("%i ans → %s", (age, band) => {
    expect(avatarAgeBand(age)).toBe(band);
  });
});
