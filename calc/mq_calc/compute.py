"""Montants mensuels d'un profil, pour la législation actuelle et pour des réformes.

- impôt sur le revenu : revenus de l'année 2025 (payé en 2026), ramené au mois ;
- prime d'activité, aides au logement, allocations familiales : mois de REFERENCE_DATE.

Le brut de chaque adulte est trouvé une fois, sous la législation actuelle, pour retrouver le net
déclaré ; il reste ensuite fixe d'une réforme à l'autre (une baisse de cotisations augmente le net).
"""
import functools
from dataclasses import dataclass
from functools import lru_cache

from openfisca_core.simulation_builder import SimulationBuilder
from openfisca_core.taxbenefitsystems import TaxBenefitSystem
from openfisca_france import FranceTaxBenefitSystem

from .profile import Profile
from .situation import REFERENCE_DATE, adults_of, build, gross_variable

# OpenFisca met en cache les paramètres de chaque date avec `functools.lru_cache` (128 entrées),
# cache partagé par tous les systèmes fiscaux. Un calcul touche une soixantaine de dates : avec la
# législation actuelle et 8 candidats, le cache se vide sans cesse et chaque calcul est 3 fois plus
# lent. Cache sans limite : sa taille est bornée par (systèmes × dates utilisées).
TaxBenefitSystem.get_parameters_at_instant = functools.lru_cache(maxsize=None)(  # type: ignore[method-assign]
    TaxBenefitSystem.get_parameters_at_instant.__wrapped__
)

MONTH = REFERENCE_DATE.strftime("%Y-%m")
TAX_YEAR = "2025"
AMOUNTS = ("impot_revenu", "prime_activite", "aides_logement", "allocations_familiales", "minimum_vieillesse")


@lru_cache(maxsize=1)
def baseline() -> TaxBenefitSystem:
    return FranceTaxBenefitSystem()


@dataclass(frozen=True)
class Result:
    amounts: dict[str, float | None]
    """€/mois ; None si non calculable (motif dans `missing`)."""
    missing: dict[str, str]
    hypotheses: tuple[str, ...]
    inputs: "Inputs"


def _simulate(tbs: TaxBenefitSystem, situation: dict):
    return SimulationBuilder().build_from_entities(tbs, situation)


@dataclass(frozen=True)
class Inputs:
    """Ce qui est trouvé une fois sous la législation actuelle, puis gardé fixe pour les réformes."""

    bruts: dict[str, float]
    """Brut mensuel de chaque adulte qui redonne le net déclaré."""
    rfr: dict[str, float]
    """Revenu fiscal de référence annuel de chaque foyer, supposé stable (sert au taux de CSG)."""
    hypotheses: tuple[str, ...] = ()


def _close(a: dict[str, float], b: dict[str, float], tol: float = 0.5) -> bool:
    return a.keys() == b.keys() and all(abs(a[k] - b[k]) <= tol for k in a)


def solve_inputs(profile: Profile, max_iterations: int = 20) -> Inputs:
    """Point fixe : brut ← brut × net cible / net calculé, et RFR(N-2) ← RFR calculé de 2025.

    Près d'un seuil de CSG des revenus de remplacement, il peut n'exister aucun point fixe : le taux
    saute d'un régime à l'autre. On garde alors le RFR le plus bas des deux (régime le plus favorable)
    et on ne cherche plus que le brut ; l'hypothèse est signalée.
    """
    targets = {a.id: a for a in adults_of(profile)}
    bruts = {k: a.net_mensuel / 0.78 for k, a in targets.items() if gross_variable(a.situation_pro) and a.net_mensuel > 0}
    rfr: dict[str, float] = {}
    history: list[dict[str, float]] = []
    frozen = False
    hyp: list[str] = []
    for _ in range(max_iterations):
        sim = _simulate(baseline(), build(profile, bruts, rfr).situation)
        ids = sim.populations["individu"].ids
        done = True
        for k in list(bruts):
            net_var = gross_variable(targets[k].situation_pro)[1]  # type: ignore[index]
            net = float(sim.calculate(net_var, MONTH)[ids.index(k)])
            if net <= 0:
                raise ValueError(f"Net nul pour {k} : revenu hors du champ du modèle.")
            if abs(net - targets[k].net_mensuel) > 0.005:
                done = False
            bruts[k] *= targets[k].net_mensuel / net
        if not frozen:
            foyer_ids = sim.populations["foyer_fiscal"].ids
            new_rfr = {f: float(x) for f, x in zip(foyer_ids, sim.calculate("rfr", TAX_YEAR))}
            if not _close(new_rfr, rfr):
                done = False
                if len(history) >= 2 and _close(new_rfr, history[-2]):
                    new_rfr = {f: min(new_rfr[f], history[-1][f]) for f in new_rfr}
                    frozen = True
                    hyp.append("Revenu proche d'un seuil de taux de CSG : taux le plus favorable retenu (≈).")
            history.append(new_rfr)
            rfr = new_rfr
        if done:
            return Inputs(bruts, rfr, tuple(hyp))
    raise ValueError("Le calcul du brut ne converge pas pour ce profil.")


