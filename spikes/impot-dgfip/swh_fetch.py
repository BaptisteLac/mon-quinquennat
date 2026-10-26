"""Récupère les sources M les plus récentes publiées par la DGFiP (dépôt ir-calcul) depuis Software Heritage.

    python3 swh_fetch.py <dossier ir-calcul de destination> <années acceptées, ex. 2018,2019,…>

gitlab.adullact.net, où la DGFiP publie ces sources, ne répond pas depuis GitHub Actions ;
Software Heritage en archive une copie. On prend la dernière révision archivée, on y choisit
l'année de revenus la plus récente parmi celles acceptées (celles que Mlang sait exécuter),
et on télécharge ce seul dossier, fichier par fichier (pas d'archive à préparer).
Écrit sur la sortie standard : {"revision", "dossier", "annee", "visite"} (JSON).
Bibliothèque standard uniquement.
"""
import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

API = "https://archive.softwareheritage.org/api/1"
ORIGIN = "https://gitlab.adullact.net/dgfip/ir-calcul"
# Dossiers d'une année de revenus : « sources2023m_8_0 » ou « M_SVN/2025/code_m ».
SOURCES_DIR = re.compile(r"^sources(\d{4})m_")


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


def call(url: str):
    return json.loads(get(url))


def listing(directory: str) -> dict[str, dict]:
    return {e["name"]: e for e in call(f"{API}/directory/{directory}/")}


def latest_revision() -> tuple[str, str, str]:
    visit = call(f"{API}/origin/{ORIGIN}/visit/latest/?require_snapshot=true")
    branches = call(f"{API}/snapshot/{visit['snapshot']}/")["branches"]
    head = branches["HEAD"]
    if head["target_type"] == "alias":
        head = branches[head["target"]]
    rev = head["target"]
    return rev, call(f"{API}/revision/{rev}/")["directory"], visit["date"]


def candidates(root: str) -> list[tuple[int, str, str]]:
    """(année, chemin, identifiant du dossier) de chaque année de revenus publiée."""
    entries = listing(root)
    found = [(int(m[1]), name, e["target"]) for name, e in entries.items() if e["type"] == "dir" and (m := SOURCES_DIR.match(name))]
    if "M_SVN" in entries:
        for year, e in listing(entries["M_SVN"]["target"]).items():
            if year.isdigit() and e["type"] == "dir":
                code_m = listing(e["target"]).get("code_m")
                if code_m:
                    found.append((int(year), f"M_SVN/{year}/code_m", code_m["target"]))
    return sorted(found)


def fetch_tree(directory: str, dest: Path) -> int:
    dest.mkdir(parents=True, exist_ok=True)
    count = 0
    for name, entry in listing(directory).items():
        if entry["type"] == "dir":
            count += fetch_tree(entry["target"], dest / name)
        elif entry["type"] == "file":
            (dest / name).write_bytes(get(f"{API}/content/sha1_git:{entry['target']}/raw/"))
            count += 1
    return count


def main() -> None:
    dest, accepted = Path(sys.argv[1]), {int(y) for y in sys.argv[2].split(",")}
    rev, root, visit = latest_revision()
    found = candidates(root)
    print(f"Révision {rev} (visite du {visit}) : années publiées {[y for y, _, _ in found]}.", file=sys.stderr)
    usable = [c for c in found if c[0] in accepted]
    if not usable:
        raise SystemExit(f"Aucune année publiée parmi celles que Mlang exécute ({sorted(accepted)}).")
    year, path, directory = usable[-1]
    n = fetch_tree(directory, dest / path)
    print(f"{n} fichiers de {path} récupérés.", file=sys.stderr)
    print(json.dumps({"revision": rev, "dossier": path, "annee": year, "visite": visit}))


if __name__ == "__main__":
    main()
