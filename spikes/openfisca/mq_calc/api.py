"""Service HTTP sans état : un profil → les montants pour la législation actuelle et chaque candidat.

Tous les candidats sont calculés à chaque appel, pour que le serveur ne sache jamais lesquels
l'utilisateur a choisis. Le profil n'est ni journalisé ni conservé.

    uv run gunicorn --preload -w 1 -b 0.0.0.0:8000 mq_calc.api:app
"""
import json
import os
from pathlib import Path

from flask import Flask, jsonify, request
from pydantic import BaseModel, ConfigDict, ValidationError

from .candidates import CandidateSpec, load
from .compute import Candidate, compute_all
from .profile import Profile

CANDIDATES_FILE = Path(os.environ.get("MQ_CANDIDATES", Path(__file__).resolve().parents[1] / "candidates.json"))


class CalculRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    profile: Profile


def load_candidates(path: Path) -> list[Candidate]:
    return load([CandidateSpec(**c) for c in json.loads(path.read_text())["candidates"]])


def create_app(candidates: list[Candidate]) -> Flask:
    app = Flask(__name__)

    @app.post("/calcul")
    def calcul():
        try:
            req = CalculRequest.model_validate(request.get_json(force=True))
        except ValidationError as e:
            return jsonify({"erreur": "profil invalide", "details": e.errors(include_input=False)}), 400
        try:
            results = compute_all(req.profile, candidates)
        except ValueError as e:
            return jsonify({"erreur": str(e)}), 422
        return jsonify(
            {
                k: {"montants": r.amounts, "nonCalcules": r.missing, "hypotheses": list(r.hypotheses)}
                for k, r in results.items()
            }
        )

    @app.get("/sante")
    def sante():
        return jsonify({"candidats": [c.id for c in candidates]})

    return app


def warm_up(candidates: list[Candidate]) -> None:
    """Charge et préchauffe chaque système fiscal au démarrage (sinon ~2 s de plus au premier appel)."""
    p = Profile(age=40, genre="autre", situationFamiliale="seul", enfants=[], situationPro="salarie_prive",
                revenusNetsMensuels=1800, logement="locataire_prive", loyerMensuel=500, lieuDeVie="ville_moyenne",
                codeCommune="36044", mobilite="transports")
    compute_all(p, candidates)


_candidates = load_candidates(CANDIDATES_FILE)
warm_up(_candidates)
app = create_app(_candidates)
