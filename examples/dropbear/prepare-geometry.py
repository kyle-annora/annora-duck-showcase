"""Prepare bounded display surfaces from pinned source; originals stay intact."""
from pathlib import Path
import hashlib,json,sys,importlib.util
import numpy as np
import trimesh
import fast_simplification
HERE=Path(__file__).resolve().parent
# Reuse Annora's already validated non-manifold surface partitioner.
spec=importlib.util.spec_from_file_location('annora_surface_preparation',HERE.parent/'open-duck/prepare-geometry.py')
helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
robot=json.loads((HERE/'source-robot.json').read_text())
arm=set(robot['leftArm']['links'])
selected=[l for l in robot['links'] if '--all' in sys.argv or l['name']in arm]
files=sorted({v['file']for l in selected for v in l['visuals']})
whole='--all' in sys.argv
report_path=HERE/('geometry-report.json' if whole else 'geometry-report-arm.json');records={}
derived=HERE/('derived' if whole else 'derived-arm')
if whole:import pymeshlab
if report_path.exists():records={r['file']:r for r in json.loads(report_path.read_text())['files']}
for n,name in enumerate(files):
 original=(HERE/'source'/name).read_bytes();source_hash=hashlib.sha256(original).hexdigest()
 # Derivation inputs and target function are versioned by this script's hash.
 settings_hash=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
 existing=records.get(name)
 if existing and existing.get('settingsSha256')==settings_hash and existing['sourceSha256']==source_hash and all((derived/s['file']).exists()for s in existing['displaySurfaces']):continue
 mesh=trimesh.load(HERE/'source'/name,force='mesh',process=True)
 source_count=len(mesh.faces);source_bounds=mesh.bounds.tolist()
 mesh.update_faces(mesh.unique_faces());mesh.update_faces(mesh.nondegenerate_faces())
 source_mesh=mesh.copy()
 lower=name.lower()
 target=400
 if any(word in lower for word in ['rmd-','bearing','motor','ujoint','pulley','lead','lead-screw']):target=1600
 if any(word in lower for word in ['shoulder','bicep','hanger','tendon','interface','forearm','wrist','skull','neck']):target=1400
 if any(word in lower for word in ['screw','bolt','nut','washer','pin_','m3-','m4-','m5-','m6-']):target=200
 if whole:target=max(64,int(target*.48))
 method='fast-quadric'
 if len(mesh.faces)>target:mesh=mesh.simplify_quadric_decimation(face_count=target,aggression=6)
 # Keep the source envelope: a coarse board must not lose its connector and a
 # curved cover must not shrink enough to stop fitting its source assembly.
 envelope_tolerance=max(.25,float(np.linalg.norm(np.asarray(source_bounds)[1]-np.asarray(source_bounds)[0]))*.005)
 deviation=lambda candidate:float(np.max(np.abs(np.asarray(source_bounds)-candidate.bounds)))
 if whole and (len(mesh.faces)>target*1.25 or deviation(mesh)>envelope_tolerance):
  final_target=target
  while True:
   ms=pymeshlab.MeshSet();ms.add_mesh(pymeshlab.Mesh(vertex_matrix=source_mesh.vertices,face_matrix=source_mesh.faces))
   ms.apply_filter('meshing_decimation_quadric_edge_collapse',targetfacenum=final_target,preservenormal=True,preservetopology=True,preserveboundary=True,optimalplacement=True,planarquadric=True)
   pm=ms.current_mesh();candidate=trimesh.Trimesh(vertices=pm.vertex_matrix(),faces=pm.face_matrix(),process=True)
   if deviation(candidate)<=envelope_tolerance:
    mesh=candidate;break
   final_target*=2
   if final_target>=len(source_mesh.faces):mesh=source_mesh.copy();break
  method='MeshLab source-mesh quadric; topology, normal, boundary and envelope guards'
 mesh.update_faces(mesh.unique_faces());mesh.update_faces(mesh.nondegenerate_faces());mesh.remove_unreferenced_vertices()
 if not np.isfinite(mesh.vertices).all():raise ValueError(name)
 surfaces=[]
 for i,piece in enumerate(helper.surface_partitions(mesh)):
  local=name.replace('meshes/','',1)
  filename=local if i==0 else str(Path(local).with_name(Path(local).stem+f'__surface{i+1}.stl'))
  dest=derived/filename;dest.parent.mkdir(parents=True,exist_ok=True)
  data=trimesh.exchange.stl.export_stl(piece);dest.write_bytes(data)
  surfaces.append(dict(file=filename,triangles=len(piece.faces),sha256=hashlib.sha256(data).hexdigest()))
 records[name]=dict(file=name,sourceTriangles=source_count,displayTriangles=sum(s['triangles']for s in surfaces),method=method,boundsDeviation=float(np.max(np.abs(np.asarray(source_bounds)-mesh.bounds))),sourceSha256=source_hash,settingsSha256=settings_hash,sourceBounds=source_bounds,displayBounds=mesh.bounds.tolist(),displaySurfaces=surfaces)
 if n%20==0:print('prepared',n+1,'/',len(files),flush=True)
report=dict(schemaVersion=1,toolchain=dict(trimesh=trimesh.__version__,fastSimplification=fast_simplification.__version__,numpy=np.__version__,pymeshlab='2025.7.post1' if whole else None),method='Quadric decimation, aggression 6; semantic detail budgets (whole display at 48%); MeshLab fallback with normal/topology preservation; Annora surface partitioner',files=sorted(records.values(),key=lambda r:r['file']))
# Remove stale generated partitions only; pinned originals are never changed.
expected={str(Path(s['file'])) for record in records.values() for s in record['displaySurfaces']}
for file in derived.rglob('*.stl'):
 if str(file.relative_to(derived)) not in expected:file.unlink()
report_path.write_text(json.dumps(report,indent=2)+'\n')
print('unique derived triangles',sum(r['displayTriangles']for r in records.values()),'files',len(records))
