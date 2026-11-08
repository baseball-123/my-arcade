"""Inventory research downloads without modifying any game or model files."""
import hashlib
import json
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parent
report = {"date": "2026-11-01", "scope": "Structural inspection; not a browser render or animation compatibility test", "archives": [], "licenses": [], "models": []}
for path in sorted((ROOT / "archives").glob("*.zip")):
    report["archives"].append({"file": path.relative_to(ROOT).as_posix(), "bytes": path.stat().st_size, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
for path in sorted((ROOT / "extracted").rglob("*")):
    if not path.is_file():
        continue
    if path.name.lower() in ("license", "license.txt", "license.md"):
        report["licenses"].append({"file": path.relative_to(ROOT).as_posix(), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
    if path.suffix.lower() != ".glb":
        continue
    data = path.read_bytes()
    magic, version, length = struct.unpack_from("<III", data)
    if magic != 0x46546C67 or version != 2 or length != len(data):
        raise ValueError(f"Invalid GLB: {path}")
    chunk_length, chunk_type = struct.unpack_from("<II", data, 12)
    if chunk_type != 0x4E4F534A:
        raise ValueError(f"Missing JSON chunk: {path}")
    doc = json.loads(data[20:20 + chunk_length])
    triangles = 0
    bounds = []
    for mesh in doc.get("meshes", []):
        for primitive in mesh.get("primitives", []):
            accessor = doc["accessors"][primitive["attributes"]["POSITION"]]
            if primitive.get("mode", 4) == 4:
                count = doc["accessors"][primitive["indices"]]["count"] if "indices" in primitive else accessor["count"]
                triangles += count // 3
            bounds.append({"min": accessor.get("min"), "max": accessor.get("max")})
    uris = [v["uri"] for kind in ("buffers", "images") for v in doc.get(kind, []) if "uri" in v and not v["uri"].startswith("data:")]
    report["models"].append({"file": path.relative_to(ROOT).as_posix(), "bytes": len(data), "triangles_mesh_data": triangles, "meshes": len(doc.get("meshes", [])), "skins": len(doc.get("skins", [])), "animations": [a.get("name", "unnamed") for a in doc.get("animations", [])], "nodes": [n.get("name", "") for n in doc.get("nodes", [])], "external_uris": uris, "missing_external_files": [uri for uri in uris if not (path.parent / uri).is_file()], "local_mesh_bounds": bounds})
(ROOT / "inventory.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
print(json.dumps({"archives": len(report["archives"]), "license_files": len(report["licenses"]), "glb_models": len(report["models"]), "animated_models": sum(bool(m["animations"]) for m in report["models"]), "external_uri_models": sum(bool(m["external_uris"]) for m in report["models"])}))
