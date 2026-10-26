import json
from pathlib import Path

import pytest

from mq_calc.candidates import CandidateSpec, LeverUse, load, specs_from_measures
from mq_calc.compute import compute, solve_inputs
from mq_calc.levers import LEVERS, changes_for
from mq_calc.profile import Profile

SCHEMA_LEVERS = Path(__file__).resolve().parents[2] / "packages/schema/json/reform-levers.json"


def test_chaque_levier_du_schema_est_connu_du_calcul():
    assert set(json.loads(SCHEMA_LEVERS.read_text())) == set(LEVERS)


def test_conversions_d_unite():
    plafond, maximum = changes_for("minimum_vieillesse_personne_seule_mensuel", 1000)
    assert plafond.value == maximum.value == 12000  # €/mois → €/an
    (ir,) = changes_for("impot_revenu_taux_tranche_2", 9)
    assert ir.value == pytest.approx(0.09)  # % → fraction


def test_un_levier_refuse_une_valeur_inattendue_ou_manquante():
    with pytest.raises(ValueError):
        changes_for("quotient_familial_sans_plafond", 1)
    with pytest.raises(ValueError):
        changes_for("minimum_vieillesse_personne_seule_mensuel", None)


FAMILLE = dict(
    age=45, genre="autre", situationFamiliale="marie_pacse", enfants=[{"anneeNaissance": 2012}, {"anneeNaissance": 2015}],
    situationPro="salarie_prive", revenusNetsMensuels=7000, revenusConjointNetsMensuels=6000, situationProConjoint="salarie_prive",
    logement="proprio_sans_credit", lieuDeVie="grande_ville", codeCommune="69123", mobilite="transports",
)


def test_sans_plafond_du_quotient_familial_l_impot_d_une_famille_aisee_baisse():
    (cand,) = load([CandidateSpec(id="c", levers=[LeverUse(lever="quotient_familial_sans_plafond", value=None, measureId="m-x")])])
    p = Profile(**FAMILLE)
    inputs = solve_inputs(p)
    before = compute(p, None, inputs).amounts["impot_revenu"]
    after = compute(p, cand.tbs, inputs, cand.outputs).amounts["impot_revenu"]
    assert after == after  # pas NaN (erreur corrigée : plafond infini → 0 × inf)
    assert after < before
    # Sans enfant, le plafond par demi-part d'enfant ne joue pas.
    q = Profile(**{**FAMILLE, "enfants": []})
    qi = solve_inputs(q)
    assert compute(q, cand.tbs, qi, cand.outputs).amounts["impot_revenu"] == compute(q, None, qi).amounts["impot_revenu"]


def test_seules_les_mesures_publiees_donnent_des_leviers(tmp_path):
    bareme = {"kind": "bareme", "engine": "openfisca", "reform": [{"parameter": "impot_revenu_taux_tranche_2", "value": 9, "from": "2028-01-01"}]}
    measure = lambda mid, status: {  # noqa: E731
        "id": mid, "candidateId": "c-test", "review": {"status": status}, "effects": [{"computation": bareme}],
    }
    f = tmp_path / "corpus.json"
    f.write_text(json.dumps({"corpusId": "corpus", "candidateId": "c-test", "measures": [measure("m-ok", "auto_validee"), measure("m-attente", "en_attente")]}))
    (spec,) = specs_from_measures([f])
    assert [u.measureId for u in spec.levers] == ["m-ok"]


def test_minimum_vieillesse_fixe_par_un_candidat_change_l_aspa_versee():
    # Erreur corrigée : changer le seul montant maximum n'avait aucun effet (ASPA différentielle).
    retraitee = Profile(age=72, genre="femme", situationFamiliale="seul", enfants=[], situationPro="retraite", revenusNetsMensuels=0,
                        pensionMensuelle=400, logement="proprio_sans_credit", lieuDeVie="rural", mobilite="voiture_thermique")
    (cand,) = load([CandidateSpec(id="c", levers=[LeverUse(lever="minimum_vieillesse_personne_seule_mensuel", value=1000, measureId="m-x")])])
    inputs = solve_inputs(retraitee)
    actuel = compute(retraitee, inputs=inputs).amounts["minimum_vieillesse"]
    reforme = compute(retraitee, cand.tbs, inputs, cand.outputs).amounts["minimum_vieillesse"]
    assert reforme == pytest.approx(1000 - 400, abs=1)
    assert reforme < actuel  # 1 000 €/mois est sous le montant en vigueur : la baisse est affichée
