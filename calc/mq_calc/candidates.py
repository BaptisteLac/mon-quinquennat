"""Réformes des candidats, tirées des mesures publiées (data/measures/*.json) au démarrage du service.

Seules les mesures publiées comptent (auto-validées ou validées par un humain) ; chaque effet « barème »
apporte ses leviers. Le service et le site lisent les mêmes fichiers, du même commit.
"""
import json
from pathlib import Path

from pydantic import BaseModel, ConfigDict

from .compute import Candidate, baseline
from .levers import LEVERS, changes_for
from .reforms import make_reform

PUBLISHED = ("auto_validee", "validee_humain")


class LeverUse(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    lever: str
    value: float | None
    measureId: str
    """Mesure publiée d'où vient le levier (traçabilité vers sa citation)."""


class CandidateSpec(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    id: str
    levers: list[LeverUse]
    corpusId: str | None = None
    """Version du programme (corpus) d'où viennent les mesures."""

    def measures_by_output(self) -> dict[str, list[str]]:
        """Pour chaque montant que les réformes touchent, les mesures qui le modifient."""
        out: dict[str, list[str]] = {}
        for u in self.levers:
            for o in sorted(LEVERS[u.lever].outputs):
                if u.measureId not in out.setdefault(o, []):
                    out[o].append(u.measureId)
        return out


def measure_files(directory: Path) -> list[Path]:
    return sorted(p for p in directory.glob("*.json") if not p.name.endswith(".a-relire.json"))


def specs_from_measures(paths: list[Path]) -> list[CandidateSpec]:
    """Un candidat par fichier de mesures publiées ; pour un même candidat, le dernier corpus (par nom) l'emporte."""
    by_candidate: dict[str, CandidateSpec] = {}
    for path in sorted(paths):
        data = json.loads(path.read_text())
        published = [m for m in data["measures"] if m["review"]["status"] in PUBLISHED]
        if not published:
            continue
        levers: list[LeverUse] = []
        for m in published:
            for e in m["effects"]:
                c = e["computation"]
                if c["kind"] != "bareme":
                    continue
                for r in c["reform"]:
                    if r["parameter"] not in LEVERS:
                        raise ValueError(f"Levier inconnu du calcul : {r['parameter']} (mesure {m['id']})")
                    levers.append(LeverUse(lever=r["parameter"], value=r["value"], measureId=m["id"]))
        by_candidate[data["candidateId"]] = CandidateSpec(id=data["candidateId"], levers=levers, corpusId=data["corpusId"])
    return [by_candidate[k] for k in sorted(by_candidate)]


def load(specs: list[CandidateSpec]) -> list[Candidate]:
    out = []
    for s in specs:
        changes = [ch for u in s.levers for ch in changes_for(u.lever, u.value)]
        outputs = frozenset().union(*(LEVERS[u.lever].outputs for u in s.levers)) if s.levers else frozenset()
        out.append(Candidate(s.id, make_reform(baseline(), changes, s.id), outputs))
    return out
