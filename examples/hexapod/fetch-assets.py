"""Fetch pinned Hexapod data only. Do not execute upstream robot software."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib
import json
import urllib.request
import xml.etree.ElementTree as ET

HERE = Path(__file__).resolve().parent
REPO = "ggldnl/Hexapod-Hardware"
REVISION = "f8ee8084d48470283d5ca23394d5a4b9590ad9e8"
BASE = f"https://raw.githubusercontent.com/{REPO}/{REVISION}/"

def get(path):
    req=urllib.request.Request(BASE+path, headers={"User-Agent":"Annora-model-preparation"})
    with urllib.request.urlopen(req,timeout=45) as response:return response.read()

def vector(value,default="0 0 0"):return [float(x) for x in (value or default).split()]
def origin(node):
    o=node.find("origin")
    return {"xyz":vector(o.get("xyz")) if o is not None else [0,0,0],"rpy":vector(o.get("rpy")) if o is not None else [0,0,0]}

def main():
    urdf=get("hexapod.urdf");root=ET.fromstring(urdf)
    links=[];joints=[];paths={"hexapod.urdf","LICENSE.md","README.md"}
    for link in root.findall("link"):
        visuals=[]
        for i,visual in enumerate(link.findall("visual")):
            mesh=visual.find("geometry/mesh")
            if mesh is None:raise ValueError("This adapter expects source mesh visuals.")
            filename=mesh.get("filename");paths.add(filename)
            visuals.append({"name":visual.get("name") or f'{link.get("name")}_{i+1}',**origin(visual),"path":filename,"file":filename.split("/")[-1],"scale":vector(mesh.get("scale"),"1 1 1")})
        links.append({"name":link.get("name"),"visuals":visuals})
    for joint in root.findall("joint"):
        a,l=joint.find("axis"),joint.find("limit")
        joints.append({"name":joint.get("name"),"type":joint.get("type"),"parent":joint.find("parent").get("link"),"child":joint.find("child").get("link"),**origin(joint),"axis":vector(a.get("xyz")) if a is not None else [1,0,0],"limit":{k:float(v) for k,v in l.attrib.items()} if l is not None else None})
    def fetch(path):
        data=urdf if path=="hexapod.urdf" else get(path)
        target=HERE/"source"/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
        return {"file":path,"bytes":len(data),"sha256":hashlib.sha256(data).hexdigest()}
    with ThreadPoolExecutor(max_workers=8) as pool:files=list(pool.map(fetch,sorted(paths)))
    (HERE/"source-manifest.json").write_text(json.dumps({"repository":f"https://github.com/{REPO}","revision":REVISION,"files":files},indent=2)+"\n")
    (HERE/"source-robot.json").write_text(json.dumps({"name":root.get("name"),"links":links,"joints":joints},indent=2)+"\n")
    print(f'Fetched {len(files)} files; {len(links)} links, {len(joints)} joints, {sum(len(l["visuals"]) for l in links)} visuals.')

if __name__=="__main__":main()
