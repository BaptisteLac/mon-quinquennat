"""Compare l'impôt calculé par le code M de la DGFiP (Mlang, GitHub Actions) à celui d'OpenFisca.

    uv run python scripts/compare_dgfip.py           # tableau Markdown
    uv run python scripts/compare_dgfip.py --write   # reporte les montants dans profiles/reference.json

Lit spikes/impot-dgfip/resultats/ (journaux du workflow `impot-dgfip.yml`) et cas/declarations.json.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DGFIP = ROOT.parents[0] / "impot-dgfip"
# Ligne écrite par Mlang quand la valeur calculée diffère de l'attendu (-1, voir export_irj.py).
KO = re.compile(r"KO \| (?P<var>[A-Z0-9_]+) attendue: (?P<exp>\S+) - evaluee: (?P<calc>\S+)")
AMOUNT = "NAPTIR"
"""Net à payer d'impôt sur le revenu."""


def parse_log(text: str) -> dict[str, float | None]:
    values: dict[str, float | None] = {}
    for m in KO.finditer(text):
        calc = m["calc"]
        values[m["var"]] = None if calc.startswith("ind") else float(calc)
    return values


def main(write: bool) -> int:
    decls = json.loads((DGFIP / "cas/declarations.json").read_text())
    versions = (DGFIP / "resultats/versions.txt").read_text().strip().replace("\n", ", ")
    by_profile: dict[str, float] = {}
    print("| Déclaration | OpenFisca (€/an) | DGFiP (€/an) | Écart (€/mois) | Autres montants DGFiP |")
    print("|---|---|---|---|---|")
    for name, d in decls.items():
        log = DGFIP / "resultats" / f"{name}.log"
        values = parse_log(log.read_text()) if log.exists() else {}
        dgfip = values.get(AMOUNT)
        # Montant non restitué (indéfini) : rien à payer.
        dgfip = 0.0 if dgfip is None and AMOUNT in values else dgfip
        others = ", ".join(f"{k} {v:g}" if v is not None else f"{k} indéfini" for k, v in values.items() if k != AMOUNT)
        if dgfip is None:
            print(f"| {name} | {d['openfisca_impot_annuel']:.2f} | non lu | | {others} |")
            continue
        by_profile[d["profil"]] = by_profile.get(d["profil"], 0.0) + dgfip
        diff = (d["openfisca_impot_annuel"] - dgfip) / 12
        print(f"| {name} | {d['openfisca_impot_annuel']:.2f} | {dgfip:.2f} | {diff:+.2f} | {others} |")
    if write:
        path = ROOT / "profiles/reference.json"
        data = json.loads(path.read_text())
        for case in data["profiles"]:
            if case["id"] not in by_profile:
                continue
            cases = "; ".join(
                f"{n} : " + ", ".join(f"{k} {v}" for k, v in d["cases"].items())
                for n, d in decls.items() if d["profil"] == case["id"]
            )
            case["attendu"]["impot_revenu"] = {
                "montant": round(by_profile[case["id"]] / 12, 2),
                "source": (
                    "Code de calcul de l'impôt sur le revenu publié par la DGFiP (sources M, gitlab.adullact.net/dgfip/ir-calcul), "
                    f"revenus 2025, exécuté par Mlang (github.com/MLanguage/mlang) dans GitHub Actions ({versions}) : "
                    f"{AMOUNT} (net à payer) ramené au mois. Déclaration 2042 saisie ({cases}), revenus déclarés tels que "
                    "calculés par OpenFisca. Preuve : spikes/impot-dgfip/resultats/."
                ),
            }
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main("--write" in sys.argv))
