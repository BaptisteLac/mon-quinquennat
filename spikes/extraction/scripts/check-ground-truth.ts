/**
 * Vérifie la vérité terrain avant tout score : schéma, empreinte du PDF, et chaque citation
 * trouvée mot pour mot à sa page. Une vérité terrain fausse fausserait tous les indicateurs.
 *
 *   npm run check-gt [-- ground-truth.json]
 */
import { resolve } from "node:path";
import { loadArchivedPages, loadGroundTruth, SPIKE_DIR } from "../src/files.js";
import { locateQuote } from "../src/normalize.js";

const gtPath = resolve(SPIKE_DIR, process.argv[2] ?? "ground-truth.json");
const gt = await loadGroundTruth(gtPath);
const pages = await loadArchivedPages(gt.document);

let errors = 0;
for (const m of gt.measures) {
  const loc = locateQuote(m.quote, m.page, pages);
  if (!loc.found) {
    errors++;
    const hint = loc.foundOnPages.length > 0 ? ` — trouvée p. ${loc.foundOnPages.join(", ")}` : "";
    console.error(`✗ ${m.id} p. ${m.page} : citation introuvable${hint}`);
  }
}

const bySection = gt.sections.map((s) => `${s.id} : ${gt.measures.filter((m) => m.sectionId === s.id).length}`);
console.log(`${gt.measures.length} mesures (${bySection.join(", ")}), ${errors} citation(s) introuvable(s).`);
if (gt.measures.length < 25 || gt.measures.length > 30) {
  console.warn("Attention : le protocole prévoit 25 à 30 mesures.");
}
if (errors > 0) process.exit(1);
