"""Cohérence interne du calcul. La justesse par rapport aux simulateurs officiels est vérifiée
séparément, sur les profils de référence (profiles/reference.json)."""
import pytest

from mq_calc.compute import MONTH, TAX_YEAR, _simulate, baseline, compute, solve_inputs
from mq_calc.profile import Profile
from mq_calc.reforms import ParamChange, make_reform
from mq_calc.situation import build

BASE = dict(genre="autre", enfants=[], logement="proprio_sans_credit", lieuDeVie="ville_moyenne", mobilite="transports")


def profile(**kw) -> Profile:
    return Profile(**{**BASE, "age": 40, "situationFamiliale": "seul", **kw})


@pytest.mark.parametrize(
    "p, net_var",
    [
        (profile(situationPro="salarie_prive", revenusNetsMensuels=1900), "salaire_net"),
        (profile(situationPro="fonctionnaire", revenusNetsMensuels=2300), "salaire_net"),
        (profile(situationPro="demandeur_emploi", revenusNetsMensuels=1200, indemnise=True), "chomage_net"),
        (profile(age=68, situationPro="retraite", revenusNetsMensuels=0, pensionMensuelle=1400), "retraite_nette"),
    ],
)
def test_le_brut_trouve_redonne_le_net_declare(p, net_var):
    inputs = solve_inputs(p)
    sim = _simulate(baseline(), build(p, inputs.bruts, inputs.rfr).situation)
    target = p.pensionMensuelle if p.situationPro == "retraite" else p.revenusNetsMensuels
    assert float(sim.calculate(net_var, MONTH)[0]) == pytest.approx(target, abs=0.01)


def test_la_csg_d_une_retraite_n_est_pas_nulle():
    # Erreur corrigée : le RFR de N-2 calculé par OpenFisca valait 0 (boucle), donc CSG nulle.
    p = profile(age=70, situationPro="retraite", revenusNetsMensuels=0, pensionMensuelle=2500)
    inputs = solve_inputs(p)
    assert inputs.bruts["demandeur"] > 2500 * 1.05
    assert inputs.rfr["foyer"] > 0


def test_un_couple_marie_forme_un_seul_foyer_fiscal():
    p = profile(situationFamiliale="marie_pacse", situationPro="salarie_prive", revenusNetsMensuels=2000, revenusConjointNetsMensuels=1500)
    built = build(p, {"demandeur": 2500, "conjoint": 1900})
    assert list(built.situation["foyers_fiscaux"]) == ["foyer"]
    assert built.situation["foyers_fiscaux"]["foyer"]["declarants"] == ["demandeur", "conjoint"]


def test_sans_loyer_les_aides_au_logement_ne_sont_pas_calculees():
    p = profile(situationPro="salarie_prive", revenusNetsMensuels=1500, logement="locataire_prive")
    r = compute(p)
    assert r.amounts["aides_logement"] is None
    assert "Loyer" in r.missing["aides_logement"]


def test_la_commune_donne_la_zone_et_un_arrondissement_est_ramene_a_sa_commune():
    p = profile(situationPro="salarie_prive", revenusNetsMensuels=1500, logement="locataire_prive", loyerMensuel=700, codeCommune="75111")
    built = build(p, {"demandeur": 1900})
    assert built.situation["menages"]["menage"]["depcom"]["2026"] == "75056"
    assert not any("Zone" in h for h in built.hypotheses)


def test_une_commune_absente_du_zonage_est_signalee():
    p = profile(situationPro="salarie_prive", revenusNetsMensuels=1500, codeCommune="99999")
    built = build(p, {"demandeur": 1900})
    assert any("absente du zonage" in h for h in built.hypotheses)


def test_les_hypotheses_sont_signalees():
    p = profile(situationPro="salarie_prive", revenusNetsMensuels=1500, enfants=[{"anneeNaissance": 2012}])
    r = compute(p)
    assert any("1er juillet" in h for h in r.hypotheses)
    assert any("Zone" in h for h in r.hypotheses)


class TestReforme:
    p = profile(situationPro="salarie_prive", revenusNetsMensuels=2800)

    def test_une_reforme_neutre_ne_change_rien(self):
        inputs = solve_inputs(self.p)
        rate = baseline().parameters.impot_revenu.bareme_ir_depuis_1945.bareme.brackets[1].rate("2025-01-01")
        neutral = make_reform(baseline(), [ParamChange("impot_revenu.bareme_ir_depuis_1945.bareme", rate, "2025-01-01", 1, "rate")], "neutre")
        assert compute(self.p, neutral, inputs).amounts == compute(self.p, None, inputs).amounts

    def test_baisser_le_taux_de_la_2e_tranche_baisse_l_impot_du_montant_attendu(self):
        inputs = solve_inputs(self.p)
        bareme = baseline().parameters.impot_revenu.bareme_ir_depuis_1945.bareme
        rate = bareme.brackets[1].rate("2025-01-01")
        lo, hi = bareme.brackets[1].threshold("2025-01-01"), bareme.brackets[2].threshold("2025-01-01")
        reform = make_reform(baseline(), [ParamChange("impot_revenu.bareme_ir_depuis_1945.bareme", rate - 0.02, "2025-01-01", 1, "rate")], "moins2")
        before = compute(self.p, None, inputs).amounts["impot_revenu"]
        after = compute(self.p, reform, inputs).amounts["impot_revenu"]
        sim = _simulate(baseline(), build(self.p, inputs.bruts, inputs.rfr).situation)
        rni = float(sim.calculate("rni", TAX_YEAR)[0])
        assert rni > hi  # toute la 2e tranche est remplie, hors décote
        # Écart attendu, tiré des seuils d'OpenFisca : 2 points sur toute la tranche, ramené au mois.
        # L'impôt est arrondi à l'euro par an : tolérance d'un euro par an.
        assert before - after == pytest.approx(0.02 * (hi - lo) / 12, abs=1 / 12)

    def test_un_parametre_hors_liste_blanche_est_refuse(self):
        with pytest.raises(ValueError, match="liste blanche"):
            make_reform(baseline(), [ParamChange("prelevements_sociaux.contributions_sociales.csg.activite.deductible.taux", 0.0, "2025-01-01")], "x")


def test_un_independant_sans_chiffre_d_affaires_est_refuse():
    with pytest.raises(ValueError, match="chiffre d'affaires"):
        build(profile(situationPro="independant", revenusNetsMensuels=2000), {})


def test_la_situation_du_conjoint_est_prise_en_compte():
    p = profile(situationFamiliale="marie_pacse", situationPro="salarie_prive", revenusNetsMensuels=2000,
                revenusConjointNetsMensuels=1500, situationProConjoint="fonctionnaire")
    built = build(p, {"demandeur": 2500, "conjoint": 1900})
    assert "traitement_indiciaire_brut" in built.situation["individus"]["conjoint"]
    assert not any("Situation du conjoint" in h for h in built.hypotheses)


def test_les_allocations_familiales_sont_nettes_de_crds():
    # Erreur corrigée : OpenFisca donne `af` brut ; service-public.fr affiche le montant versé, net de CRDS.
    p = profile(situationPro="salarie_prive", revenusNetsMensuels=2000, enfants=[{"anneeNaissance": 2018}, {"anneeNaissance": 2020}])
    inputs = solve_inputs(p)
    sim = _simulate(baseline(), build(p, inputs.bruts, inputs.rfr).situation)
    brut = float(sim.calculate("af", MONTH)[0])
    net = compute(p, None, inputs).amounts["allocations_familiales"]
    assert 0 < net < brut
