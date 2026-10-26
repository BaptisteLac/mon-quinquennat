/**
 * Lecture des données publiées, au build (pages statiques) : candidats (`data/sources.yaml`),
 * badges tirés au sort (`data/badges.json`), mesures (`data/measures/<corpus>.json`) et
 * documents officiels (`data/archives/<corpus>/manifest.json`). Tout passe par Zod : une donnée
 * invalide fait échouer le build plutôt que d'afficher une mesure non vérifiée.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Candidate, isPublishable, Measure } from "@mon-quinquennat/schema";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { slugify } from "./slug";

const SourcesFile = z.object({
  candidates: z.array(
    z.object({
      candidateId: z.string(),
      displayName: z.string().min(1),
      party: z.string().min(1),
      status: Candidate.shape.status,
      corpusPrefix: z.string(),
    }),
  ),
});

const BadgesFile = z.record(z.string(), Candidate.shape.badge);

const MeasuresFile = z.object({
  corpusId: z.string(),
  candidateId: z.string(),
  manifestSha256: z.string().length(64),
  measures: z.array(Measure),
});

const Manifest = z.object({
  corpusId: z.string(),
  candidateId: z.string(),
  collectedAt: z.string().datetime(),
  startUrls: z.array(z.string().url()).min(1),
  documents: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(["html", "pdf"]),
      officialUrl: z.string().url(),
      title: z.string().optional(),
    }),
  ),
});

export interface SourceDocument {
  id: string;
  kind: "html" | "pdf";
  officialUrl: string;
  title: string | null;
}

export interface Programme {
  slug: string;
  candidate: {
    id: string;
    displayName: string;
    party: string;
    status: Candidate["status"];
    badge: Candidate["badge"];
  };
  corpusId: string;
  collectedAt: string;
  /** Pages d'entrée officielles du programme (« Lire l'original »). */
  startUrls: string[];
  documents: Record<string, SourceDocument>;
  /** Mesures publiées (contrôles passés), dans l'ordre du fichier. */
  measures: Measure[];
  /** Mesures repérées mais encore en vérification : ni affichées en détail, ni comptées dans les tickets. */
  pendingCount: number;
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

/**
 * Programmes affichables : candidats déclarés, non retirés, dont un corpus a au moins une mesure publiée.
 * Pour un candidat, le corpus le plus récent (date de collecte) fait foi.
 */
export function loadProgrammes(dataDir: string): Programme[] {
  const sources = SourcesFile.parse(parseYaml(readFileSync(join(dataDir, "sources.yaml"), "utf8")));
  const badgesPath = join(dataDir, "badges.json");
  const badges = existsSync(badgesPath) ? BadgesFile.parse(readJson(badgesPath)) : {};

  const measuresDir = join(dataDir, "measures");
  const files = readdirSync(measuresDir).filter((f) => /^[a-z0-9-]+\.json$/.test(f));
  const corpora = files.map((f) => {
    const file = MeasuresFile.parse(readJson(join(measuresDir, f)));
    const manifest = Manifest.parse(readJson(join(dataDir, "archives", file.corpusId, "manifest.json")));
    if (manifest.corpusId !== file.corpusId || manifest.candidateId !== file.candidateId) {
      throw new Error(`${f} : corpus ou candidat différent du manifeste ${file.corpusId}`);
    }
    return { file, manifest };
  });

  const programmes: Programme[] = [];
  for (const c of sources.candidates) {
    if (c.status === "retire") continue;
    const latest = corpora
      .filter(({ file }) => file.candidateId === c.candidateId)
      .sort((a, b) => b.manifest.collectedAt.localeCompare(a.manifest.collectedAt))[0];
    if (!latest) continue;
    const measures = latest.file.measures.filter(isPublishable);
    if (measures.length === 0) continue;
    const badge = badges[c.candidateId];
    if (!badge) throw new Error(`Pas de badge pour ${c.candidateId} : lancer « npm run tirer-badges -w apps/web ».`);

    const documents: Record<string, SourceDocument> = {};
    for (const d of latest.manifest.documents) {
      documents[d.id] = { id: d.id, kind: d.kind, officialUrl: d.officialUrl, title: d.title ?? null };
    }
    for (const m of measures) {
      for (const q of [...m.sources, ...m.subMeasures.map((s) => s.source), ...(m.rationale ? [m.rationale] : [])]) {
        if (!documents[q.documentId]) throw new Error(`${m.id} cite ${q.documentId}, absent du manifeste ${latest.file.corpusId}`);
      }
    }

    programmes.push({
      slug: slugify(c.displayName),
      candidate: { id: c.candidateId, displayName: c.displayName, party: c.party, status: c.status, badge },
      corpusId: latest.file.corpusId,
      collectedAt: latest.manifest.collectedAt,
      startUrls: latest.manifest.startUrls,
      documents,
      measures,
      pendingCount: latest.file.measures.filter((m) => m.review.status === "en_attente").length,
    });
  }
  const slugs = new Set(programmes.map((p) => p.slug));
  if (slugs.size !== programmes.length) throw new Error("Deux candidats ont la même adresse de page.");
  return programmes;
}

/** Racine `data/` du dépôt, quel que soit le dossier de lancement (racine ou apps/web). */
export function dataDir(): string {
  for (const dir of [join(process.cwd(), "data"), join(process.cwd(), "../../data")]) {
    if (existsSync(join(dir, "sources.yaml"))) return dir;
  }
  throw new Error("Dossier data/ introuvable");
}

let cache: Programme[] | null = null;
export function getProgrammes(): Programme[] {
  cache ??= loadProgrammes(dataDir());
  return cache;
}
