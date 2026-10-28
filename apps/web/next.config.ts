import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

const DATA_FILES = [
  "../../data/sources.yaml",
  "../../data/badges.json",
  "../../data/measures/*.json",
  "../../data/archives/*/manifest.json",
];

/** Archives brutes et étapes du pipeline : jamais lues par le site, mais attrapées par le traçage des chemins calculés. */
const NOT_DATA = ["../../data/archives/*/raw/**", "../../data/archives/*/text/**", "../../data/archives/*/*.txt", "../../data/extractions/**"];

const RUNTIME_ROUTES = ["/api/ticket", "/api/signalement", "/signaler", "/t/[payload]", "/t/[payload]/image"];

const config: NextConfig = {
  // Paquets du monorepo publiés en TypeScript source.
  transpilePackages: ["@mon-quinquennat/schema", "@mon-quinquennat/formulas"],
  // Le site lit les données publiées à la racine du dépôt (data/).
  outputFileTracingRoot: repoRoot,
  turbopack: { root: repoRoot },
  poweredByHeader: false,
  // Fichiers lus à l'exécution par les routes dynamiques (chemins calculés, invisibles au traçage) :
  // données publiées (`src/lib/data.ts`) et polices des images de partage.
  outputFileTracingIncludes: {
    ...Object.fromEntries(RUNTIME_ROUTES.map((r) => [r, DATA_FILES])),
    "/t/[payload]/image": [...DATA_FILES, "./assets/fonts/*.woff"],
  },
  outputFileTracingExcludes: { "/**": NOT_DATA },
};

export default config;
