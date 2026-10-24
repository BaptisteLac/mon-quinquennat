"""Le profil Python doit rester aligné sur le schéma Zod (exporté en JSON par packages/schema)."""
import json
from pathlib import Path

from mq_calc.profile import Profile

SCHEMA = Path(__file__).resolve().parents[3] / "packages/schema/json/profile.schema.json"


def _norm(node: dict) -> dict:
    """Résumé comparable : type, enum, bornes, propriétés et champs requis."""
    out: dict = {}
    if "anyOf" in node:  # pydantic : X | None
        non_null = [n for n in node["anyOf"] if n.get("type") != "null"]
        return _norm(non_null[0]) if len(non_null) == 1 else {"anyOf": [_norm(n) for n in non_null]}
    for k in ("type", "enum", "minimum", "maximum"):
        if k in node:
            out[k] = node[k]
    if "const" in node:
        out["enum"] = [node["const"]]
    if node.get("type") == "number" and isinstance(out.get("minimum"), int):
        out["minimum"] = float(out["minimum"])
    if "items" in node:
        out["items"] = _norm(node["items"])
    if "properties" in node:
        out["properties"] = {k: _norm(v) for k, v in node["properties"].items()}
        out["required"] = sorted(node.get("required", []))
    return out


def _resolve(schema: dict, node: dict) -> dict:
    if "$ref" in node:
        name = node["$ref"].split("/")[-1]
        defs = schema.get("$defs") or schema.get("definitions") or {}
        return _resolve(schema, defs[name])
    return {k: ({p: _resolve(schema, v) for p, v in val.items()} if k == "properties" else
                _resolve(schema, val) if k == "items" else
                [_resolve(schema, x) for x in val] if k == "anyOf" else val)
            for k, val in node.items()}


def test_profile_matches_zod_schema():
    zod = json.loads(SCHEMA.read_text())
    zod_profile = _resolve(zod, zod)
    py = Profile.model_json_schema()
    py_profile = _resolve(py, py)
    assert _norm(py_profile) == _norm(zod_profile)
