from mq_calc.api import create_app
from mq_calc.candidates import CandidateSpec, LeverUse, load

PROFILE = {
    "age": 35, "genre": "autre", "situationFamiliale": "seul", "enfants": [], "situationPro": "salarie_prive",
    "revenusNetsMensuels": 2600, "logement": "proprio_sans_credit", "lieuDeVie": "rural", "mobilite": "velo_pied",
}


def client():
    spec = CandidateSpec(id="test", levers=[LeverUse(lever="impot_revenu_taux_tranche_2", value=10, measureId="m-test")])
    return create_app(load([spec])).test_client()


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
