"""Exporte les profils de référence en déclarations 2042 (revenus 2025) au format IRJ de Mlang.

    uv run python scripts/export_irj.py      # écrit spikes/impot-dgfip/cas/

Le calcul officiel de l'impôt (sources M publiées par la DGFiP, interprétées par Mlang) tourne
dans GitHub Actions (`.github/workflows/impot-dgfip.yml`). Les revenus déclarés sont ceux
qu'OpenFisca déduit du profil (salaire imposable, etc.) : on compare le calcul de l'impôt,
à déclaration identique. Les cases viennent des métadonnées `cerfa_field` d'OpenFisca.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from mq_calc.compute import TAX_YEAR, _simulate, baseline, compute  # noqa: E402
from mq_calc.profile import Profile  # noqa: E402
from mq_calc.situation import build  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT.parents[0] / "impot-dgfip" / "cas"

# Revenus déclarés, par déclarant (index du `cerfa_field` d'OpenFisca).
INCOME_VARIABLES = ("salaire_imposable", "retraite_imposable", "mbnc_impo", "mbic_imps", "mbic_impv")
# Montants restitués par le calcul DGFiP. Valeur attendue -1 : le test échoue et Mlang
# affiche la valeur calculée (« KO | VAR attendue: -1 - evaluee: … »).
OUTPUTS = ("NAPTIR", "IINET", "IRN", "IDRS", "IAN", "RNG", "RNI", "REVKIRE", "NBPT", "TXMOYIMP")


def declarations(profile: Profile) -> list[dict]:
    """Une déclaration par foyer fiscal : cases 2042 et impôt calculé par OpenFisca."""
    result = compute(profile)
    built = build(profile, result.inputs.bruts, result.inputs.rfr)
    sim = _simulate(baseline(), built.situation)
    tbs = sim.tax_benefit_system
    individus = list(built.situation["individus"])
    births = {i: int(v["date_naissance"]["ETERNITY"][:4]) for i, v in built.situation["individus"].items()}
    ir = sim.calculate("impot_revenu_restant_a_payer", TAX_YEAR)
    out = []
    for f, (fid, foyer) in enumerate(built.situation["foyers_fiscaux"].items()):
        declarants = foyer["declarants"]
        cases: dict[str, int] = {}
        cases["0AM" if len(declarants) == 2 else "0AC"] = 1
        for code, ind in zip(("0DA", "0DB"), declarants):
            cases[code] = births[ind]
        charges = foyer.get("personnes_a_charge", [])
        majeurs = [c for c in charges if int(TAX_YEAR) - births[c] >= 18]
        if majeurs:
            raise ValueError(f"{fid} : enfant majeur à charge, case non gérée par l'export.")
        if charges:
            cases["0CF"] = len(charges)
        if foyer.get("caseT"):
            cases["0BT"] = 1
        for var in INCOME_VARIABLES:
            values = sim.calculate_add(var, TAX_YEAR)
            for k, ind in enumerate(declarants):
                amount = round(float(values[individus.index(ind)]))
                if amount:
                    cases[tbs.variables[var].cerfa_field[k]] = amount
        out.append({"foyer": fid, "cases": cases, "openfisca_impot_annuel": round(-float(ir[f]), 2) + 0.0})
    return out


def irj(name: str, cases: dict[str, int]) -> str:
    lines = ["#NOM", name, "#ENTREES-PRIMITIF"]
    lines += [f"{k}/{v}" for k, v in cases.items()]
    lines += ["#CONTROLES-PRIMITIF", "#RESULTATS-PRIMITIF"]
    lines += [f"{k}/-1" for k in OUTPUTS]
    lines += ["#ENTREES-CORRECTIF", "#CONTROLES-CORRECTIF", "#RESULTATS-CORRECTIF", "##"]
    return "\n".join(lines) + "\n"


def main() -> None:
    data = json.loads((ROOT / "profiles/reference.json").read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    summary = {}
    for case in data["profiles"]:
        for d in declarations(Profile(**case["profile"])):
            name = case["id"] if d["foyer"] == "foyer" else f"{case['id']}--{d['foyer']}"
            (OUT / f"{name}.irj").write_text(irj(name.upper(), d["cases"]))
            summary[name] = {"profil": case["id"], "cases": d["cases"], "openfisca_impot_annuel": d["openfisca_impot_annuel"]}
    (OUT / "declarations.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n")
    print(f"{len(summary)} déclarations écrites dans {OUT}")


if __name__ == "__main__":
    main()
