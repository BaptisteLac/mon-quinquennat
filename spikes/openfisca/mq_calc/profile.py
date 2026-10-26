"""Profil de l'utilisateur, miroir Python du schéma Zod `Profile` (packages/schema/src/measure.ts).

Le test `tests/test_profile_schema.py` vérifie que les deux définitions restent alignées.
"""
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

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
    anneeNaissance: int = Field(ge=1995, le=2032)


class Entreprise(_Strict):
    statut: Literal["micro", "independant", "societe"]
    salaries: Literal["0", "1_9", "10_49", "50_plus"]
    chiffreAffairesAnnuel: float | None = Field(default=None, ge=0)
    activite: Literal["vente", "services", "liberale"] | None = None


class Profile(_Strict):
    age: int = Field(ge=18, le=110)
    genre: Literal["femme", "homme", "autre"]
    situationFamiliale: Literal["seul", "marie_pacse", "couple_non_marie"]
    enfants: list[Enfant]
    situationPro: SituationPro
    tempsPartiel: bool | None = None
    revenusNetsMensuels: float = Field(ge=0)
    revenusConjointNetsMensuels: float | None = Field(default=None, ge=0)
    situationProConjoint: SituationPro | None = None
    logement: Literal["locataire_prive", "locataire_hlm", "proprio_credit", "proprio_sans_credit", "heberge"]
    loyerMensuel: float | None = Field(default=None, ge=0)
    lieuDeVie: Literal["grande_ville", "ville_moyenne", "peripherie", "rural", "outre_mer"]
    codeCommune: str | None = Field(default=None, pattern=r"^(\d{5}|2[AB]\d{3})$")
    mobilite: Literal["voiture_thermique", "voiture_electrique", "transports", "velo_pied"]
    ageDepartPrevu: int | None = None
    agePremierEmploi: int | None = None
    pensionMensuelle: float | None = Field(default=None, ge=0)
    entreprise: Entreprise | None = None
    indemnise: bool | None = None
    boursier: bool | None = None
    handicapOuAidant: Literal["non", "moi", "proche"] | None = None
    patrimoine: Literal["moins_100k", "100k_1m", "plus_1m", "ne_sait_pas"] | None = None
