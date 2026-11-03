"""Fetch the pinned Open Duck data only; never execute upstream project code."""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import urllib.request
import xml.etree.ElementTree as ET

HERE = Path(__file__).resolve().parent
REPO = "mertcookimg/Open_Duck_Mini_Viewer"
REVISION = "dfdb84ef3ae2405e5f115b32f48471331dc65d78"
PREFIX = "public/assets/open_duck_mini_v2/"


def get(url):
    request = urllib.request.Request(url, headers={"User-Agent": "Annora-model-preparation"})
    with urllib.request.urlopen(request, timeout=45) as response:
        return response.read()


def vector(value, default="0 0 0"):
    return [float(number) for number in (value or default).split()]


def origin(element):
    value = element.find("origin")
    return {"xyz": vector(value.get("xyz")) if value is not None else [0, 0, 0],
            "rpy": vector(value.get("rpy")) if value is not None else [0, 0, 0]}


def main():
    tree = json.loads(get(f"https://api.github.com/repos/{REPO}/git/trees/{REVISION}?recursive=1"))
    paths = [entry["path"] for entry in tree["tree"]
             if entry["type"] == "blob" and entry["path"].startswith(PREFIX)]

    def fetch(path):
        relative = path[len(PREFIX):]
        destination = HERE / "source" / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        data = get(f"https://raw.githubusercontent.com/{REPO}/{REVISION}/{path}")
        destination.write_bytes(data)
        return {"file": relative, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        files = list(pool.map(fetch, paths))
    (HERE / "source-manifest.json").write_text(json.dumps({
        "repository": f"https://github.com/{REPO}", "revision": REVISION,
        "prefix": PREFIX, "files": files}, indent=2) + "\n")
    root = ET.parse(HERE / "source" / "robot.urdf").getroot()
    links, joints = [], []
    for link in root.findall("link"):
        visuals = []
        for index, visual in enumerate(link.findall("visual")):
            mesh = visual.find("geometry/mesh")
            if mesh is None:
                raise ValueError("Only explicit mesh visuals are supported by this preparation.")
            visuals.append({"name": visual.get("name") or f'{link.get("name")}_{index + 1}',
                            **origin(visual), "file": mesh.get("filename").split("/")[-1],
                            "scale": vector(mesh.get("scale"), "1 1 1")})
        links.append({"name": link.get("name"), "visuals": visuals})
    for joint in root.findall("joint"):
        axis, limit = joint.find("axis"), joint.find("limit")
        joints.append({"name": joint.get("name"), "type": joint.get("type"),
                       "parent": joint.find("parent").get("link"),
                       "child": joint.find("child").get("link"), **origin(joint),
                       "axis": vector(axis.get("xyz")) if axis is not None else [1, 0, 0],
                       "limit": {key: float(value) for key, value in limit.attrib.items()}
                       if limit is not None else None})
    (HERE / "source-robot.json").write_text(json.dumps({
        "name": root.get("name"), "links": links, "joints": joints}, indent=2) + "\n")
    print(f"Fetched {len(files)} pinned data files; {len(links)} links, {len(joints)} joints.")


if __name__ == "__main__":
    main()
