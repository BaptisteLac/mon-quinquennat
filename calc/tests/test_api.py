import json

from mq_calc.api import create_app, create_from_measures
from mq_calc.candidates import CandidateSpec, LeverUse

PROFILE = {
    "age": 35, "genre": "autre", "situationFamiliale": "seul", "enfants": [], "situationPro": "salarie_prive",
    "revenusNetsMensuels": 2600, "logement": "proprio_sans_credit", "lieuDeVie": "rural", "mobilite": "velo_pied",
}


def client():
    spec = CandidateSpec(
        id="test", corpusId="corpus-test", levers=[LeverUse(lever="impot_revenu_taux_tranche_2", value=10, measureId="m-test")]
    )
    sans_bareme = CandidateSpec(id="sans", corpusId="corpus-sans", levers=[])
    return create_app([spec, sans_bareme]).test_client()


def test_calcule_actuel_et_chaque_candidat():
    r = client().post("/calcul", json={"profile": PROFILE})
    assert r.status_code == 200
    body = r.get_json()
    assert set(body) == {"corpus", "actuel", "candidats"}
    assert body["corpus"] == {"test": "corpus-test", "sans": "corpus-sans"}
    test = body["candidats"]["test"]
    assert test["montants"]["impot_revenu"] < body["actuel"]["montants"]["impot_revenu"]
    assert test["mesures"] == {"impot_revenu": ["m-test"]}
    # Montant non touché par la réforme : repris de la législation actuelle.
    assert test["montants"]["prime_activite"] == body["actuel"]["montants"]["prime_activite"]
    # Candidat sans mesure chiffrée : présent quand même (le serveur calcule tout le monde).
    assert body["candidats"]["sans"]["montants"] == body["actuel"]["montants"]
    assert body["candidats"]["sans"]["mesures"] == {}


def test_refuse_un_profil_invalide_sans_renvoyer_ses_valeurs():
    r = client().post("/calcul", json={"profile": {**PROFILE, "age": 12}})
    assert r.status_code == 400
    assert "12" not in r.get_data(as_text=True)


def test_charge_les_mesures_publiees(tmp_path):
    measures = {
        "corpusId": "corpus-a",
        "candidateId": "c-x",
        "measures": [
            {"id": "m-1", "candidateId": "c-x", "review": {"status": "auto_validee"}, "effects": [
                {"computation": {"kind": "bareme", "reform": [{"parameter": "quotient_familial_sans_plafond", "value": None}]}}
            ]},
            {"id": "m-2", "candidateId": "c-x", "review": {"status": "en_attente"}, "effects": [
                {"computation": {"kind": "bareme", "reform": [{"parameter": "impot_revenu_taux_tranche_2", "value": 10}]}}
            ]},
        ],
    }
    (tmp_path / "corpus-a.json").write_text(json.dumps(measures))
    (tmp_path / "corpus-a.a-relire.json").write_text("[]")
    r = create_from_measures(tmp_path).test_client().get("/sante")
    assert r.get_json() == {"corpus": {"c-x": "corpus-a"}}
