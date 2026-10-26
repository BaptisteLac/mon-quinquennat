"""Export des profils en déclarations 2042 pour le calcul officiel de la DGFiP (Mlang)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from export_irj import declarations, irj  # noqa: E402

from mq_calc.profile import Profile

BASE = dict(genre="autre", logement="proprio_sans_credit", lieuDeVie="ville_moyenne", mobilite="transports")


def test_parent_isole_coche_la_case_t_et_declare_ses_enfants():
    p = Profile(**BASE, age=36, situationFamiliale="seul", enfants=[{"anneeNaissance": 2022}, {"anneeNaissance": 2014}],
                situationPro="salarie_prive", revenusNetsMensuels=1700)
    [d] = declarations(p)
    assert d["cases"]["0AC"] == 1 and d["cases"]["0BT"] == 1 and d["cases"]["0CF"] == 2
    assert d["cases"]["0DA"] == 1990
    assert d["cases"]["1AJ"] > 12 * 1700  # salaire imposable : net + CSG non déductible


def test_couple_marie_deux_declarants():
    p = Profile(**BASE, age=40, situationFamiliale="marie_pacse", enfants=[], situationPro="salarie_prive",
                revenusNetsMensuels=2400, revenusConjointNetsMensuels=1900, situationProConjoint="salarie_prive")
    [d] = declarations(p)
    assert d["cases"]["0AM"] == 1 and "0AC" not in d["cases"]
    assert d["cases"]["1AJ"] > d["cases"]["1BJ"] > 0


def test_format_irj_attend_minus_un_pour_lire_les_montants_calcules():
    text = irj("CAS", {"0AC": 1, "1AJ": 20000})
    assert text.splitlines()[:5] == ["#NOM", "CAS", "#ENTREES-PRIMITIF", "0AC/1", "1AJ/20000"]
    assert "NAPTIR/-1" in text and text.endswith("##\n")


def test_annee_anterieure_reprend_les_memes_revenus():
    p = Profile(**BASE, age=30, situationFamiliale="seul", enfants=[], situationPro="salarie_prive", revenusNetsMensuels=2000)
    [d2023] = declarations(p, "2023")
    [d2025] = declarations(p, "2025")
    assert d2023["cases"]["0DA"] == d2025["cases"]["0DA"]
    # Même brut ; le salaire imposable ne varie qu'avec les taux de cotisation de l'année.
    assert abs(d2023["cases"]["1AJ"] - d2025["cases"]["1AJ"]) < 0.03 * d2025["cases"]["1AJ"]
