from mq_calc.api import create_app
from mq_calc.compute import Candidate, baseline
from mq_calc.reforms import ParamChange, affected_outputs, make_reform

IR = "impot_revenu.bareme_ir_depuis_1945.bareme"
PROFILE = {
    "age": 35, "genre": "autre", "situationFamiliale": "seul", "enfants": [], "situationPro": "salarie_prive",
    "revenusNetsMensuels": 2600, "logement": "proprio_sans_credit", "lieuDeVie": "rural", "mobilite": "velo_pied",
}


def client():
    changes = [ParamChange(IR, 0.10, "2025-01-01", 1, "rate")]
    cand = Candidate("test", make_reform(baseline(), changes, "test"), affected_outputs(changes))
    return create_app([cand]).test_client()


def test_calcule_actuel_et_chaque_candidat():
    r = client().post("/calcul", json={"profile": PROFILE})
    assert r.status_code == 200
    body = r.get_json()
    assert set(body) == {"actuel", "test"}
    assert body["test"]["montants"]["impot_revenu"] < body["actuel"]["montants"]["impot_revenu"]
    # Montant non touché par la réforme : repris de la législation actuelle.
    assert body["test"]["montants"]["prime_activite"] == body["actuel"]["montants"]["prime_activite"]


def test_refuse_un_profil_invalide_sans_renvoyer_ses_valeurs():
    r = client().post("/calcul", json={"profile": {**PROFILE, "age": 12}})
    assert r.status_code == 400
    assert "12" not in r.get_data(as_text=True)
