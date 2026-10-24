"""Construction de la situation OpenFisca à partir du profil.

Les revenus déclarés par l'utilisateur sont nets ; OpenFisca part du brut. `bruts` donne le brut
mensuel de chaque adulte (trouvé par `compute.solve_bruts`). Les revenus sont supposés constants
sur les années utilisées par les ressources des prestations (N-2 à N).
"""
from dataclasses import dataclass, field
from datetime import date

from .profile import ComplementCalcul, Profile

REFERENCE_DATE = date(2026, 10, 1)
"""Mois de calcul des prestations (et 1er jour pour les âges)."""
YEARS = ("2024", "2025", "2026")
"""Années renseignées : ressources N-2 (CSG des retraites, aides) à N."""

# Milieu de tranche quand l'âge exact n'est pas connu.
BAND_AGE = {"0_2": 1, "3_10": 6, "11_17": 14, "18_25": 19}
# Zone APL déduite du lieu de vie, faute de commune.
ZONE_FROM_LIEU = {
    "grande_ville": "zone_2",
    "ville_moyenne": "zone_3",
    "peripherie": "zone_2",
    "rural": "zone_3",
    "outre_mer": "zone_3",
}
LOGEMENT = {
    "locataire_prive": "locataire_vide",
    "locataire_hlm": "locataire_hlm",
    "proprio_credit": "proprietaire",
    "proprio_sans_credit": "proprietaire",
    "heberge": "loge_gratuitement",
}
ACTIVITE = {
    "salarie_prive": "actif",
    "fonctionnaire": "actif",
    "independant": "actif",
    "chef_entreprise": "actif",
    "demandeur_emploi": "chomeur",
    "etudiant": "etudiant",
    "retraite": "retraite",
    "sans_activite": "inactif",
}
# Cases de la déclaration 2042-C-PRO (régime micro, sans versement libératoire).
MICRO_CA = {
    "bic_vente": "mbic_impv",
    "bic_services": "mbic_imps",
    "bnc": "mbnc_impo",
}


@dataclass(frozen=True)
class Adult:
    """Un adulte du foyer et la variable brute qui porte son revenu."""

    id: str
    situation_pro: str
    net_mensuel: float
    """Revenu net mensuel déclaré (0 si sans revenu)."""


@dataclass
class Built:
    situation: dict
    adults: list[Adult]
    hypotheses: list[str] = field(default_factory=list)


def gross_variable(situation_pro: str) -> tuple[str, str] | None:
    """(variable brute d'entrée, variable nette correspondante) selon la situation."""
    return {
        "salarie_prive": ("salaire_de_base", "salaire_net"),
        "chef_entreprise": ("salaire_de_base", "salaire_net"),
        "fonctionnaire": ("traitement_indiciaire_brut", "salaire_net"),
        "retraite": ("retraite_brute", "retraite_nette"),
        "demandeur_emploi": ("chomage_brut", "chomage_net"),
    }.get(situation_pro)


def adults_of(profile: Profile) -> list[Adult]:
    net = profile.pensionMensuelle if profile.situationPro == "retraite" and profile.pensionMensuelle is not None else profile.revenusNetsMensuels
    adults = [Adult("demandeur", profile.situationPro, net)]
    if profile.situationFamiliale != "seul":
        # Le profil ne demande pas la situation du conjoint : salarié du privé s'il a un revenu.
        conj = profile.revenusConjointNetsMensuels or 0.0
        adults.append(Adult("conjoint", "salarie_prive" if conj > 0 else "sans_activite", conj))
    return adults


def birth_date(age: int) -> str:
    return date(REFERENCE_DATE.year - age, REFERENCE_DATE.month, 1).isoformat()


RFR_INPUT_YEARS = ("2023", "2024")
"""Le revenu fiscal de référence de N-2 fixe le taux de CSG des retraites et du chômage. Calculé par
OpenFisca, il crée une chaîne N → N-2 → N-4… qui renvoie 0 (boucle détectée) : on le fournit pour
2023 et 2024, valeur trouvée par point fixe (`compute.solve_inputs`)."""


