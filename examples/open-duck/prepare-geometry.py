"""Offline, reproducible display simplification. Original source remains intact."""
import hashlib
import json
from pathlib import Path
import numpy as np
import trimesh
import fast_simplification

HERE = Path(__file__).resolve().parent


def surface_partitions(mesh):
    """Keep every facet while separating conflicting edge uses into draw surfaces.

    An exported vendor STL may combine independently touching solids. The line
    preparer correctly rejects edges used by more than two facets in ONE mesh.
    Partition those uses without moving, filling or deleting source surfaces.
    """
    mesh.vertices = np.asarray(mesh.vertices, dtype=np.float32).astype(np.float64)
    tolerance = max(np.linalg.norm(mesh.bounds[1] - mesh.bounds[0]) * 1e-7, 1e-8)
    vertex_ids = np.unique(np.round(mesh.vertices / tolerance).astype(np.int64), axis=0, return_inverse=True)[1]
    faces = vertex_ids[mesh.faces]
    groups, counts = [], []
    for index, face in enumerate(faces):
        edges = [tuple(sorted((int(face[i]), int(face[(i + 1) % 3])))) for i in range(3)]
        if len(set(face)) < 3:
            edges = []
        selected = next((i for i, count in enumerate(counts)
                         if all(count.get(edge, 0) < 2 for edge in edges)), None)
        if selected is None:
            selected = len(groups)
            groups.append([])
            counts.append({})
        groups[selected].append(index)
        for edge in edges:
            counts[selected][edge] = counts[selected].get(edge, 0) + 1
    if len(groups) == 1:
        return [mesh]
    result = []
    for faces in groups:
        piece = mesh.submesh([faces], append=True, repair=False)
        result.extend(surface_partitions(piece))
    return result


def main():
    # derived/ is generated output; remove obsolete partitions after a source
    # quality change so each reproducible result has one current surface set.
    for old in (HERE / "derived").glob("*.stl"):
        old.unlink()
    robot = json.loads((HERE / "source-robot.json").read_text())
    files = sorted({visual["file"] for link in robot["links"] for visual in link["visuals"]})
    records = []
    for name in files:
        original = (HERE / "source" / name).read_bytes()
        mesh = trimesh.load(HERE / "source" / name, force="mesh", process=True)
        before = len(mesh.faces)
        mesh.update_faces(mesh.unique_faces())
        mesh.update_faces(mesh.nondegenerate_faces())
        # Vendor servo STLs contain repeated fine manufacturing details. Keep
        # their silhouette, but do not send millions of repeated facets to a phone.
        # Keep the complete source head: its front holes and silhouette are
        # prominent close-up details in the presentation.
        target = 1200 if name.startswith("wj-wk") else len(mesh.faces) if name == "head.stl" else 2500
        if name in {"raspberrypizerow.stl", "board.stl"}:
            target = 2500
        if len(mesh.faces) > target:
            mesh = mesh.simplify_quadric_decimation(face_count=target, aggression=4)
        mesh.update_faces(mesh.unique_faces())
        mesh.update_faces(mesh.nondegenerate_faces())
        mesh.remove_unreferenced_vertices()
        if not np.isfinite(mesh.vertices).all():
            raise ValueError(f"Invalid simplified positions: {name}")
        pieces = surface_partitions(mesh)
        displays = []
        for index, piece in enumerate(pieces):
            filename = name if index == 0 else f"{Path(name).stem}__surface{index + 1}.stl"
            destination = HERE / "derived" / filename
            destination.parent.mkdir(parents=True, exist_ok=True)
            data = trimesh.exchange.stl.export_stl(piece)
            destination.write_bytes(data)
            displays.append({"file": filename, "triangles": len(piece.faces),
                             "sha256": hashlib.sha256(data).hexdigest()})
        records.append({"file": name, "sourceTriangles": before,
                        "displayTriangles": sum(display["triangles"] for display in displays),
                        "displaySurfaces": displays,
                        "sourceSha256": hashlib.sha256(original).hexdigest(),
                        "sourceBounds": trimesh.load(HERE / "source" / name, force="mesh").bounds.tolist(),
                        "displayBounds": mesh.bounds.tolist(), "watertight": bool(mesh.is_watertight)})
    by_name = {record["file"]: record for record in records}
    refs = [visual["file"] for link in robot["links"] for visual in link["visuals"]]
    report = {"kind": "derived-display-geometry", "toolchain": {
        "trimesh": trimesh.__version__, "numpy": np.__version__, "fastSimplification": fast_simplification.__version__, "method": "quadric edge collapse; aggression 4; full-resolution source head"},
        "note": "Source files are unmodified. Display geometry is simplified. Conflicting edge uses are partitioned into coincident display surfaces without removing facets. Not manufacturing geometry.",
        "referencedSourceTriangles": sum(by_name[name]["sourceTriangles"] for name in refs),
        "referencedDisplayTriangles": sum(by_name[name]["displayTriangles"] for name in refs),
        "files": records}
    (HERE / "geometry-report.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({key: report[key] for key in ["referencedSourceTriangles", "referencedDisplayTriangles"]}, indent=2))


if __name__ == "__main__":
    main()
