/**
 * Coût des appels LLM. Les tarifs sont ceux publiés par chaque fournisseur, en dollars par million de jetons.
 * Le taux de change et les tarifs d'un modèle absent de la table sont passés par variables d'environnement :
 * on ne devine jamais un prix.
 */

export interface Price {
  inputUsdPerMTok: number;
  outputUsdPerMTok: number;
}

/**
 * Tarifs Anthropic (API directe), relevés le 2026-10-06 sur la page « Pricing » de la documentation Anthropic.
 * À revérifier avant de consigner un résultat dans RESULTATS.md.
 * Claude Haiku 5.5 : tarif valable jusqu'à 100 000 jetons d'entrée par requête.
 */
export const KNOWN_PRICES: Readonly<Record<string, Price>> = {
  "claude-opus-5-5": { inputUsdPerMTok: 4, outputUsdPerMTok: 20 },
  "claude-sonnet-5-5": { inputUsdPerMTok: 2, outputUsdPerMTok: 10 },
  "claude-haiku-5-5": { inputUsdPerMTok: 0.1, outputUsdPerMTok: 0.5 },
};

/** Lit `PRICE_<MODELE>="entrée,sortie"` (USD / million de jetons), ex. PRICE_MON_MODELE="1.5,6". */
export function priceFromEnv(model: string, env: NodeJS.ProcessEnv): Price | undefined {
  const raw = env[`PRICE_${model.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`];
  if (!raw) return undefined;
  const [input, output] = raw.split(",").map(Number);
  if (input === undefined || output === undefined || !Number.isFinite(input) || !Number.isFinite(output)) {
    throw new Error(`Tarif illisible pour ${model} : « ${raw} » (attendu « entrée,sortie »)`);
  }
  return { inputUsdPerMTok: input, outputUsdPerMTok: output };
}

export interface Usage {
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface CostSummary {
  usd: number;
  /** null si le taux de change n'est pas fourni. */
  eur: number | null;
  /** Modèles sans tarif connu : le coût est alors incomplet. */
  unpricedModels: string[];
}

export function totalCost(usages: readonly Usage[], env: NodeJS.ProcessEnv): CostSummary {
  let usd = 0;
  const unpriced = new Set<string>();
  for (const u of usages) {
    // Les appels sont enregistrés en « fournisseur:modèle » ; la table est indexée par l'identifiant seul.
    const price = priceFromEnv(u.model, env) ?? KNOWN_PRICES[u.model.slice(u.model.indexOf(":") + 1)];
    if (!price) {
      unpriced.add(u.model);
      continue;
    }
    usd += (u.inputTokens * price.inputUsdPerMTok + u.outputTokens * price.outputUsdPerMTok) / 1_000_000;
  }
  const rate = env.EUR_PER_USD ? Number(env.EUR_PER_USD) : NaN;
  return { usd, eur: Number.isFinite(rate) ? usd * rate : null, unpricedModels: [...unpriced] };
}
