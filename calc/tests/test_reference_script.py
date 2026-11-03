"""Le script de référence affiche un libellé pour chaque montant calculé (régression : `rsa` sans libellé)."""
import importlib.util
from pathlib import Path

from mq_calc.compute import AMOUNTS


def test_every_amount_has_a_label():
    path = Path(__file__).resolve().parents[1] / "scripts/run_reference.py"
    spec = importlib.util.spec_from_file_location("run_reference", path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    assert set(AMOUNTS) <= set(module.LABELS)
