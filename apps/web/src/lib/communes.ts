import { z } from "zod";

/**
 * Communes par code postal, servies en fichiers statiques découpés par les deux premiers chiffres
 * (`/communes/75.json`) : le code postal saisi ne quitte pas le navigateur.
 * Source : fichier des codes postaux d'Etalab (paquet `codes-postaux`), construit à partir du Code
 * officiel géographique de l'INSEE ; généré par `scripts/build-communes.mts`.
 */
export const CommuneChunk = z.record(z.string().regex(/^\d{5}$/), z.array(z.tuple([z.string(), z.string()])));
export type CommuneChunk = z.infer<typeof CommuneChunk>;

export interface Commune {
  codeCommune: string;
  nom: string;
}

export function isPostalCode(value: string): boolean {
  return /^\d{5}$/.test(value);
}

export function chunkKey(codePostal: string): string {
  return codePostal.slice(0, 2);
}

export function communesFor(chunk: CommuneChunk, codePostal: string): Commune[] {
  return (chunk[codePostal] ?? []).map(([codeCommune, nom]) => ({ codeCommune, nom }));
}

/** Regroupe les lignes du fichier source par fichier statique, communes triées par nom. */
export function buildChunks(rows: readonly { codePostal: string; codeCommune: string; nomCommune: string }[]): Record<string, CommuneChunk> {
  const chunks: Record<string, CommuneChunk> = {};
  for (const r of rows) {
    if (!isPostalCode(r.codePostal)) continue;
    const chunk = (chunks[chunkKey(r.codePostal)] ??= {});
    const list = (chunk[r.codePostal] ??= []);
    if (!list.some(([code]) => code === r.codeCommune)) list.push([r.codeCommune, r.nomCommune]);
  }
  for (const chunk of Object.values(chunks)) {
    for (const list of Object.values(chunk)) list.sort((a, b) => a[1].localeCompare(b[1], "fr"));
  }
  return chunks;
}

export async function fetchCommunes(codePostal: string, fetcher: typeof fetch = fetch): Promise<Commune[]> {
  if (!isPostalCode(codePostal)) return [];
  const res = await fetcher(`/communes/${chunkKey(codePostal)}.json`);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`communes ${res.status}`);
  return communesFor(CommuneChunk.parse(await res.json()), codePostal);
}
