"""Calcule les profils de référence et les compare aux montants relevés sur les simulateurs officiels.

    uv run python scripts/run_reference.py            # tableau Markdown
Feu vert (docs/faisabilite.md) : écart ≤ 2 % ou ≤ 10 €/mois pour chaque montant relevé.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from mq_calc.compute import AMOUNTS, compute  # noqa: E402
from mq_calc.profile import ComplementCalcul, Profile  # noqa: E402

LABELS = {
    "impot_revenu": "Impôt sur le revenu",
    "prime_activite": "Prime d'activité",
    "aides_logement": "Aides au logement",
    "allocations_familiales": "Allocations familiales",
}


def within(calc: float, ref: float) -> bool:
    return abs(calc - ref) <= max(10.0, 0.02 * abs(ref))


def main() -> int:
    data = json.loads((Path(__file__).resolve().parents[1] / "profiles/reference.json").read_text())
    ok = checked = 0
    print("| Profil | Montant | Calculé (€/mois) | Officiel (€/mois) | Écart | Feu vert |")
    print("|---|---|---|---|---|---|")
    for case in data["profiles"]:
        r = compute(Profile(**case["profile"]), ComplementCalcul(**case["complement"]))
        for key in AMOUNTS:
            calc = r.amounts[key]
            ref = case["attendu"][key]["montant"]
            calc_s = "—" if calc is None else f"{calc:.2f}"
            if ref is None or calc is None:
                print(f"| {case['id']} | {LABELS[key]} | {calc_s} | à relever | | |")
                continue
            checked += 1
            good = within(calc, ref)
            ok += good
            print(f"| {case['id']} | {LABELS[key]} | {calc_s} | {ref:.2f} | {calc - ref:+.2f} | {'oui' if good else 'non'} |")
        for h in r.hypotheses:
            print(f"|  | ≈ {h} | | | | |")
    print(f"\n{ok}/{checked} montants relevés dans la tolérance.")
    return 0 if ok == checked else 1


if __name__ == "__main__":
    raise SystemExit(main())
