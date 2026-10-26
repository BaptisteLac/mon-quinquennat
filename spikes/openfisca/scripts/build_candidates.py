"""Écrit candidates.json (réformes de chaque candidat) à partir des mesures publiées.

    uv run python scripts/build_candidates.py
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from mq_calc.candidates import specs_from_measures  # noqa: E402

measures = sorted((ROOT.parents[1] / "data/measures").glob("*.json"))
measures = [p for p in measures if not p.name.endswith(".a-relire.json")]
specs = specs_from_measures(measures)
out = {
    "description": "Généré par scripts/build_candidates.py depuis data/measures : leviers de réforme des mesures publiées, par candidat.",
    "candidates": [s.model_dump() for s in specs],
}
(ROOT / "candidates.json").write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
for s in specs:
    print(f"{s.id} : {len(s.levers)} levier(s) — " + ", ".join(f"{u.lever}={u.value}" for u in s.levers))
