/**
 * Réveil du service de calcul (éteint au repos, docs/decisions.md « Hébergement »). Le navigateur appelle
 * cette route au début du personnage, sans aucune donnée : c'est le serveur du site qui joint le service,
 * pour que le visiteur ne s'y connecte jamais directement.
 */
export const dynamic = "force-dynamic";

const TIMEOUT_MS = 2500;

export async function GET(): Promise<Response> {
  const base = process.env.CALC_URL;
  if (!base) return Response.json({ calcul: "non_configure" }, { headers: { "Cache-Control": "no-store" } });
  try {
    const res = await fetch(new URL("/sante", base), { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
    return Response.json({ calcul: res.ok ? "pret" : "reveil" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    // Démarrage à froid plus long que le délai : la requête a suffi à lancer le réveil.
    return Response.json({ calcul: "reveil" }, { headers: { "Cache-Control": "no-store" } });
  }
}
