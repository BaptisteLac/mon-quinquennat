"""Réformes structurelles : une prestation remplacée par une autre, écrite ici en code testé.

Un paramètre ne suffit pas quand un programme crée une prestation (Revenu familial, Revenu d'incitation
à l'activité) : on remplace alors la formule de variables OpenFisca. Les montants viennent des leviers
d'une mesure publiée (citation exacte) ; ce module ne contient que la règle de calcul décrite par le
programme, jamais un montant.
"""
from collections.abc import Callable, Mapping

import numpy as np
from openfisca_core.model_api import Variable
from openfisca_core.reforms import Reform
from openfisca_france.model.base import MONTH, Famille, TypesActivite

Settings = Mapping[str, float | None]


def _value(settings: Settings, lever: str) -> float:
    v = settings.get(lever)
    if v is None:
        raise ValueError(f"Levier {lever} manquant ou sans valeur.")
    return float(v)


def revenu_familial(reform: Reform, settings: Settings) -> None:
    """Montant par enfant mineur à charge, le troisième au montant dédié ; remplace les allocations
    familiales (majoration pour âge comprise) et le complément familial. Versé net (pas de CRDS)."""
    par_enfant = _value(settings, "revenu_familial_par_enfant_mensuel")
    troisieme = settings.get("revenu_familial_troisieme_enfant_mensuel")
    troisieme = par_enfant if troisieme is None else float(troisieme)

    class af(Variable):
        value_type = float
        entity = Famille
        definition_period = MONTH
        label = "Revenu familial (réforme)"

        def formula(famille, period):
            mineur = famille.members("prestations_familiales_enfant_a_charge", period) * (famille.members("age", period) < 18)
            n = famille.sum(mineur)
            return par_enfant * n + (troisieme - par_enfant) * (n >= 3)

    class cf(Variable):
        value_type = float
        entity = Famille
        definition_period = MONTH
        label = "Complément familial (supprimé)"

        def formula(famille, period):
            return famille.empty_array()

    class crds_af(Variable):
        value_type = float
        entity = Famille
        definition_period = MONTH
        label = "CRDS sur le Revenu familial (aucune)"

        def formula(famille, period):
            return famille.empty_array()

    for v in (af, cf, crds_af):
        reform.update_variable(v)


def ria(reform: Reform, settings: Settings) -> None:
    """Revenu d'incitation à l'activité, par adulte : base, plus le complément s'il travaille ou cherche
    un emploi, moins une part du revenu d'activité, sans descendre sous zéro. Remplace RSA et prime
    d'activité."""
    base = _value(settings, "revenu_incitation_activite_base_mensuel")
    complement = _value(settings, "revenu_incitation_activite_complement_mensuel")
    taux = _value(settings, "revenu_incitation_activite_taux_degressivite") / 100  # % → fraction

    class ppa(Variable):
        value_type = float
        entity = Famille
        definition_period = MONTH
        label = "Revenu d'incitation à l'activité (réforme)"

        def formula(famille, period):
            parent = famille.members.has_role(Famille.PARENT)
            act = famille.members("ppa_revenu_activite_individu", period)
            activite = famille.members("activite", period)
            age = famille.members("age", period)
            en_activite = act > 0
            cherche = activite == TypesActivite.chomeur
            exclu = (activite == TypesActivite.retraite) + (activite == TypesActivite.etudiant) + ((age < 25) * np.logical_not(en_activite))
            montant = np.where(en_activite + cherche, base + complement, base) - taux * act
            return famille.sum(np.clip(montant, 0, None) * parent * np.logical_not(exclu))

    class rsa(Variable):
        value_type = float
        entity = Famille
        definition_period = MONTH
        label = "RSA (remplacé par le Revenu d'incitation à l'activité)"

        def formula(famille, period):
            return famille.empty_array()

    for v in (ppa, rsa):
        reform.update_variable(v)


STRUCTURAL: dict[str, Callable[[Reform, Settings], None]] = {"revenu_familial": revenu_familial, "ria": ria}
