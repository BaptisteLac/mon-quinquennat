/**
 * Lecture et écriture du parcours dans le stockage local du navigateur. Un contenu illisible ou d'une
 * autre version est ignoré (on repart de zéro) ; un stockage indisponible ne bloque jamais le parcours.
 */
import { Journey } from "./journey";

export const STORAGE_KEY = "mon-quinquennat:parcours";

/** Sous-ensemble de `Storage` utilisé : permet les tests sans navigateur. */
export type KeyValueStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function browserStorage(): KeyValueStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null; // stockage bloqué (navigation privée, réglages du navigateur)
  }
}

export function loadJourney(storage: KeyValueStorage | null = browserStorage()): Journey | null {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = Journey.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Enregistre le parcours s'il respecte le schéma ; renvoie `false` si le stockage est indisponible. */
export function saveJourney(journey: Journey, storage: KeyValueStorage | null = browserStorage(), now = new Date()): boolean {
  const valid = Journey.parse({ ...journey, savedAt: now.toISOString() });
  try {
    if (!storage) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify(valid));
    return true;
  } catch {
    return false;
  }
}

export function clearJourney(storage: KeyValueStorage | null = browserStorage()): void {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // rien à effacer si le stockage est inaccessible
  }
}