def compute(
    profile: Profile,
    tbs: TaxBenefitSystem | None = None,
    inputs: Inputs | None = None,
    outputs: frozenset[str] | None = None,
) -> Result:
    """Montants du profil ; `outputs` limite le calcul à certains montants (les autres valent None)."""
    if inputs is None:
        inputs = solve_inputs(profile)
    built = build(profile, inputs.bruts, inputs.rfr)
    sim = _simulate(tbs or baseline(), built.situation)
    missing: dict[str, str] = {}

    want = outputs if outputs is not None else frozenset(AMOUNTS)
    amounts: dict[str, float | None] = {k: None for k in AMOUNTS}
    if "impot_revenu" in want:
        # OpenFisca compte l'impôt en négatif ; ici, montant payé par mois (somme des foyers fiscaux).
        amounts["impot_revenu"] = round(-float(sim.calculate("impot_revenu_restant_a_payer", TAX_YEAR).sum()) / 12, 2) + 0.0
    if "prime_activite" in want:
        amounts["prime_activite"] = round(float(sim.calculate("ppa", MONTH)[0]), 2)
    if "minimum_vieillesse" in want:
        amounts["minimum_vieillesse"] = round(float(sim.calculate("aspa", MONTH)[0]), 2)
    if "allocations_familiales" in want:
        # Montant versé : net de CRDS (`crds_af` est négatif), comme sur service-public.fr.
        amounts["allocations_familiales"] = round(float(sim.calculate("af", MONTH)[0] + sim.calculate("crds_af", MONTH)[0]), 2)
    if "aides_logement" in want:
        if profile.logement in ("locataire_prive", "locataire_hlm") and profile.loyerMensuel is None:
            missing["aides_logement"] = "Loyer non renseigné."
        else:
            amounts["aides_logement"] = round(float(sim.calculate("aide_logement", MONTH)[0]), 2)
    return Result(amounts, missing, inputs.hypotheses + tuple(built.hypotheses), inputs)


@dataclass(frozen=True)
class Candidate:
    id: str
    tbs: TaxBenefitSystem
    outputs: frozenset[str]
    """Montants que ses réformes peuvent modifier (`reforms.affected_outputs`)."""


def compute_all(profile: Profile, candidates: list[Candidate]) -> dict[str, Result]:
    """Un appel d'API : législation actuelle + tous les candidats, pour un profil.

    Chaque candidat ne recalcule que les montants que ses réformes touchent ; les autres sont ceux de
    la législation actuelle.
    """
    inputs = solve_inputs(profile)
    base = compute(profile, None, inputs)
    results = {"actuel": base}
    for c in candidates:
        if not c.outputs:
            results[c.id] = base
            continue
        r = compute(profile, c.tbs, inputs, c.outputs)
        merged = {k: (r.amounts[k] if k in c.outputs else base.amounts[k]) for k in AMOUNTS}
        results[c.id] = Result(merged, {**base.missing, **r.missing}, base.hypotheses, inputs)
    return results
