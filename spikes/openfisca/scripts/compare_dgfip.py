"""Compare l'impôt calculé par le code M de la DGFiP (Mlang, GitHub Actions) à celui d'OpenFisca.

    uv run python scripts/compare_dgfip.py     # tableau Markdown ; code 1 si un écart dépasse la tolérance

Lit spikes/impot-dgfip/resultats/ (journaux du workflow `impot-dgfip.yml`) et cas/declarations.json.
Tolérance du feu vert (docs/faisabilite.md) : écart ≤ 10 €/mois ou ≤ 2 %.
"""
import json
import re
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


def within(calc: float, ref: float) -> bool:
    return abs(calc - ref) / 12 <= max(10.0, 0.02 * abs(ref) / 12)


def main() -> int:
    decls = json.loads((DGFIP / "cas/declarations.json").read_text())
    versions = (DGFIP / "resultats/versions.txt").read_text().strip()
    lines = [f"Sources : {versions}", "", "| Déclaration | Revenus | OpenFisca (€/an) | DGFiP (€/an) | Écart (€/mois) | Dans la tolérance | Autres montants DGFiP |", "|---|---|---|---|---|---|---|"]
    ok = checked = 0
    for name, d in decls.items():
        log = DGFIP / "resultats" / f"{name}.log"
        values = parse_log(log.read_text()) if log.exists() else {}
        dgfip = values.get(AMOUNT)
        if AMOUNT in values and dgfip is None:
            dgfip = 0.0  # montant non restitué (indéfini) : rien à payer
        others = ", ".join(f"{k} {v:g}" if v is not None else f"{k} indéfini" for k, v in values.items() if k != AMOUNT)
        of = d["openfisca_impot_annuel"]
        if dgfip is None:
            lines.append(f"| {name} | {d['annee']} | {of:.2f} | non lu | | | {others} |")
            continue
        checked += 1
        good = within(of, dgfip)
        ok += good
        lines.append(f"| {name} | {d['annee']} | {of:.2f} | {dgfip:.2f} | {(of - dgfip) / 12:+.2f} | {'oui' if good else 'non'} | {others} |")
    lines += ["", f"{ok}/{checked} déclarations dans la tolérance ; {len(decls) - checked} non lues."]
    text = "\n".join(lines) + "\n"
    (DGFIP / "resultats/comparaison.md").write_text(text)
    print(text)
    return 0 if ok == checked == len(decls) else 1


if __name__ == "__main__":
    raise SystemExit(main())
