"""Leviers de réforme (liste fermée, `ReformLever` du schéma) → paramètres OpenFisca.

La valeur d'un levier vient d'une citation, dans l'unité du programme (€/mois, %) ; la conversion
vers l'unité du paramètre OpenFisca (€/an, fraction) est faite ici, par du code testé, jamais par un LLM.
"""
from collections.abc import Callable
from dataclasses import dataclass

from .reforms import ParamChange

APPLY_FROM = "2023-01-01"
"""Le ticket compare « une fois tout appliqué » : la réforme s'applique sur toutes les années du calcul
(N-2 à N), quelle que soit la date d'effet de la mesure, qui sert à la frise."""

PLAF_QF = "impot_revenu.calcul_impot_revenu.plaf_qf.plafond_avantages_procures_par_demi_part"
NO_CEILING = 1e12
"""« Sans plafond » : un plafond inatteignable. Pas `inf` : OpenFisca multiplie le plafond par des
nombres de demi-parts parfois nuls, et 0 × inf donne NaN."""


@dataclass(frozen=True)
class Lever:
    label: str
    outputs: frozenset[str]
    changes: Callable[[float | None], list[ParamChange]]
    needs_value: bool = True


def _aspa_seule(v: float | None) -> list[ParamChange]:
    assert v is not None
    # L'ASPA d'une personne seule est différentielle : plafond de ressources moins ressources, dans la
    # limite du montant maximum. Les deux valent le minimum vieillesse : on change les deux.
    aspa = "prestations_sociales.solidarite_insertion.minimum_vieillesse.aspa"
    return [ParamChange(f"{aspa}.{k}.personnes_seules", 12 * v, APPLY_FROM) for k in ("plafond_ressources", "montant_maximum_annuel")]  # €/mois → €/an


def _qf_sans_plafond(v: float | None) -> list[ParamChange]:
    # Demi-parts pour enfant : cas général et premier enfant d'un parent isolé.
    return [ParamChange(f"{PLAF_QF}.{k}", NO_CEILING, APPLY_FROM) for k in ("general", "celib_enf")]


def _ir_tranche_2(v: float | None) -> list[ParamChange]:
    assert v is not None
    return [ParamChange("impot_revenu.bareme_ir_depuis_1945.bareme", v / 100, APPLY_FROM, 1, "rate")]  # % → fraction


LEVERS: dict[str, Lever] = {
    "minimum_vieillesse_personne_seule_mensuel": Lever(
        "Minimum vieillesse d'une personne seule (€/mois)",
        frozenset({"minimum_vieillesse", "aides_logement", "prime_activite"}),
        _aspa_seule,
    ),
    "quotient_familial_sans_plafond": Lever(
        "Quotient familial sans plafond pour les demi-parts d'enfant", frozenset({"impot_revenu"}), _qf_sans_plafond, needs_value=False
    ),
    "impot_revenu_taux_tranche_2": Lever("Taux de la 2e tranche de l'impôt (%)", frozenset({"impot_revenu"}), _ir_tranche_2),
}


def changes_for(lever: str, value: float | None) -> list[ParamChange]:
    spec = LEVERS[lever]
    if spec.needs_value and value is None:
        raise ValueError(f"Le levier {lever} attend une valeur.")
    if not spec.needs_value and value is not None:
        raise ValueError(f"Le levier {lever} ne prend pas de valeur.")
    return spec.changes(value)
