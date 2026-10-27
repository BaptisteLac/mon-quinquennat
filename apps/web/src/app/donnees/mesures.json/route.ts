import { buildCatalog } from "@/lib/catalog";
import { getProgrammes } from "@/lib/data";

// Fichier statique généré au build : mêmes données pour tous les visiteurs.
export const dynamic = "force-static";

export function GET(): Response {
  return Response.json(buildCatalog(getProgrammes()));
}
