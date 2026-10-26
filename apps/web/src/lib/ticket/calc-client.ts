/**
 * Client du service de calcul OpenFisca (`calc/`). Appelé seulement par le serveur du site : le profil
 * passe par la route `/api/ticket`, jamais directement du navigateur au service.
 */
import type { Profile } from "@mon-quinquennat/schema";
import { z } from "zod";

export const CALC_OUTPUTS = ["impot_revenu", "prime_activite", "aides_logement", "allocations_familiales", "minimum_vieillesse"] as const;
export const CalcOutput = z.enum(CALC_OUTPUTS);
export type CalcOutput = z.infer<typeof CalcOutput>;

const Amounts = z.object(Object.fromEntries(CALC_OUTPUTS.map((k) => [k, z.number().nullable()])) as Record<CalcOutput, z.ZodNullable<z.ZodNumber>>);

const CalcResult = z.object({
  /** €/mois ; null si non calculable pour ce profil (motif dans `nonCalcules`). */
  montants: Amounts,
  nonCalcules: z.record(CalcOutput, z.string()),
  hypotheses: z.array(z.string()),
});

export const CalculResponse = z.object({
  /** Version du programme (corpus) utilisée par le service pour chaque candidat. */
  corpus: z.record(z.string(), z.string()),
  actuel: CalcResult,
  candidats: z.record(z.string(), CalcResult.extend({ mesures: z.record(CalcOutput, z.array(z.string())) })),
});
export type CalculResponse = z.infer<typeof CalculResponse>;

export class CalcError extends Error {
  constructor(
    readonly kind: "non_configure" | "indisponible" | "hors_champ",
    message: string,
  ) {
    super(message);
  }
}

const TIMEOUT_MS = 25_000; // démarrage à froid du service compris

export async function fetchCalcul(profile: Profile, base = process.env.CALC_URL, fetcher: typeof fetch = fetch): Promise<CalculResponse> {
  if (!base) throw new CalcError("non_configure", "Service de calcul non configuré (CALC_URL).");
  let res: Response;
  try {
    res = await fetcher(new URL("/calcul", base), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile }),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new CalcError("indisponible", "Service de calcul injoignable.");
  }
  if (res.status === 400 || res.status === 422) {
    const body = z.object({ erreur: z.string() }).safeParse(await res.json().catch(() => null));
    throw new CalcError("hors_champ", body.success ? body.data.erreur : "Profil hors du champ du calcul.");
  }
  if (!res.ok) throw new CalcError("indisponible", `Service de calcul : réponse ${res.status}.`);
  return CalculResponse.parse(await res.json());
}
