import { describe, expect, it } from "vitest";
import {
  completeProfile,
  describeProfile,
  drawMystery,
  emptyJourney,
  freshResult,
  profileKey,
  startQuinquennat,
  missingStep1,
  missingStep2,
  normalize,
  resumeStep,
  toggleCandidate,
  updatedProgrammes,
  type Journey,
  type ProfileDraft,
} from "./journey";
import { clearJourney, loadJourney, saveJourney, STORAGE_KEY, type KeyValueStorage } from "./journey-store";

const step1: ProfileDraft = { age: 34, genre: "femme", situationFamiliale: "marie_pacse", enfants: [{ anneeNaissance: 2020 }], situationPro: "salarie_prive", tempsPartiel: false };
const step2: ProfileDraft = {
  revenusNetsMensuels: 1850,
  revenusConjointNetsMensuels: 1600,
  situationProConjoint: "fonctionnaire",
  logement: "locataire_prive",
  loyerMensuel: 700,
  lieuDeVie: "peripherie",
  mobilite: "voiture_thermique",
};

function memory(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

describe("cohérence du brouillon", () => {
  it("retire les réponses devenues sans objet", () => {
    const p = normalize({ ...step1, ...step2, situationFamiliale: "seul", logement: "proprio_credit", situationPro: "retraite", age: 70 });
    expect(p.revenusConjointNetsMensuels).toBeUndefined();
    expect(p.situationProConjoint).toBeUndefined();
    expect(p.loyerMensuel).toBeUndefined();
    expect(p.tempsPartiel).toBeUndefined();
  });
  it("garde chiffre d'affaires et activité pour la micro-entreprise seulement", () => {
    const micro = normalize({ situationPro: "independant", entreprise: { statut: "micro", salaries: "0", chiffreAffairesAnnuel: 30000, activite: "services" } });
    expect(micro.entreprise?.chiffreAffairesAnnuel).toBe(30000);
    const societe = normalize({ situationPro: "independant", entreprise: { statut: "societe", salaries: "0", chiffreAffairesAnnuel: 30000, activite: "services" } });
    expect(societe.entreprise).toEqual({ statut: "societe", salaries: "0" });
  });
  it("ne demande la fin de carrière qu'aux actifs de 50 ans et plus", () => {
    expect(normalize({ age: 40, situationPro: "salarie_prive", ageDepartPrevu: 64 }).ageDepartPrevu).toBeUndefined();
    expect(normalize({ age: 55, situationPro: "salarie_prive", ageDepartPrevu: 64 }).ageDepartPrevu).toBe(64);
  });
});

describe("étapes", () => {
  it("liste ce qui manque, en clair", () => {
    expect(missingStep1({})).toContain("ton âge");
    expect(missingStep1({ ...step1, enfants: [{}] })).toEqual(["l'année de naissance de chaque enfant"]);
    expect(missingStep1({ ...step1, tempsPartiel: undefined })).toEqual(["ton temps de travail"]);
    expect(missingStep1({ ...step1, situationPro: "independant", entreprise: { statut: "micro", salaries: "0" } })).toEqual([
      "ton chiffre d'affaires",
      "ton type d'activité",
    ]);
    expect(missingStep2({ ...step1, situationPro: "retraite" })[0]).toBe("ta pension");
    expect(missingStep2({ ...step1, ...step2, revenusConjointNetsMensuels: undefined })).toEqual(["les revenus de ton/ta conjoint·e"]);
  });
  it("loyer et commune sont facultatifs", () => {
    const { loyerMensuel: _l, ...noRent } = step2;
    expect(missingStep2({ ...step1, ...noRent })).toEqual([]);
    expect(completeProfile({ ...step1, ...noRent })).not.toBeNull();
  });
  it("reprend à la première étape incomplète", () => {
    const j = emptyJourney();
    expect(resumeStep(j)).toBe("toi");
    expect(resumeStep({ ...j, profile: step1 })).toBe("vie");
    expect(resumeStep({ ...j, profile: { ...step1, ...step2 } })).toBe("candidats");
  });
});

describe("choix des programmes", () => {
  const empty = emptyJourney().choix;
  it("au plus trois candidats", () => {
    let c = empty;
    for (const id of ["a", "b", "c", "d"]) c = toggleCandidate(c, id);
    expect(c.candidats).toEqual(["a", "b", "c"]);
    expect(toggleCandidate(c, "b").candidats).toEqual(["a", "c"]);
  });
  it("le mystère est tiré parmi les programmes non choisis et ne change plus ensuite", () => {
    const c = drawMystery(["a", "b", "c"], { ...empty, candidats: ["a"] }, () => 0.99);
    expect(c.mystereId).toBe("c");
    expect(drawMystery(["a", "b", "c"], c, () => 0).mystereId).toBe("c");
    expect(drawMystery(["a", "b", "c"], { ...c, candidats: ["a", "c"] }, () => 0).mystereId).toBe("b");
  });
  it("pas de mystère sans programme restant ou quand il est désactivé", () => {
    expect(drawMystery(["a"], { ...empty, candidats: ["a"] }, () => 0).mystereId).toBeNull();
    expect(drawMystery(["a", "b"], { ...empty, mystere: false }, () => 0).mystereId).toBeNull();
  });
  it("signale un programme mis à jour depuis le choix", () => {
    const j: Journey = { ...emptyJourney(), versions: { "c-01": "nouvelle-energie-2026-10" } };
    expect(updatedProgrammes(j, { "c-01": "nouvelle-energie-2026-10" })).toEqual([]);
    expect(updatedProgrammes(j, { "c-01": "nouvelle-energie-2027-01" })).toEqual(["c-01"]);
  });
});

describe("textes", () => {
  it("accorde le résumé selon le genre", () => {
    expect(describeProfile({ ...step1, enfants: [{}, {}] })).toBe("34 ans, mariée ou pacsée, 2 enfants, salariée");
    expect(describeProfile({ age: 70, genre: "autre", situationFamiliale: "seul", enfants: [], situationPro: "retraite" })).toBe(
      "70 ans, seul·e, sans enfant à charge, retraité·e",
    );
  });
});

describe("stockage du parcours", () => {
  it("relit ce qui a été enregistré", () => {
    const s = memory();
    const j = { ...emptyJourney(), profile: step1 };
    expect(saveJourney(j, s)).toBe(true);
    expect(loadJourney(s)?.profile).toEqual(step1);
  });
  it("ignore un contenu illisible ou d'une autre version", () => {
    const s = memory();
    s.setItem(STORAGE_KEY, "{pas du json");
    expect(loadJourney(s)).toBeNull();
    s.setItem(STORAGE_KEY, JSON.stringify({ ...emptyJourney(), version: 0 }));
    expect(loadJourney(s)).toBeNull();
  });
  it("refuse d'enregistrer un brouillon hors schéma", () => {
    expect(() => saveJourney({ ...emptyJourney(), profile: { age: 12 } }, memory())).toThrow();
  });
  it("tolère un stockage indisponible et efface", () => {
    const failing: KeyValueStorage = {
      getItem: () => {
        throw new Error("bloqué");
      },
      setItem: () => {
        throw new Error("plein");
      },
      removeItem: () => {
        throw new Error("bloqué");
      },
    };
    expect(loadJourney(failing)).toBeNull();
    expect(saveJourney(emptyJourney(), failing)).toBe(false);
    expect(() => clearJourney(failing)).not.toThrow();
    const s = memory();
    saveJourney(emptyJourney(), s);
    clearJourney(s);
    expect(s.data.size).toBe(0);
  });
});

describe("résultat et frise", () => {
  const profile = completeProfile({ ...step1, ...step2 });
  if (!profile) throw new Error("profil de test incomplet");
  const versions = { "c-01": "corpus-a" };
  it("réutilise un résultat seulement pour le même profil et les mêmes versions", () => {
    const j: Journey = { ...emptyJourney(), profile, resultat: { profileKey: profileKey(profile), versions, tickets: [], calculeLe: new Date().toISOString() } };
    expect(freshResult(j, profile, versions)).toEqual([]);
    expect(freshResult(j, { ...profile, age: 35 }, versions)).toBeNull();
    expect(freshResult(j, profile, { "c-01": "corpus-b" })).toBeNull();
    expect(freshResult(j, profile, { ...versions, "c-02": "corpus-c" })).toBeNull();
  });
  it("la clé du profil ne dépend pas de l'ordre des champs", () => {
    const reversed = Object.fromEntries(Object.entries(profile).reverse()) as typeof profile;
    expect(profileKey(reversed)).toBe(profileKey(profile));
  });
  it("la clé tient compte des champs imbriqués (année de naissance des enfants)", () => {
    expect(profileKey({ ...profile, enfants: [{ anneeNaissance: 2021 }] })).not.toBe(profileKey(profile));
  });
  it("reprend dans la frise quand elle a été commencée", () => {
    const j: Journey = { ...emptyJourney(), profile, choix: { candidats: ["c-01"], mystere: false, mystereId: null }, frise: { month: "2028-01" } };
    expect(resumeStep(j)).toBe("frise");
  });
  it("au départ, l'ordre est tiré au sort et le mystère choisi parmi les autres", () => {
    const reverse = <T,>(xs: readonly T[]) => [...xs].reverse();
    const c = startQuinquennat(["a", "b", "c", "d"], { candidats: ["a", "b"], mystere: true, mystereId: null }, () => 0, reverse);
    expect(c.candidats).toEqual(["b", "a"]);
    expect(["c", "d"]).toContain(c.mystereId);
  });
});
