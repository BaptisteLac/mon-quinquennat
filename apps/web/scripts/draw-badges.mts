/**
 * Tire au sort le badge de forme des candidats qui n'en ont pas (data/badges.json).
 *   npm run tirer-badges -w apps/web
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { parse } from "yaml";
import { drawBadges, type Badge } from "../src/lib/badges";
import { cryptoRandom } from "../src/lib/shuffle";
import { dataDir } from "../src/lib/data";

const dir = dataDir();
const sources = parse(readFileSync(`${dir}/sources.yaml`, "utf8")) as { candidates: { candidateId: string }[] };
const path = `${dir}/badges.json`;
const existing = existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as Record<string, Badge>) : {};
const badges = drawBadges(existing, sources.candidates.map((c) => c.candidateId), cryptoRandom);
writeFileSync(path, JSON.stringify(badges, null, 2) + "\n");
console.log(badges);
