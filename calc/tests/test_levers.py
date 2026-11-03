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


def _lever(lever: str, value: float | None) -> LeverUse:
    return LeverUse(lever=lever, value=value, measureId="m-x")


REVENU_FAMILIAL = [_lever("revenu_familial_par_enfant_mensuel", 240), _lever("revenu_familial_troisieme_enfant_mensuel", 480)]
RIA = [
    _lever("revenu_incitation_activite_base_mensuel", 300),
    _lever("revenu_incitation_activite_complement_mensuel", 250),
    _lever("revenu_incitation_activite_taux_degressivite", 30),
]


def _avant_apres(levers: list[LeverUse], **profile):
    (cand,) = load([CandidateSpec(id="c", levers=levers)])
    p = Profile(**profile)
    inputs = solve_inputs(p)
    return compute(p, None, inputs).amounts, compute(p, cand.tbs, inputs, cand.outputs).amounts, cand


def test_revenu_familial_240_par_enfant_et_double_au_troisieme():
    trois = {**FAMILLE, "revenusNetsMensuels": 2400, "revenusConjointNetsMensuels": 1900,
             "enfants": [{"anneeNaissance": 2020}, {"anneeNaissance": 2017}, {"anneeNaissance": 2014}]}
    avant, apres, cand = _avant_apres(REVENU_FAMILIAL, **trois)
    assert apres["allocations_familiales"] == pytest.approx(240 + 240 + 480)  # « soit 960 euros par mois »
    assert apres["impot_revenu"] > avant["impot_revenu"]  # le quotient familial pour enfant disparaît
    assert any("cinq ans d'activité" in h for h in cand.hypotheses)
    # Un enfant majeur n'ouvre pas droit au Revenu familial (« de la naissance à dix-huit ans »).
    _, majeur, _ = _avant_apres(REVENU_FAMILIAL, **{**trois, "enfants": [{"anneeNaissance": 2005}]})
    assert majeur["allocations_familiales"] == 0


def test_ria_remplace_rsa_et_prime_d_activite():
    chomeur = dict(age=35, genre="femme", situationFamiliale="seul", enfants=[], situationPro="demandeur_emploi",
                   revenusNetsMensuels=0, logement="locataire_prive", loyerMensuel=500, lieuDeVie="ville_moyenne",
                   mobilite="voiture_thermique")
    avant, apres, _ = _avant_apres(RIA, **chomeur)
    assert avant["rsa"] > 0 and apres["rsa"] == 0
    assert apres["prime_activite"] == pytest.approx(300 + 250)
    smic = {**chomeur, "situationPro": "salarie_prive", "revenusNetsMensuels": 1400}
    _, apres, _ = _avant_apres(RIA, **smic)
    assert apres["prime_activite"] == pytest.approx(300 + 250 - 0.30 * 1400, abs=0.5)
    # « L'allocation s'annule au-delà de 1 833 euros de revenus d'activité mensuels. »
    _, apres, _ = _avant_apres(RIA, **{**smic, "revenusNetsMensuels": 1900})
    assert apres["prime_activite"] == 0
    # Les retraités n'y ont pas droit.
    _, apres, _ = _avant_apres(RIA, **{**chomeur, "age": 70, "situationPro": "retraite", "pensionMensuelle": 900})
    assert apres["prime_activite"] == 0


def test_csg_des_actifs_a_6_6_hausse_le_salaire_net():
    (deductible, total) = sorted(changes_for("csg_activite_taux_global", 6.6), key=lambda c: c.value)
    assert total.value == pytest.approx(0.066) and deductible.value == pytest.approx(0.042)
    avant, apres, _ = _avant_apres([_lever("csg_activite_taux_global", 6.6)], **FAMILLE)
    assert apres["salaire_net"] > avant["salaire_net"]