def build(
    profile: Profile,
    extra: ComplementCalcul,
    bruts: dict[str, float],
    rfr: dict[str, float] | None = None,
) -> Built:
    hyp: list[str] = []
    adults = adults_of(profile)
    individus: dict[str, dict] = {}

    for a in adults:
        ind: dict = {
            "date_naissance": {"ETERNITY": birth_date(profile.age)},
            "activite": {y: ACTIVITE[a.situation_pro] for y in YEARS},
        }
        gv = gross_variable(a.situation_pro)
        if gv and a.net_mensuel > 0:
            ind[gv[0]] = {y: 12 * bruts[a.id] for y in YEARS}
            if a.situation_pro == "fonctionnaire":
                ind["categorie_salarie"] = {y: "public_titulaire_etat" for y in YEARS}
                hyp.append("Fonctionnaire de l'État, sans primes : tout le revenu est traité indiciaire.")
            if a.situation_pro in ("salarie_prive", "chef_entreprise"):
                ind["categorie_salarie"] = {y: "prive_non_cadre" for y in YEARS}
            if profile.tempsPartiel and a.id == "demandeur":
                ind["contrat_de_travail"] = {y: "temps_partiel" for y in YEARS}
        if a.situation_pro == "independant" and a.id == "demandeur":
            if extra.chiffreAffairesAnnuel is None or extra.activiteMicro is None:
                raise ValueError("Indépendant : chiffre d'affaires et type d'activité nécessaires (ComplementCalcul).")
            ind[MICRO_CA[extra.activiteMicro]] = {y: extra.chiffreAffairesAnnuel for y in YEARS}
        individus[a.id] = ind
    if profile.handicapOuAidant in (None, "non"):
        # Sans handicap déclaré, pas d'allocation aux adultes handicapés : on la fixe à 0 plutôt que
        # de la laisser calculer (c'est la moitié du temps de calcul de la prime d'activité).
        for a in adults:
            individus[a.id]["aah"] = {y: 0.0 for y in YEARS}
    if profile.situationFamiliale != "seul":
        hyp.append("Conjoint du même âge, salarié du privé s'il a un revenu.")

    ages = extra.agesEnfants
    if ages is None:
        ages = [BAND_AGE[e.ageBand] for e in profile.enfants]
        if profile.enfants:
            hyp.append("Âge des enfants pris au milieu de leur tranche (≈).")
    elif len(ages) != len(profile.enfants):
        raise ValueError("agesEnfants doit avoir un âge par enfant.")
    enfants = []
    for i, age in enumerate(ages):
        eid = f"enfant{i + 1}"
        individus[eid] = {"date_naissance": {"ETERNITY": birth_date(age)}}
        enfants.append(eid)

    parents = [a.id for a in adults]
    if profile.situationFamiliale == "marie_pacse":
        for p in parents:
            individus[p]["statut_marital"] = {y: "marie" for y in YEARS}
        foyers = {"foyer": {"declarants": parents, "personnes_a_charge": enfants}}
    elif profile.situationFamiliale == "couple_non_marie":
        foyers = {
            "foyer": {"declarants": ["demandeur"], "personnes_a_charge": enfants},
            "foyer_conjoint": {"declarants": ["conjoint"]},
        }
        if enfants:
            hyp.append("Couple non marié : enfants rattachés au foyer fiscal du demandeur.")
    else:
        foyers = {"foyer": {"declarants": ["demandeur"], "personnes_a_charge": enfants}}
        if enfants:
            # Case T : parent qui vit seul avec ses enfants (demi-part supplémentaire).
            foyers["foyer"]["caseT"] = {y: True for y in YEARS}
            hyp.append("Personne seule avec enfants : parent isolé (case T), sans pension alimentaire.")

    for fid, foyer in foyers.items():
        if rfr is not None:
            foyer["rfr"] = {y: rfr.get(fid, 0.0) for y in RFR_INPUT_YEARS}

    zone = extra.zoneApl
    if zone is None:
        zone = ZONE_FROM_LIEU[profile.lieuDeVie]
        hyp.append(f"Zone des aides au logement déduite du lieu de vie : {zone} (≈).")
    menage: dict = {
        "personne_de_reference": ["demandeur"],
        "enfants": enfants,
        "statut_occupation_logement": {y: LOGEMENT[profile.logement] for y in YEARS},
        "zone_apl": {y: zone for y in YEARS},
    }
    if "conjoint" in parents:
        menage["conjoint"] = ["conjoint"]
    if profile.logement in ("locataire_prive", "locataire_hlm") and extra.loyerMensuel is not None:
        menage["loyer"] = {y: 12 * extra.loyerMensuel for y in YEARS}

    situation = {
        "individus": individus,
        "foyers_fiscaux": foyers,
        "familles": {"famille": {"parents": parents, "enfants": enfants}},
        "menages": {"menage": menage},
    }
    return Built(situation, adults, hyp)
