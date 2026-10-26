import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

const config: NextConfig = {
  // Paquets du monorepo publiés en TypeScript source.
  transpilePackages: ["@mon-quinquennat/schema", "@mon-quinquennat/formulas"],
  // Le site lit les données publiées à la racine du dépôt (data/).
  outputFileTracingRoot: repoRoot,
  turbopack: { root: repoRoot },
  poweredByHeader: false,
};

export default config;
