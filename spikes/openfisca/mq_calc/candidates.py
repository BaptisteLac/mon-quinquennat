"""Réformes des candidats, tirées des mesures publiées (data/measures/*.json).

Seules les mesures auto-validées comptent ; chaque effet « barème » apporte ses leviers.
"""
import json
from pathlib import Path

from pydantic import BaseModel, ConfigDict

from .compute import Candidate, baseline
from .levers import LEVERS, changes_for
from .reforms import make_reform


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


def specs_from_measures(paths: list[Path]) -> list[CandidateSpec]:
    by_candidate: dict[str, list[LeverUse]] = {}
    for path in paths:
        data = json.loads(path.read_text())
        for m in data["measures"]:
            if m["review"]["status"] != "auto_validee":
                continue
            for e in m["effects"]:
                c = e["computation"]
                if c["kind"] != "bareme":
                    continue
                for r in c["reform"]:
                    if r["parameter"] not in LEVERS:
                        raise ValueError(f"Levier inconnu du calcul : {r['parameter']} (mesure {m['id']})")
                    use = LeverUse(lever=r["parameter"], value=r["value"], measureId=m["id"])
                    by_candidate.setdefault(m["candidateId"], []).append(use)
    return [CandidateSpec(id=k, levers=v) for k, v in sorted(by_candidate.items())]


def load(specs: list[CandidateSpec]) -> list[Candidate]:
    out = []
    for s in specs:
        changes = [ch for u in s.levers for ch in changes_for(u.lever, u.value)]
        outputs = frozenset().union(*(LEVERS[u.lever].outputs for u in s.levers)) if s.levers else frozenset()
        out.append(Candidate(s.id, make_reform(baseline(), changes, s.id), outputs))
    return out
