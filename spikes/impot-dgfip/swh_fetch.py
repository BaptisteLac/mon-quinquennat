"""Récupère les sources M de la DGFiP (dépôt ir-calcul) depuis l'archive Software Heritage.

    python3 swh_fetch.py <révision git attendue> <dossier de destination>

Secours quand gitlab.adullact.net ne répond pas (cas depuis GitHub Actions). Prend la révision
demandée si elle est archivée, sinon la dernière révision archivée de la branche principale.
Affiche la révision utilisée. Bibliothèque standard uniquement.
"""
import io
import json
import sys
import tarfile
import time
import urllib.error
import urllib.request
from pathlib import Path

API = "https://archive.softwareheritage.org/api/1"
ORIGIN = "https://gitlab.adullact.net/dgfip/ir-calcul"


def call(url: str, method: str = "GET") -> dict:
    req = urllib.request.Request(url, method=method, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())


def revision_directory(rev: str) -> tuple[str, str]:
    try:
        return rev, call(f"{API}/revision/{rev}/")["directory"]
    except urllib.error.HTTPError as e:
        if e.code != 404:
            raise
    print(f"Révision {rev} absente de l'archive : dernière révision archivée de {ORIGIN}.", file=sys.stderr)
    visit = call(f"{API}/origin/{ORIGIN}/visit/latest/?require_snapshot=true")
    branches = call(f"{API}/snapshot/{visit['snapshot']}/")["branches"]
    head = branches["HEAD"]
    if head["target_type"] == "alias":
        head = branches[head["target"]]
    latest = head["target"]
    return latest, call(f"{API}/revision/{latest}/")["directory"]


def fetch_directory(directory: str, dest: Path) -> None:
    url = f"{API}/vault/flat/swh:1:dir:{directory}/"
    status = call(url, method="POST")
    for _ in range(160):
        if status["status"] == "done":
            break
        if status["status"] == "failed":
            raise RuntimeError(f"Software Heritage n'a pas pu préparer l'archive : {status.get('progress_message')}")
        time.sleep(15)
        status = call(url)
    else:
        raise TimeoutError("Archive Software Heritage non prête après 40 minutes.")
    with urllib.request.urlopen(status["fetch_url"], timeout=600) as r:
        data = r.read()
    dest.mkdir(parents=True, exist_ok=True)
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as tar:
        members = tar.getmembers()
        # L'archive contient un dossier racine (le SWHID) : on le retire.
        root = members[0].name.split("/")[0]
        for m in members:
            parts = m.name.split("/", 1)
            if parts[0] != root or len(parts) == 1:
                continue
            m.name = parts[1]
            tar.extract(m, dest, filter="data")


def main() -> None:
    rev, dest = sys.argv[1], Path(sys.argv[2])
    used, directory = revision_directory(rev)
    fetch_directory(directory, dest)
    print(used)


if __name__ == "__main__":
    main()
