"""Prepare display geometry offline; pinned hardware source remains unmodified."""
import hashlib
import json
from pathlib import Path
import numpy as np
import trimesh
import fast_simplification
HERE=Path(__file__).resolve().parent

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
    destination=HERE / "derived"
    destination.mkdir(parents=True,exist_ok=True)
    for old in destination.glob("*.stl"): old.unlink()
    robot=json.loads((HERE / "source-robot.json").read_text())
    visuals=[v for link in robot["links"] for v in link["visuals"]]
    paths=sorted({v["path"] for v in visuals})
    records=[]
    for path in paths:
        name=Path(path).name
        original=(HERE / "source" / path).read_bytes()
        mesh=trimesh.load(HERE / "source" / path,force="mesh",process=True)
        source_bounds=mesh.bounds.tolist();before=len(mesh.faces)
        mesh.update_faces(mesh.unique_faces());mesh.update_faces(mesh.nondegenerate_faces())
        target=6200 if name=="MG996R.stl" else 12000 if name=="electronics.stl" else len(mesh.faces)
        if len(mesh.faces)>target: mesh=mesh.simplify_quadric_decimation(face_count=target,aggression=4)
        mesh.update_faces(mesh.unique_faces());mesh.update_faces(mesh.nondegenerate_faces());mesh.remove_unreferenced_vertices()
        if not np.isfinite(mesh.vertices).all(): raise ValueError(f"Invalid positions: {name}")
        surfaces=surface_partitions(mesh);display=[]
        for index,surface in enumerate(surfaces):
            filename=name if index==0 else f"{Path(name).stem}__surface{index+1}.stl"
            data=trimesh.exchange.stl.export_stl(surface);(destination / filename).write_bytes(data)
            display.append({"file":filename,"triangles":len(surface.faces),"sha256":hashlib.sha256(data).hexdigest()})
        records.append({"file":name,"sourcePath":path,"sourceTriangles":before,"displayTriangles":sum(p["triangles"] for p in display),"displaySurfaces":display,"sourceSha256":hashlib.sha256(original).hexdigest(),"sourceBounds":source_bounds,"displayBounds":mesh.bounds.tolist(),"watertight":bool(mesh.is_watertight)})
    by_path={r["sourcePath"]:r for r in records}
    report={"kind":"derived-display-geometry","toolchain":{"trimesh":trimesh.__version__,"numpy":np.__version__,"fastSimplification":fast_simplification.__version__,"method":"quadric edge collapse; aggression 4; unchanged low-density brackets and leg silhouette"},"note":"Original hardware files remain unmodified. Conflicting edge uses partition into coincident display surfaces; every derived facet remains. Display only, not manufacturing geometry.","referencedSourceTriangles":sum(by_path[v["path"]]["sourceTriangles"] for v in visuals),"referencedDisplayTriangles":sum(by_path[v["path"]]["displayTriangles"] for v in visuals),"files":records}
    (HERE / "geometry-report.json").write_text(json.dumps(report,indent=2)+"\n")
    print(json.dumps({k:report[k] for k in ["referencedSourceTriangles","referencedDisplayTriangles"]}))

if __name__=="__main__": main()
