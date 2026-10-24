"""Profil de l'utilisateur, miroir Python du schéma Zod `Profile` (packages/schema/src/measure.ts).

Le test `tests/test_profile_schema.py` vérifie que les deux définitions restent alignées.
`ComplementCalcul` regroupe ce que le profil actuel ne demande pas mais dont le calcul a besoin :
ce sont les questions à ajouter si le test les juge nécessaires.
"""
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ChildAgeBand = Literal["0_2", "3_10", "11_17", "18_25"]
SituationPro = Literal[
    "salarie_prive",
    "fonctionnaire",
    "independant",
    "chef_entreprise",
    "demandeur_emploi",
    "etudiant",
    "retraite",
    "sans_activite",
]


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class Enfant(_Strict):
    ageBand: ChildAgeBand


class Entreprise(_Strict):
    statut: Literal["micro", "independant", "societe"]
    salaries: Literal["0", "1_9", "10_49", "50_plus"]


class Profile(_Strict):
    age: int = Field(ge=18, le=110)
    genre: Literal["femme", "homme", "autre"]
    situationFamiliale: Literal["seul", "marie_pacse", "couple_non_marie"]
    enfants: list[Enfant]
    situationPro: SituationPro
    tempsPartiel: bool | None = None
    revenusNetsMensuels: float = Field(ge=0)
    revenusConjointNetsMensuels: float | None = Field(default=None, ge=0)
    logement: Literal["locataire_prive", "locataire_hlm", "proprio_credit", "proprio_sans_credit", "heberge"]
    lieuDeVie: Literal["grande_ville", "ville_moyenne", "peripherie", "rural", "outre_mer"]
    mobilite: Literal["voiture_thermique", "voiture_electrique", "transports", "velo_pied"]
    ageDepartPrevu: int | None = None
    agePremierEmploi: int | None = None
    pensionMensuelle: float | None = Field(default=None, ge=0)
    entreprise: Entreprise | None = None
    indemnise: bool | None = None
    boursier: bool | None = None
    handicapOuAidant: Literal["non", "moi", "proche"] | None = None
    patrimoine: Literal["moins_100k", "100k_1m", "plus_1m", "ne_sait_pas"] | None = None


class ComplementCalcul(_Strict):
    """Informations absentes du profil, nécessaires à certains montants."""

    loyerMensuel: float | None = Field(default=None, ge=0)
    """Loyer hors charges : indispensable aux aides au logement."""
    zoneApl: Literal["zone_1", "zone_2", "zone_3"] | None = None
    """Zone de la commune pour les aides au logement ; à défaut, déduite (≈) du lieu de vie."""
    agesEnfants: list[int] | None = None
    """Âges exacts des enfants ; à défaut, milieu de tranche (≈)."""
    chiffreAffairesAnnuel: float | None = Field(default=None, ge=0)
    """Indépendant en micro-entreprise : chiffre d'affaires annuel."""
    activiteMicro: Literal["bic_vente", "bic_services", "bnc"] | None = None
