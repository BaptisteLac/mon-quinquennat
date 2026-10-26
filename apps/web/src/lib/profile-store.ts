/**
 * Profil et progression, gardés dans le navigateur seulement (règle de confidentialité).
 * Enveloppe versionnée : un profil illisible ou d'une version antérieure est ignoré (on repart de zéro)
 * plutôt que d'envoyer au calcul une donnée qui ne respecte plus le schéma.
 */
import { Profile } from "@mon-quinquennat/schema";
import { z } from "zod";

export const STORAGE_KEY = "mon-quinquennat:profil";
export const STORE_VERSION = 1;

const Envelope = z.object({
  version: z.literal(STORE_VERSION),
  savedAt: z.string().datetime(),
  profile: Profile,
});

/** Sous-ensemble de `Storage` utilisé : permet les tests sans navigateur. */
export type KeyValueStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function browserStorage(): KeyValueStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null; // stockage bloqué (navigation privée, réglages du navigateur)
  }
}

export function loadProfile(storage: KeyValueStorage | null = browserStorage()): Profile | null {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = Envelope.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data.profile : null;
  } catch {
    return null;
  }
}

/** Enregistre le profil s'il respecte le schéma ; renvoie `false` si le stockage est indisponible. */
export function saveProfile(profile: Profile, storage: KeyValueStorage | null = browserStorage(), now = new Date()): boolean {
  const envelope = Envelope.parse({ version: STORE_VERSION, savedAt: now.toISOString(), profile });
  try {
    if (!storage) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    return true;
  } catch {
    return false;
  }
}

export function clearProfile(storage: KeyValueStorage | null = browserStorage()): void {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // rien à effacer si le stockage est inaccessible
  }
}
