/**
 * Signalement d'une erreur. Il devient une issue du dépôt public (file d'exceptions, étiquette
 * « signalement ») : par le serveur du site quand un jeton GitHub est configuré, sinon par un lien
 * pré-rempli que la personne ouvre avec son propre compte GitHub. Aucune donnée du profil n'y entre.
 */
import { z } from "zod";
import { SOURCE_REPO } from "./site";

export const REPORT_KINDS = {
  citation: "La citation ne correspond pas au programme",
  sens: "Le résumé ne dit pas ce que dit le programme",
  chiffre: "Un taux, un montant ou une date ne correspond pas au programme",
  calcul: "Un montant calculé pour mon profil me semble faux",
  autre: "Autre chose",
} as const;
export type ReportKind = keyof typeof REPORT_KINDS;

export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 2000;

export const Report = z
  .object({
    kind: z.enum(Object.keys(REPORT_KINDS) as [ReportKind, ...ReportKind[]]),
    measureId: z
      .string()
      .regex(/^m-[0-9a-z]{4,32}$/)
      .optional(),
    message: z.string().trim().min(MESSAGE_MIN).max(MESSAGE_MAX),
    /** Champ invisible : rempli seulement par un robot. */
    website: z.string().max(200).optional(),
  })
  .strict();
export type Report = z.infer<typeof Report>;

/** Contexte d'une mesure publiée, lu dans les données du site (jamais fourni par le visiteur). */
export interface ReportedMeasure {
  id: string;
  title: string;
  candidate: string;
  party: string;
  path: string;
}

export interface Issue {
  title: string;
  body: string;
  labels: string[];
}

export const REPORT_LABEL = "signalement";

/** Clôture de bloc plus longue que toute suite d'accents graves du message. */
function fence(text: string): string {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((r) => r.length));
  return "`".repeat(Math.max(3, longest + 1));
}

export function reportIssue(report: Report, measure: ReportedMeasure | null): Issue {
  const f = fence(report.message);
  const subject = measure ? `${measure.id} (${measure.candidate})` : "site";
  const context = measure
    ? [`- Mesure : ${measure.id} · ${measure.title}`, `- Programme : ${measure.candidate} · ${measure.party}`, `- Fiche : ${measure.path}`]
    : ["- Mesure : non précisée"];
  return {
    title: `Signalement : ${REPORT_KINDS[report.kind].toLowerCase()} · ${subject}`,
    body: [
      `**Type** : ${REPORT_KINDS[report.kind]}`,
      ...context,
      "",
      "**Message**",
      "",
      // Bloc de code : le texte du visiteur n'est ni mis en forme ni lu comme une mention (@nom).
      f,
      report.message,
      f,
      "",
      "_Envoyé depuis le formulaire « Signaler une erreur » du site. À traiter : corriger la mesure ou répondre, puis ajouter le cas aux tests._",
    ].join("\n"),
    labels: [REPORT_LABEL],
  };
}

/** Lien « nouvelle issue » pré-rempli, ouvert par la personne avec son compte GitHub. */
export function newIssueUrl(issue: Issue): string {
  const params = new URLSearchParams({ title: issue.title, body: issue.body, labels: issue.labels.join(",") });
  return `https://github.com/${SOURCE_REPO}/issues/new?${params.toString()}`;
}

export class ReportError extends Error {}

/** Création de l'issue par l'API GitHub, avec le jeton du serveur. Renvoie l'adresse de l'issue. */
export async function createIssue(issue: Issue, token: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  const res = await fetchImpl(`https://api.github.com/repos/${SOURCE_REPO}/issues`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(issue),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new ReportError(`GitHub a répondu ${res.status}`);
  const created = z.object({ html_url: z.string().url() }).safeParse(await res.json().catch(() => null));
  if (!created.success) throw new ReportError("Réponse de GitHub inattendue");
  return created.data.html_url;
}
