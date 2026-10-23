/** Accès aux fichiers du test : racine du dépôt, vérité terrain, corpus archivé. */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCorpus, type Corpus } from "./corpus.js";
import { GroundTruth, resolveGroundTruth, type ResolvedGroundTruth } from "./ground-truth.js";

export const SPIKE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const REPO_ROOT = resolve(SPIKE_DIR, "../..");

/** Charge `.env` à la racine du dépôt s'il existe (jamais commité). */
export function loadDotEnv(): void {
  const path = resolve(REPO_ROOT, ".env");
  if (existsSync(path)) process.loadEnvFile(path);
}

export function fromRepo(path: string): string {
  return isAbsolute(path) ? path : resolve(REPO_ROOT, path);
}

export async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

/** Charge la vérité terrain et le corpus qu'elle annote, et vérifie leur cohérence. */
export async function loadGroundTruthAndCorpus(path: string): Promise<{ corpus: Corpus; resolved: ResolvedGroundTruth }> {
  const parsed = GroundTruth.safeParse(await readJson(path));
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")} : ${i.message}`).join("\n");
    throw new Error(`Vérité terrain invalide (${path}) :\n${issues}`);
  }
  const corpus = await loadCorpus(fromRepo(parsed.data.corpus));
  return { corpus, resolved: resolveGroundTruth(parsed.data, corpus) };
}
