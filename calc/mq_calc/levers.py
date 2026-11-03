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
    structural: str | None = None
    """Réforme structurelle (code de `structural.py`) que ce levier paramètre, s'il y en a une."""
    hypotheses: tuple[str, ...] = ()
    """Hypothèses de calcul affichées avec les montants du candidat."""


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


def _none(v: float | None) -> list[ParamChange]:
    return []


def _qf_enfant_supprime(v: float | None) -> list[ParamChange]:
    # Le Revenu familial remplace l'avantage du quotient familial pour enfant : plafond par demi-part à
    # zéro (la demi-part d'un parent isolé, plafond `celib_enf`, est gardée).
    return [ParamChange(f"{PLAF_QF}.general", 0.0, APPLY_FROM)]


CSG_ACTIVITE = "prelevements_sociaux.contributions_sociales.csg.activite"
CSG_ACTIVITE_IMPOSABLE = 0.024
"""Part imposable de la CSG sur les revenus d'activité, gardée telle quelle : un programme qui donne un
taux global ne dit pas comment il se répartit (hypothèse affichée)."""


def _csg_activite(v: float | None) -> list[ParamChange]:
    assert v is not None
    total = v / 100  # % → fraction
    return [
        ParamChange(f"{CSG_ACTIVITE}.taux_global", total, APPLY_FROM),
        ParamChange(f"{CSG_ACTIVITE}.deductible", round(total - CSG_ACTIVITE_IMPOSABLE, 6), APPLY_FROM),
    ]


ALL = frozenset({"impot_revenu", "prime_activite", "rsa", "aides_logement", "allocations_familiales", "minimum_vieillesse", "salaire_net"})

REVENU_FAMILIAL_HYP = (
    "Revenu familial : conditions de résidence régulière et de cinq ans d'activité professionnelle supposées remplies.",
    "Revenu familial : versé jusqu'aux 18 ans de l'enfant ; le complément familial et l'avantage du quotient familial pour enfant disparaissent ; la demi-part d'un parent isolé est gardée.",
)
RIA_HYP = (
    "Revenu d'incitation à l'activité : calculé pour chaque adulte, montant de base plus complément moins la part du revenu d'activité, sans descendre sous zéro.",
    "Revenu d'incitation à l'activité : un demandeur d'emploi est supposé faire au moins quinze heures de recherche ou de formation ; ni les retraités, ni les étudiants, ni les moins de 25 ans sans activité n'y ont droit ; l'ASS n'est pas modélisée.",
)

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
    "revenu_familial_par_enfant_mensuel": Lever(
        "Revenu familial par enfant mineur (€/mois)", ALL, _qf_enfant_supprime, structural="revenu_familial", hypotheses=REVENU_FAMILIAL_HYP
    ),
    "revenu_familial_troisieme_enfant_mensuel": Lever(
        "Revenu familial pour le troisième enfant (€/mois)", ALL, _none, structural="revenu_familial"
    ),
    "revenu_incitation_activite_base_mensuel": Lever(
        "Revenu d'incitation à l'activité, montant de base (€/mois)", ALL, _none, structural="ria", hypotheses=RIA_HYP
    ),
    "revenu_incitation_activite_complement_mensuel": Lever(
        "Revenu d'incitation à l'activité, complément recherche ou formation (€/mois)", ALL, _none, structural="ria"
    ),
    "revenu_incitation_activite_taux_degressivite": Lever(
        "Revenu d'incitation à l'activité, part du revenu d'activité déduite (%)", ALL, _none, structural="ria"
    ),
    "csg_activite_taux_global": Lever(
        "Taux global de CSG sur les revenus d'activité (%)",
        frozenset({"salaire_net", "impot_revenu", "prime_activite", "rsa", "aides_logement"}),
        _csg_activite,
        hypotheses=("CSG sur les revenus d'activité : la part imposable (2,4 %) est gardée, la baisse porte sur la part déductible.",),
    ),
}


def structural_settings(uses: list[tuple[str, float | None]]) -> dict[str, dict[str, float | None]]:
    """Valeurs des leviers groupées par réforme structurelle : {réforme: {levier: valeur}}."""
    out: dict[str, dict[str, float | None]] = {}
    for lever, value in uses:
        kind = LEVERS[lever].structural
        if kind is not None:
            out.setdefault(kind, {})[lever] = value
    return out


def changes_for(lever: str, value: float | None) -> list[ParamChange]:
    spec = LEVERS[lever]
    if spec.needs_value and value is None:
        raise ValueError(f"Le levier {lever} attend une valeur.")
    if not spec.needs_value and value is not None:
        raise ValueError(f"Le levier {lever} ne prend pas de valeur.")
    return spec.changes(value)
