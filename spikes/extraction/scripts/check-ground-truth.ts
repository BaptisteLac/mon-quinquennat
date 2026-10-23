/**
 * Vérifie la vérité terrain avant tout score : schéma, empreintes du corpus, documents et pages existants,
 * et chaque citation trouvée mot pour mot à sa page. Une vérité terrain fausse fausserait tous les indicateurs.
 *
 *   npm run check-gt [-- ground-truth.json]
 */
import { resolve } from "node:path";
import { loadGroundTruthAndCorpus, SPIKE_DIR } from "../src/files.js";
import { locateQuote } from "../src/normalize.js";

const gtPath = resolve(SPIKE_DIR, process.argv[2] ?? "ground-truth.json");
const { corpus, resolved } = await loadGroundTruthAndCorpus(gtPath);
const texts = corpus.units.map((u) => u.text);

let errors = 0;
for (const m of resolved.measures) {
  const loc = locateQuote(m.quote, m.unit, texts);
  if (!loc.found) {
    errors++;
    const elsewhere = loc.foundOnPages.map((i) => {
      const u = corpus.units[i - 1];
      return u ? `${u.documentId} p. ${u.page}` : String(i);
    });
    const hint = elsewhere.length > 0 ? ` — trouvée dans ${elsewhere.join(", ")}` : "";
    console.error(`✗ ${m.id} (${m.documentId} p. ${m.page}) : citation introuvable${hint}`);
  }
}

const gt = resolved.gt;
const bySection = gt.sections.map((s) => `${s.id} : ${gt.measures.filter((m) => m.sectionId === s.id).length}`);
console.log(`${gt.measures.length} mesures (${bySection.join(", ")}), ${errors} citation(s) introuvable(s).`);
if (gt.measures.length < 25 || gt.measures.length > 30) {
  console.warn("Attention : le protocole prévoit 25 à 30 mesures.");
}
if (errors > 0) process.exit(1);
