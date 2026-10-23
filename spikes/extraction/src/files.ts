/** Accès aux fichiers du test : racine du dépôt, vérité terrain, PDF archivé. */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { GroundTruth } from "./ground-truth.js";
import { pdfPages } from "./pdf.js";
import { sha256 } from "./run.js";

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

export async function loadGroundTruth(path: string): Promise<GroundTruth> {
  const parsed = GroundTruth.safeParse(await readJson(path));
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")} : ${i.message}`).join("\n");
    throw new Error(`Vérité terrain invalide (${path}) :\n${issues}`);
  }
  return parsed.data;
}

/** Lit le PDF archivé après avoir vérifié son empreinte : on ne cite jamais un fichier modifié. */
export async function loadArchivedPages(doc: GroundTruth["document"]): Promise<string[]> {
  const path = fromRepo(doc.localPath);
  const hash = sha256(new Uint8Array(await readFile(path)));
  if (hash !== doc.sha256) {
    throw new Error(`Empreinte différente pour ${path} : attendu ${doc.sha256}, obtenu ${hash}`);
  }
  const pages = await pdfPages(path);
  if (pages.length !== doc.totalPages) {
    throw new Error(`Nombre de pages différent : la vérité terrain en annonce ${doc.totalPages}, le PDF en a ${pages.length}`);
  }
  return pages;
}
