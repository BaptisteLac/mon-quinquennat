/**
 * Tickets « Ma vie en 2032 » de tous les candidats pour un profil.
 *
 * Sans état : le profil sert au calcul puis est oublié (ni journal, ni stockage). Tous les candidats
 * sont calculés à chaque appel ; le navigateur affiche ceux que l'utilisateur a choisis, et le serveur
 * ne sait jamais lesquels.
 */
import { Profile } from "@mon-quinquennat/schema";
import { z } from "zod";
import { getProgrammes } from "@/lib/data";
import { buildTicket, corpusMismatch } from "@/lib/ticket/build";
import { CalcError, fetchCalcul } from "@/lib/ticket/calc-client";

export const dynamic = "force-dynamic";

const Body = z.object({ profile: Profile }).strict();
const NO_STORE = { "Cache-Control": "no-store" };

function error(status: number, erreur: string, message: string): Response {
  return Response.json({ erreur, message }, { status, headers: NO_STORE });
}

export async function POST(request: Request): Promise<Response> {
  const body = Body.safeParse(await request.json().catch(() => null));
  // Les détails de validation ne reprennent jamais les valeurs du profil.
  if (!body.success) return error(400, "profil_invalide", "Le profil envoyé ne respecte pas le schéma.");

  const programmes = getProgrammes();
  let calc;
  try {
    calc = await fetchCalcul(body.data.profile);
  } catch (e) {
    if (e instanceof CalcError && e.kind === "hors_champ") return error(422, "hors_champ", e.message);
    if (e instanceof CalcError && e.kind === "non_configure") return error(503, "calcul_non_configure", e.message);
    return error(503, "calcul_indisponible", "Le service de calcul ne répond pas. Réessaie dans quelques secondes.");
  }
  if (corpusMismatch(programmes, calc).length > 0) {
    return error(503, "mise_a_jour_en_cours", "Un programme vient d'être mis à jour. Réessaie dans quelques minutes.");
  }

  const tickets = programmes.map((p) => buildTicket(p, body.data.profile, calc));
  return Response.json({ tickets }, { headers: NO_STORE });
}
