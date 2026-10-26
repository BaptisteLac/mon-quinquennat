import os
import sys
from pathlib import Path

# Les tests construisent leurs applications : pas de chargement des mesures du dépôt à l'import.
os.environ.setdefault("MQ_NO_APP", "1")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
