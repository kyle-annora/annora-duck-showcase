# Hexapod display package

This package adapts the six-legged [ggldnl Hexapod hardware](https://github.com/ggldnl/Hexapod-Hardware/tree/f8ee8084d48470283d5ca23394d5a4b9590ad9e8) for the existing generic Explorer. It retains every source visual instance, link frame, joint origin, joint axis and visual scale. The presentation adds authored finishes, semantic groups, radial separation and a short single-leg action.

Model/root ID: `hexapod`. Tour ID: `hexapod-showcase`. Operation clip: `HexapodLegReach` (2.5 seconds). Tour: eight 2.5-second beats, 20 seconds total. The source hardware is CERN-OHL-W-2.0; the original license and modification notice accompany the prepared package.

## Source and reproducibility

The hardware pin is `f8ee8084d48470283d5ca23394d5a4b9590ad9e8`. `source-manifest.json` records the SHA-256 and byte count of the original URDF, license, README and all 11 referenced STLs. `source/` retains these original bytes. No upstream software is executed. Duplicate collision references are excluded from the display model.

Run from the repository root after `npm ci`:

```sh
python3 examples/hexapod/fetch-assets.py
python3 -m venv /tmp/annora-hexapod-preparation
/tmp/annora-hexapod-preparation/bin/pip install -r examples/hexapod/requirements-preparation.txt
/tmp/annora-hexapod-preparation/bin/python examples/hexapod/prepare-geometry.py
node examples/hexapod/generate.mjs
npm run import:model -- --source examples/hexapod/model.glb --definition examples/hexapod/import-definition.json --out content/models/hexapod
node --test tests/hexapod-model.test.mjs
```

`authored-tour.json` is a hand-authored input and is not replaced by the generator. Registration and showcase/export configuration live outside this package.

## Geometry and identity

The source graph contains 72 links, 71 joints (18 revolute and 53 fixed), and 72 visual instances. Its 11 unique STL assets become 14 unique display geometries and 92 mesh instances. Source visual IDs stay stable even where a visual requires several coincident display surfaces. `component-map.json` maps every displayed mesh back to its source link, visual index, path and source visual ID.

The offline preparation reduces repeated servo and electronics meshes while retaining low-density brackets and leg profiles. A source STL may combine touching solids with edges used by more than two facets. Such conflicting uses are partitioned into coincident display surfaces; every prepared facet is retained, with no importer exception or relaxed topology rule. All surfaces belonging to one visual retain the same origin and separation offset. `geometry-report.json` records original and derived bounds, facet counts and hashes. This is lightweight display geometry, not manufacturing data.

The source URDF uses metres with a `0.001` visual scale for millimetre STLs. One outer rotation maps source +Z up to display +Y up. A shared floor translation places the authored stance above the stage without changing any relative frame. Resting display bounds are approximately 503 × 143 × 435 mm. The default camera direction is `[1.5, 1.25, 1.6]`; normalized width is 5.2.

## Groups and presentation

The root contains `hex-body` and `hex-leg-1` through `hex-leg-6`. Body children are `hex-body-structure` and `hex-body-electronics`. Each leg has `-coxa`, `-femur` and `-tibia` children. The source leg order is front right, middle right, rear right, rear left, middle left, front left.

The curated finishes distinguish pale printed parts, graphite servos/battery, structural metal and electronics. They describe the display presentation and do not assert the hardware's exact production finish. Body layers separate vertically; legs separate as intact modules on staggered radial tracks. They do not detach servo internals or imply an assembly procedure.

The tour introduces the whole structure, focuses a leg, shows the single-leg action, opens the body, separates the six modules, switches to flat linework, restores the assembly, and ends ready for exploration. Motion, camera and highlight timing are separate tracks.

## Authored stance and motion

The hardware source exports joint coordinates in servo space. Two additional pinned sources were inspected for the numeric geometry and coordinate convention only:

- [Controller configuration](https://github.com/ggldnl/Hexapod-Controller/blob/0f68c0c15e1d194675c294022baa5efbade28f6a/hexapod/config/config.yml): coxa 68 mm, femur 76.7 mm, tibia 99.6 mm, stance radius 155 mm, standing height 80 mm; servo direction and tibia trim facts.
- [Simulation adapter](https://github.com/ggldnl/Hexapod-Simulation/blob/fc03ebf8b222031c40dc003c95f96d7f96302cf9/simulation/viser/interface.py): calibrated servo degrees are converted directly to radians for the named URDF joints.

Our own planar two-link calculation gives a display home of coxa 0°, femur 14.184444°, tibia -66.105581° for each leg. It is an independently computed pose using declared source dimensions, not a measured physical calibration. The source leg lower bounds align in this stance. The floor is positioned from transformed display bounds, so this is not a precision foot-contact or ground simulation.

Only the front-right leg moves. The femur lifts and the tibia reaches, then every mesh returns to its exact start transform at 2.5 seconds. The clip has 18 source-joint quaternion tracks sampled at 60 Hz; the remaining five legs are held. All samples obey the URDF limits and the narrower -120° tibia lower limit declared by the controller configuration. Source effort/velocity placeholders are not presented as hardware specifications. No firmware code, walking cycle, coordinated tripod gait, load model, collision simulation or balance claim is included.

`motion-curves.json` records degree values and limits for every sample. At the mid-action pose, a tracked front-right tibia vertex rises about 37 mm and reaches about 35 mm horizontally relative to its start. The tests independently check source-frame world matrices, sample limits, movement isolation and exact restoration at both endpoints.

## Preparation results and validation

| Measure | Result |
| --- | ---: |
| Referenced source triangles | 517,230 |
| Referenced display triangles | 248,656 |
| Prepared meshes / unique geometries | 92 / 14 |
| GLB bytes | 5,471,700 |
| GLB gzip bytes | 964,423 |
| Crease data gzip bytes | 293,158 |
| Silhouette data gzip bytes | 533,976 |

The generic importer passes unchanged and preserves the GLB SHA-256 `1f2eefe0a0bdffcd09b70f4850a955a225f7974801dfc15122e3a52b818081e0`. Its report retains the warning above the 200,000-triangle soft budget. Compressed transfer size is below the 5 MiB target. These are package measurements, not ordinary-computer or phone frame-rate benchmarks; browser and physical-device qualification remain separate release checks.

Focused tests verify all original source hashes, derived surface hashes and facet coverage, all 72 source visual instances, independent URDF-frame reconstruction, group coverage, retained source scales, all 18 joints, motion limits, unchanged other legs and exact endpoint restoration. `content/models/hexapod/preparation-report.json` records the importer results and every prepared asset hash.

## License and modifications

Keep `LICENSE.txt` with redistribution. Annora's modifications are dated **2026-11-03**: simplification, topology partitioning, display materials, grouping, separation and illustrative motion. The modified covered source is licensed under CERN-OHL-W-2.0.

**Modified Source Location:** [public Hexapod preparation sources](https://github.com/kyle-annora/annora-duck-showcase/tree/main/examples/hexapod). This location includes the original hardware files, derived display STLs, conversion scripts, source mappings and reports needed to inspect and reproduce the display adaptation. Preserve this Source Location notice when redistributing a standalone prepared model.

The upstream hardware is subject to CERN-OHL-W-2.0; its original license text is in `source/LICENSE.md`. `conversion-report.json` separately records the original and modified notice hashes. This package does not include upstream firmware implementation.
