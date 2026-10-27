/**
 * Signalement d'une erreur → issue du dépôt public. Sans état : le message est transmis à GitHub
 * puis oublié ; ni adresse IP ni profil n'y sont joints.
 */
import { createIssue, Report, reportIssue } from "@/lib/report";
import { findReportedMeasure, reportToken } from "@/lib/report-server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

function error(status: number, erreur: string, message: string): Response {
  return Response.json({ erreur, message }, { status, headers: NO_STORE });
}

export async function POST(request: Request): Promise<Response> {
  const body = Report.safeParse(await request.json().catch(() => null));
  if (!body.success) return error(400, "signalement_invalide", "Le signalement est incomplet : choisis un type et écris au moins quelques mots.");
  // Champ invisible rempli : un robot. On répond comme si tout allait bien, sans rien créer.
  if (body.data.website) return Response.json({ ok: true }, { headers: NO_STORE });

  const measure = body.data.measureId ? findReportedMeasure(body.data.measureId) : null;
  if (body.data.measureId && !measure) return error(400, "mesure_inconnue", "Cette mesure n'est pas (ou plus) publiée.");

  const token = reportToken();
  if (!token) return error(503, "signalement_non_configure", "L'envoi direct n'est pas encore configuré.");
  try {
    const url = await createIssue(reportIssue(body.data, measure), token);
    return Response.json({ ok: true, url }, { headers: NO_STORE });
  } catch {
    return error(502, "signalement_indisponible", "L'envoi n'a pas abouti. Réessaie dans quelques minutes.");
  }
}
