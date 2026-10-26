import { describe, expect, it } from "vitest";
import type { Profile } from "@mon-quinquennat/schema";
import { clearProfile, loadProfile, saveProfile, STORAGE_KEY, type KeyValueStorage } from "./profile-store";

function memory(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const profile: Profile = {
  age: 34,
  genre: "autre",
  situationFamiliale: "seul",
  enfants: [],
  situationPro: "salarie_prive",
  revenusNetsMensuels: 1800,
  logement: "locataire_prive",
  loyerMensuel: 600,
  lieuDeVie: "ville_moyenne",
  mobilite: "transports",
};

describe("profil dans le navigateur", () => {
  it("relit ce qui a été enregistré", () => {
    const s = memory();
    expect(saveProfile(profile, s)).toBe(true);
    expect(loadProfile(s)).toEqual(profile);
  });
  it("ignore un contenu illisible ou d'une autre version", () => {
    const s = memory();
    s.setItem(STORAGE_KEY, "{pas du json");
    expect(loadProfile(s)).toBeNull();
    s.setItem(STORAGE_KEY, JSON.stringify({ version: 0, savedAt: new Date().toISOString(), profile }));
    expect(loadProfile(s)).toBeNull();
  });
  it("refuse d'enregistrer un profil hors schéma", () => {
    expect(() => saveProfile({ ...profile, age: 12 }, memory())).toThrow();
  });
  it("tolère un stockage indisponible", () => {
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
    expect(loadProfile(failing)).toBeNull();
    expect(saveProfile(profile, failing)).toBe(false);
    expect(() => clearProfile(failing)).not.toThrow();
    expect(saveProfile(profile, null)).toBe(false);
  });
  it("efface le profil", () => {
    const s = memory();
    saveProfile(profile, s);
    clearProfile(s);
    expect(s.data.size).toBe(0);
  });
});
