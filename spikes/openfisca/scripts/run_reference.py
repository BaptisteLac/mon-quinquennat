"""Calcule les profils de référence et les compare aux montants relevés sur les simulateurs officiels.

    uv run python scripts/run_reference.py            # tableau Markdown
Feu vert (docs/faisabilite.md) : écart ≤ 2 % ou ≤ 10 €/mois pour chaque montant relevé.

Un montant relevé peut porter `variableOpenFisca` quand le simulateur officiel ne calcule pas
exactement le montant affiché (ex. : aide au logement avant réduction de loyer de solidarité).
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from mq_calc.compute import AMOUNTS, MONTH, _simulate, baseline, build, compute  # noqa: E402
from mq_calc.profile import Profile  # noqa: E402

LABELS = {
    "impot_revenu": "Impôt sur le revenu",
    "prime_activite": "Prime d'activité",
    "aides_logement": "Aides au logement",
    "allocations_familiales": "Allocations familiales",
    "minimum_vieillesse": "Minimum vieillesse (ASPA)",
}


def within(calc: float, ref: float) -> bool:
    return abs(calc - ref) <= max(10.0, 0.02 * abs(ref))


def main() -> int:
    data = json.loads((Path(__file__).resolve().parents[1] / "profiles/reference.json").read_text())
    ok = checked = 0
    print("| Profil | Montant | Calculé (€/mois) | Officiel (€/mois) | Écart | Feu vert |")
    print("|---|---|---|---|---|---|")
    for case in data["profiles"]:
        profile = Profile(**case["profile"])
        r = compute(profile)
        sim = None
        for key in AMOUNTS:
            calc = r.amounts[key]
            expected = case["attendu"].get(key, {})
            ref = expected.get("montant")
            label = LABELS[key]
            if (variable := expected.get("variableOpenFisca")) is not None:
                if sim is None:
                    sim = _simulate(baseline(), build(profile, r.inputs.bruts, r.inputs.rfr).situation)
                calc = round(float(sim.calculate(variable, MONTH)[0]), 2)
                label = f"{label} (`{variable}`)"
            calc_s = "—" if calc is None else f"{calc:.2f}"
            if ref is None or calc is None:
                print(f"| {case['id']} | {label} | {calc_s} | à relever | | |")
                continue
            checked += 1
            good = within(calc, ref)
            ok += good
            print(f"| {case['id']} | {label} | {calc_s} | {ref:.2f} | {calc - ref:+.2f} | {'oui' if good else 'non'} |")
        for h in r.hypotheses:
            print(f"|  | ≈ {h} | | | | |")
    print(f"\n{ok}/{checked} montants relevés dans la tolérance.")
    return 0 if ok == checked else 1


if __name__ == "__main__":
    raise SystemExit(main())
