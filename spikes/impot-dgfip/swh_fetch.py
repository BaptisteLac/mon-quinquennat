"""Récupère un dossier des sources M de la DGFiP (dépôt ir-calcul) depuis l'archive Software Heritage.

    python3 swh_fetch.py <révision git attendue> <chemin dans le dépôt> <dossier de destination>

Secours quand gitlab.adullact.net ne répond pas (cas depuis GitHub Actions). Télécharge les fichiers
un à un par l'API (pas de préparation d'archive, qui peut prendre des heures). Prend la révision
demandée si elle est archivée, sinon la dernière révision archivée de la branche principale.
Affiche la révision utilisée. Bibliothèque standard uniquement.
"""
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

API = "https://archive.softwareheritage.org/api/1"
ORIGIN = "https://gitlab.adullact.net/dgfip/ir-calcul"


def get(url: str) -> bytes:
    for _ in range(10):
        try:
            with urllib.request.urlopen(urllib.request.Request(url), timeout=120) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
            # Limite de requêtes anonymes : attendre la réinitialisation annoncée.
            reset = int(e.headers.get("X-RateLimit-Reset", time.time() + 60))
            wait = max(10, min(3600, reset - int(time.time())))
            print(f"Limite de requêtes Software Heritage : pause de {wait} s.", file=sys.stderr)
            time.sleep(wait)
    raise RuntimeError(f"Trop de refus de Software Heritage pour {url}")


def call(url: str) -> dict | list:
    return json.loads(get(url))


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


def fetch_tree(directory: str, dest: Path) -> int:
    dest.mkdir(parents=True, exist_ok=True)
    count = 0
    for entry in call(f"{API}/directory/{directory}/"):
        if entry["type"] == "dir":
            count += fetch_tree(entry["target"], dest / entry["name"])
        elif entry["type"] == "file":
            (dest / entry["name"]).write_bytes(get(f"{API}/content/sha1_git:{entry['target']}/raw/"))
            count += 1
    return count


def main() -> None:
    rev, path, dest = sys.argv[1], sys.argv[2].strip("/"), Path(sys.argv[3])
    used, root = revision_directory(rev)
    sub = call(f"{API}/directory/{root}/{path}/")
    target = sub[0]["target"] if isinstance(sub, list) else sub["target"]
    n = fetch_tree(target, dest / path)
    print(f"{n} fichiers de {path} récupérés.", file=sys.stderr)
    print(used)


if __name__ == "__main__":
    main()
