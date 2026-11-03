# Dropbear source-linked display packages

This preparation project produces a hidden left-arm proof package and a complete
Dropbear humanoid package for the existing Annora Explorer. It changes model
content only. The runtime, generic model validator and source joint definitions
are unchanged.

## Source and permitted scope

- Source repository: [Hyperspawn/dropbear_urdf](https://github.com/Hyperspawn/dropbear_urdf).
- Pinned revision: `9bac53d0dee196c62620eee9e8a0fa255a0ff5fa`.
- Source: `dropbear_granular_urdf/urdf/dropbear.urdf` and its referenced STL files.
- License: MIT; the complete source license is in `source/LICENSE.txt` and both
  prepared packages. Source authors are Pointblank LLC / Hyperspawn.
- The optional hardware reference is `Hyperspawn/dropbear_hardware` at
  `72b29b7fd5d32cae1eb9bca2f16f1f76afca68dd`. Its large STEP files are not needed
  or downloaded by this project.
- No upstream scripts, controller software, WBC policies, motion rollouts or
  noncommercial assets are executed or included. The fetcher retrieves data only.

The source audit contains 669 links, 668 tree joints, 668 visual meshes and 27
additional closure relationships. Every source visual is retained. The left-arm
subtree rooted at `torso_RMD-X10__1_Rotor_1` contains 68 links/visuals: 67 arm
files plus the shoulder rotor from the torso directory. Its three closure
relationships are entirely internal; no closure crosses the selected subtree.

## Reproduce

Use Python 3.12 and Node with this repository's dependencies installed. Keep
preparation dependencies in a separate environment; none are browser runtime
dependencies.

```sh
python3.12 -m venv /tmp/annora-dropbear-preparation
/tmp/annora-dropbear-preparation/bin/pip install -r examples/dropbear/requirements-preparation.txt

# Arm gate first: data, display derivation, GLB, then the unchanged importer.
/tmp/annora-dropbear-preparation/bin/python examples/dropbear/fetch-assets.py
/tmp/annora-dropbear-preparation/bin/python examples/dropbear/prepare-geometry.py
node examples/dropbear/generate.mjs --arm
node scripts/import-model.mjs --source examples/dropbear/arm/model.glb --definition examples/dropbear/arm/import-definition.json --out content/models/dropbear-arm

# Fetch all 668 referenced meshes only after the arm gate is accepted.
/tmp/annora-dropbear-preparation/bin/python examples/dropbear/fetch-assets.py --all
/tmp/annora-dropbear-preparation/bin/python examples/dropbear/prepare-geometry.py --all
node examples/dropbear/generate.mjs
node scripts/import-model.mjs --source examples/dropbear/whole/model.glb --definition examples/dropbear/whole/import-definition.json --out content/models/dropbear

node --test tests/dropbear-model.test.mjs
```

Importer destinations must be absent. For a subsequent rebuild, import into a
fresh output directory and review it before replacing a prepared package. The
fetcher checks existing source bytes against the pinned inventory and rejects a
hash mismatch. Preparation caches derived files by source and script hashes.

## Geometry preparation and identity

`source-manifest.json` records the path, pinned remote location, byte count and
SHA-256 of every source file. The complete data inventory is approximately
188 MB. `source-robot.json` preserves the original link tree, joint limits,
origins, axes, visual scales and all additional closure declarations.

The original STL files stay unchanged. Display-only preparation removes duplicate
and degenerate facets, performs semantic quadric decimation and partitions
conflicting edge uses into coincident draw surfaces. The arm proof and whole
robot have separate derivations, so tuning the full robot never changes the
accepted arm proof.

Long CAD extrusions resist the first decimator. For the whole robot, the fallback
uses [MeshLab's quadric edge collapse](https://pymeshlab.readthedocs.io/en/latest/filter_list.html#meshing-decimation-quadric-edge-collapse)
with topology, normal and boundary preservation, starting from the cleaned source
mesh. A source-envelope check increases the facet budget when a small connector,
cover or other feature would shrink excessively. This is display geometry and is
not a manufacturing substitute.

`geometry-report-arm.json` / `geometry-report.json` record source and derived
hashes, facet counts, source/display bounds, actual method and repair surfaces.
Every partition retains its original visual identity and shares one separation
offset with the other partitions of the same source visual. The curated browsing
tree is root → systems → subassemblies → components; it does not present hundreds
of raw fixed URDF joints as customer navigation.

The URDF's extremely deep static joint chain exceeds the generic importer's
128-level hierarchy limit. It is baked offline into exact world transforms and
one animated shoulder pivot. `arm/source-transforms.json` and
`whole/source-transforms.json` retain all original link frames, source-to-display
mapping, all 27 closure frames, parent/child relative transforms and the display
pivot matrix. The importer limit is unchanged. Neutral matrices are checked
before and after GLB export within `3e-6` metres/matrix components.

## Units, motion and presentation

STL coordinates are millimetres. Each source visual's URDF scale of `0.001` is
retained exactly once; URDF origin translations remain metres. A display wrapper
converts source Z-up into Y-up. A documented floor translation grounds the model
without modifying any relative source transform.

Only `LH_yaw` is animated. The complete source left-arm subtree swivels 8 degrees
about the declared shoulder axis and returns to its exact neutral pose in
2.5 seconds. Every internal elbow, tendon and neck joint is held. The three
internal arm closure relationships therefore retain their relative geometry
throughout the action. This does not solve closed-chain constraints or demonstrate
elbow articulation, grasping, balance, walking, torque or collision clearance.
The raw closure declarations remain evidence to review, rather than a claim of
physical simulation.

The authored 20-second tours are `dropbear-arm-proof` and `dropbear-showcase`.
The full robot tour locates the shoulder, separates structural systems, shows the
linkage in Linework/flat emphasis, restores the assembly and demonstrates the
small whole-arm swivel. The visible presentation describes the restrained motion
accurately. Engineering finishes distinguish structure, drives, connections,
machined links and covers. Accent color and render-mode interaction remain the
existing Explorer's responsibility.

## Release gates

- Inspect the complete neutral arm, source calibration, Engineering and Linework
  before using the complete robot. The arm gate is registered only through its
  standalone query route, rather than a public model selector.
- Check complete source visual coverage and stable IDs, all 27 closure records,
  authored joint limits, exact return and source-relative closure preservation.
- Check root/system/subassembly browsing, selection, isolation, staged separation,
  restore, operation and the eight-shot tour using the unchanged runtime.
- Inspect desktop and mobile framing. Both source models are tall and narrow, so
  normalized width is intentionally smaller than a wide machine's setting.
- Keep actual asset sizes and facet counts in `conversion-report.json` and
  `content/models/*/preparation-report.json`. A target is not a measured frame rate.
- The complete robot retains hundreds of independent source visuals and repair
  surfaces. Engineering draw-call cost still needs actual benchmarking. No
  existing LOD, physical-phone qualification or ordinary-PC result is implied by
  successful import. Record those results at the host delivery gate.

The model test verifies byte identity, complete coverage, repaired surface hashes,
consistent separation, prepared output identity, the single source-axis action,
neutral recovery and closure-relative invariance. It does not replace visual
calibration or device performance checks.
