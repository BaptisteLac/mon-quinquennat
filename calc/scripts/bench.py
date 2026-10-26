"""Temps de calcul d'un appel d'API : 1 profil × (législation actuelle + 8 candidats).

Les réformes sont des réformes de test, pas des programmes : 6 candidats ne touchent que l'impôt,
1 la prime d'activité, 1 les prestations familiales (cas défavorable : deux montants à recalculer).
    uv run python scripts/bench.py
"""
import json
import resource
import statistics
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from mq_calc.compute import Candidate, baseline, compute_all  # noqa: E402
from mq_calc.profile import Profile  # noqa: E402
from mq_calc.reforms import ParamChange, affected_outputs, make_reform  # noqa: E402

IR = "impot_revenu.bareme_ir_depuis_1945.bareme"
PPA = "prestations_sociales.solidarite_insertion.minima_sociaux.ppa.pa_m.montant_de_base"
BMAF = "prestations_sociales.prestations_familiales.bmaf.bmaf"


def candidates() -> list[Candidate]:
    specs = [[ParamChange(IR, 0.11 - 0.005 * (i + 1), "2025-01-01", 1, "rate")] for i in range(6)]
    specs.append([ParamChange(PPA, 700.0, "2026-01-01")])
    specs.append([ParamChange(BMAF, 500.0, "2026-01-01")])
    return [Candidate(f"test{i}", make_reform(baseline(), ch, f"test{i}"), affected_outputs(ch)) for i, ch in enumerate(specs)]


def main():
    t = time.time()
    cands = candidates()
    data = json.loads((Path(__file__).resolve().parents[1] / "profiles/reference.json").read_text())
    cases = [(c["id"], Profile(**c["profile"])) for c in data["profiles"]]
    compute_all(cases[0][1], cands)  # préchauffage
    print(f"Démarrage (chargement + préchauffage, {len(cands)} candidats) : {time.time() - t:.1f} s")
    times = []
    for _ in range(3):
        for cid, p in cases:
            t = time.time()
            compute_all(p, cands)
            times.append(time.time() - t)
    print(f"Par appel (1 profil, actuel + {len(cands)} candidats), {len(times)} appels : "
          f"médiane {statistics.median(times):.2f} s, max {max(times):.2f} s")
    print(f"Mémoire max du processus : {resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024:.0f} Mo")


if __name__ == "__main__":
    main()
