/**
 * Génère public/communes/<2 chiffres>.json depuis le fichier des codes postaux d'Etalab.
 * Lancé avant `next dev` et `next build` ; les fichiers générés ne sont pas versionnés.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { buildChunks } from "../src/lib/communes";

const require = createRequire(import.meta.url);
const rows = require("codes-postaux/codes-postaux.json") as { codePostal: string; codeCommune: string; nomCommune: string }[];
const out = new URL("../public/communes/", import.meta.url);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const chunks = buildChunks(rows);
for (const [key, chunk] of Object.entries(chunks)) writeFileSync(new URL(`${key}.json`, out), JSON.stringify(chunk));
console.log(`communes : ${rows.length} lignes, ${Object.keys(chunks).length} fichiers`);
