"""Service HTTP sans état : un profil → les montants pour la législation actuelle et chaque candidat.

Tous les candidats sont calculés à chaque appel, pour que le serveur ne sache jamais lesquels
l'utilisateur a choisis. Le profil n'est ni journalisé ni conservé (gunicorn sans journal d'accès,
aucun message d'erreur ne reprend ses valeurs).

    MQ_MEASURES_DIR=../data/measures uv run gunicorn --preload -w 1 -b 0.0.0.0:8000 mq_calc.api:app
"""
import os
from pathlib import Path

from flask import Flask, jsonify, request
from pydantic import BaseModel, ConfigDict, ValidationError

from .candidates import CandidateSpec, load, measure_files, specs_from_measures
from .compute import Result, compute_all
from .profile import Profile

MEASURES_DIR = Path(os.environ.get("MQ_MEASURES_DIR", Path(__file__).resolve().parents[2] / "data" / "measures"))


class CalculRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    profile: Profile


def _result(r: Result) -> dict:
    return {"montants": r.amounts, "nonCalcules": r.missing, "hypotheses": list(r.hypotheses)}


def create_app(specs: list[CandidateSpec]) -> Flask:
    candidates = load(specs)
    corpus = {s.id: s.corpusId for s in specs}
    by_output = {s.id: s.measures_by_output() for s in specs}
    app = Flask(__name__)

    @app.post("/calcul")
    def calcul():
        try:
            req = CalculRequest.model_validate(request.get_json(force=True))
        except ValidationError as e:
            return jsonify({"erreur": "profil invalide", "details": e.errors(include_input=False, include_url=False)}), 400
        try:
            results = compute_all(req.profile, candidates)
        except ValueError as e:
            return jsonify({"erreur": str(e)}), 422
        return jsonify(
            {
                "corpus": corpus,
                "actuel": _result(results["actuel"]),
                "candidats": {c.id: {**_result(results[c.id]), "mesures": by_output[c.id]} for c in candidates},
            }
        )

    @app.get("/sante")
    def sante():
        return jsonify({"corpus": corpus})

    return app


def warm_up(specs: list[CandidateSpec]) -> None:
    """Charge et préchauffe chaque système fiscal au démarrage (sinon ~2 s de plus au premier appel)."""
    p = Profile(age=40, genre="autre", situationFamiliale="seul", enfants=[], situationPro="salarie_prive",
                revenusNetsMensuels=1800, logement="locataire_prive", loyerMensuel=500, lieuDeVie="ville_moyenne",
                codeCommune="36044", mobilite="transports")
    compute_all(p, load(specs))


def create_from_measures(directory: Path = MEASURES_DIR) -> Flask:
    specs = specs_from_measures(measure_files(directory))
    warm_up(specs)
    return create_app(specs)


# Point d'entrée de gunicorn (`mq_calc.api:app`) ; les tests construisent leur propre application.
app = create_from_measures() if os.environ.get("MQ_NO_APP") != "1" else None
