"""Fetch pinned MIT source data only. Never imports or runs upstream software."""
from pathlib import Path
from urllib.request import urlopen
import concurrent.futures,hashlib,json,sys,xml.etree.ElementTree as ET
HERE=Path(__file__).resolve().parent
PIN='9bac53d0dee196c62620eee9e8a0fa255a0ff5fa'
BASE=f'https://raw.githubusercontent.com/Hyperspawn/dropbear_urdf/{PIN}/'
SOURCE=HERE/'source';SOURCE.mkdir(exist_ok=True)
manifest_path=HERE/'source-manifest.json'
expected={r['file']:r for r in json.loads(manifest_path.read_text())['files']}if manifest_path.exists()else{}
def fetch(remote,local):
 p=SOURCE/local;p.parent.mkdir(parents=True,exist_ok=True)
 if not p.exists()or local not in expected:
  data=urlopen(BASE+remote,timeout=60).read()
  if data.startswith(b'version https://git-lfs.github.com/spec/v1'):
   data=urlopen(f'https://media.githubusercontent.com/media/Hyperspawn/dropbear_urdf/{PIN}/{remote}',timeout=90).read()
  p.write_bytes(data)
 data=p.read_bytes()
 if local in expected and hashlib.sha256(data).hexdigest()!=expected[local]['sha256']:raise ValueError('Pinned source hash mismatch: '+local)
 return dict(file=local,remote=remote,bytes=len(data),sha256=hashlib.sha256(data).hexdigest())
files=[fetch('LICENSE','LICENSE.txt'),fetch('dropbear_granular_urdf/urdf/dropbear.urdf','dropbear.urdf')]
r=ET.parse(SOURCE/'dropbear.urdf').getroot()
def vec(el,key,default):return [float(v)for v in el.attrib.get(key,default).split()]if el is not None else [float(v)for v in default.split()]
links=[]
for el in r.findall('link'):
 visuals=[]
 for i,v in enumerate(el.findall('visual')):
  mesh=v.find('geometry/mesh')
  if mesh is None:raise ValueError('Unsupported non-mesh visual')
  uri=mesh.attrib['filename'];remote=uri.replace('package://','')
  local='meshes/'+remote.split('/meshes/')[1]
  o=v.find('origin')
  visuals.append(dict(file=local,remote=remote,scale=vec(mesh,'scale','1 1 1'),xyz=vec(o,'xyz','0 0 0'),rpy=vec(o,'rpy','0 0 0')))
 links.append(dict(name=el.attrib['name'],visuals=visuals))
joints=[]
for j in r.findall('joint'):
 o=j.find('origin');limit=j.find('limit')
 joints.append(dict(name=j.attrib['name'],type=j.attrib['type'],parent=j.find('parent').attrib['link'],child=j.find('child').attrib['link'],xyz=vec(o,'xyz','0 0 0'),rpy=vec(o,'rpy','0 0 0'),axis=vec(j.find('axis'),'xyz','1 0 0'),limit={k:float(v)for k,v in limit.attrib.items()}if limit is not None else None))
closures=[]
for j in r.findall('./gazebo/joint'):
 pose=j.find('pose')
 closures.append(dict(name=j.attrib['name'],type=j.attrib.get('type'),parent=j.findtext('parent'),child=j.findtext('child'),pose=[float(v)for v in (pose.text or '').split()]if pose is not None else None,relativeTo=pose.attrib.get('relative_to')if pose is not None else None))
def subtree(start):
 out={start}
 while True:
  before=len(out);out|={j['child']for j in joints if j['parent'] in out}
  if len(out)==before:return out
arm_joint=next(j for j in joints if j['name']=='LH_yaw');arm=subtree(arm_joint['child'])
arm_closures=[c for c in closures if c['parent'] in arm and c['child'] in arm]
crossing=[c for c in closures if (c['parent']in arm)!=(c['child']in arm)]
assert len(arm)==68 and len(arm_closures)==3 and not crossing
all_requested='--all' in sys.argv
selected=links if all_requested else [l for l in links if l['name'] in arm]
needed={v['remote']:v['file']for l in selected for v in l['visuals']}
with concurrent.futures.ThreadPoolExecutor(max_workers=10)as pool:
 for n,record in enumerate(pool.map(lambda pair:fetch(*pair),needed.items())):
  files.append(record)
  if n%25==0:print('fetched',n+1,'/',len(needed),flush=True)
# Keep inventory across partial and full runs.
manifest=HERE/'source-manifest.json'
if manifest.exists():
 old=json.loads(manifest.read_text());merged={v['file']:v for v in old['files']};merged.update({v['file']:v for v in files});files=list(merged.values())
robot=dict(name=r.attrib['name'],revision=PIN,links=links,joints=joints,closures=closures,leftArm=dict(rootLink=arm_joint['child'],driveJoint='LH_yaw',links=sorted(arm),closureNames=[c['name']for c in arm_closures],crossingClosureNames=[]))
(HERE/'source-robot.json').write_text(json.dumps(robot,indent=2)+'\n')
manifest.write_text(json.dumps(dict(repository='Hyperspawn/dropbear_urdf',revision=PIN,license='MIT',selection='whole'if all_requested else 'left-arm',files=sorted(files,key=lambda f:f['file'])),indent=2)+'\n')
print(json.dumps(dict(links=len(links),joints=len(joints),closures=len(closures),armLinks=len(arm),armClosures=len(arm_closures),selectedFiles=len(needed),downloadedBytes=sum(v['bytes']for v in files)),indent=2))
