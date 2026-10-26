/** Écrit packages/schema/json/profile.schema.json et reform-levers.json (vérifiés à jour par json-schema.test.ts). */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { profileJsonSchema, reformLevers } from "../src/json-schema.js";

const out = resolve(dirname(fileURLToPath(import.meta.url)), "../json/profile.schema.json");
await mkdir(dirname(out), { recursive: true });
await writeFile(out, JSON.stringify(profileJsonSchema(), null, 2) + "\n");
const levers = resolve(dirname(out), "reform-levers.json");
await writeFile(levers, JSON.stringify(reformLevers(), null, 2) + "\n");
console.log(`Écrit ${out} et ${levers}`);
