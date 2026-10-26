"""Enregistre les réponses réelles du service de calcul pour les profils de référence, utilisées par les
tests du site (`apps/web/src/lib/ticket/fixtures/`). Aucun chiffre n'y est écrit à la main.

    MQ_URL=http://127.0.0.1:8765 uv run python scripts/record_web_fixtures.py
"""
import json
import os
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT.parents[0] / "apps" / "web" / "src" / "lib" / "ticket" / "fixtures"
URL = os.environ.get("MQ_URL", "http://127.0.0.1:8000")

# Profils de référence (vérifiés sur les simulateurs officiels), plus une retraitée seule à petite
# pension, concernée par le minimum vieillesse (même profil que tests/test_levers.py).
profiles = {p["id"]: p["profile"] for p in json.loads((ROOT / "profiles/reference.json").read_text())["profiles"]}
profiles["retraitee-seule-petite-pension"] = {
    "age": 72, "genre": "femme", "situationFamiliale": "seul", "enfants": [], "situationPro": "retraite",
    "revenusNetsMensuels": 400, "pensionMensuelle": 400, "logement": "proprio_sans_credit", "lieuDeVie": "rural",
    "mobilite": "voiture_thermique",
}

OUT.mkdir(parents=True, exist_ok=True)
for pid, profile in profiles.items():
    req = urllib.request.Request(f"{URL}/calcul", data=json.dumps({"profile": profile}).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as res:
        body = json.load(res)
    (OUT / f"{pid}.json").write_text(json.dumps({"profile": profile, "calcul": body}, ensure_ascii=False, indent=2) + "\n")
    print(pid, body["candidats"].get("c-01", {}).get("montants"))
