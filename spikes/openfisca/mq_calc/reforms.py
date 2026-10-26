"""Réformes paramétriques : un candidat = une liste de changements de paramètres OpenFisca.

Seuls les chemins de la liste blanche sont modifiables ; les valeurs viennent des paramètres
d'une mesure publiée (citation exacte), jamais d'un LLM.
"""
from dataclasses import dataclass

from openfisca_core.periods import period as make_period
from openfisca_core.reforms import Reform
from openfisca_core.taxbenefitsystems import TaxBenefitSystem

ALLOWED_PREFIXES = (
    "impot_revenu.bareme_ir_depuis_1945.bareme",
    "impot_revenu.calcul_impot_revenu.plaf_qf",
    "prestations_sociales.solidarite_insertion.minima_sociaux.ppa",
    "prestations_sociales.prestations_familiales",
)


@dataclass(frozen=True)
class ParamChange:
    """Nouvelle valeur d'un paramètre (ou d'un taux/seuil de tranche) à partir d'une date."""

    path: str
    """Ex. `impot_revenu.bareme_ir_depuis_1945.bareme` avec bracket=1, field="rate"."""
    value: float
    start: str
    """Date d'effet, AAAA-MM-JJ."""
    bracket: int | None = None
    field: str | None = None  # "rate" ou "threshold" pour une tranche de barème


# Montants qu'un paramètre peut modifier (le reste est repris de la législation actuelle).
# Les prestations familiales entrent dans les ressources de la prime d'activité.
_AFFECTS = (
    ("impot_revenu.", frozenset({"impot_revenu"})),
    ("prestations_sociales.solidarite_insertion.minima_sociaux.ppa", frozenset({"prime_activite"})),
    ("prestations_sociales.prestations_familiales", frozenset({"allocations_familiales", "prime_activite"})),
)
ALL_OUTPUTS = frozenset({"impot_revenu", "prime_activite", "aides_logement", "allocations_familiales"})


def affected_outputs(changes: list[ParamChange]) -> frozenset[str]:
    """Montants à recalculer pour une réforme ; tout, par prudence, pour un chemin non répertorié."""
    out: set[str] = set()
    for c in changes:
        hit = next((o for prefix, o in _AFFECTS if c.path.startswith(prefix)), ALL_OUTPUTS)
        out |= hit
    return frozenset(out)


def _node(parameters, path: str):
    node = parameters
    for part in path.split("."):
        node = getattr(node, part)
    return node


def make_reform(base: TaxBenefitSystem, changes: list[ParamChange], name: str) -> TaxBenefitSystem:
    for c in changes:
        if not c.path.startswith(ALLOWED_PREFIXES):
            raise ValueError(f"Paramètre hors liste blanche : {c.path}")

    def modify(parameters):
        for c in changes:
            node = _node(parameters, c.path)
            if c.bracket is not None:
                node = getattr(node.brackets[c.bracket], c.field or "rate")
            node.update(start=make_period(c.start).start, value=c.value)
        return parameters

    class _R(Reform):
        def apply(self):
            self.modify_parameters(modifier_function=modify)

    _R.__name__ = name
    return _R(base)
