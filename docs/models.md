# Model preparation and package contract

## Supported input

Use a self-contained GLB 2.0 containing rigid, uniquely named mesh nodes. Preserve
an assembly's meaningful node hierarchy before export. Input must have finite
positions and transforms, valid triangle geometry and unambiguous animation
bindings. The CLI rejects unsupported assets with an explanation rather than
silently dropping geometry or animation.

This is not a STEP/IGES/CAD converter or a general mechanical solver. Input must be untextured, with one material/primitive per rigid mesh and no
interleaved attributes or scale-animation tracks. Skinning, morph targets,
external resources and compressed/instanced inputs are unsupported. Convert or
simplify these outside the importer; it does not silently discard them. Inspect
the CLI's validation message for the specific preparation requirement.

## Import

```sh
npm run import:model -- --source examples/bench-vise/model.glb --definition examples/bench-vise/import-definition.json --out content/models/my-vise
```

Output is written only after validation succeeds. Existing output is refused;
use a new directory to review a changed package. The original GLB bytes are
preserved. Gzip, crease lines and compact silhouette topology are deterministic.
`--help` lists current options and limits. Keep source, definition, tour and
license under version control so a package can be reproduced.

A minimal definition for a GLB with mesh nodes `Housing` and `Cover` is:

```json
{
  "schemaVersion": 1,
  "id": "sample-assembly",
  "title": "Sample assembly",
  "shortTitle": "Sample",
  "provenance": {
    "author": "Your organization",
    "license": "MIT",
    "attribution": "Your organization, 2026",
    "description": "An original illustrative assembly.",
    "note": "Presentation geometry; not manufacturing CAD."
  },
  "licenseFile": "LICENSE",
  "groups": [
    {"id": "housing", "title": "Housing", "meshNames": ["Housing"]},
    {"id": "cover", "title": "Cover", "meshNames": ["Cover"], "explode": [0, 0.15, 0]}
  ]
}
```

`licenseFile` and optional `tour` resolve relative to the definition. An original
local model may omit `provenance.url`; do not invent a public source URL. The
included [bench-vise definition](../examples/bench-vise/import-definition.json)
shows authored groups, leaf descriptions, finish families, operation stages and
a tour. Each mesh belongs to one group; unknown, duplicated or omitted mappings
must be resolved before import. Source units govern authored separation offsets.

## Output manifest

A prepared directory contains `manifest.json`, original `model.glb`, gzip,
`metadata.json`, crease and silhouette binaries with metadata, a license and
optionally `tour.json`. The manifest declares:

- `schemaVersion`, stable `id`/`rootId`, title and short title;
- local `assets` paths for the model, metadata, derived data and license;
- `view.direction`, `normalizedWidth`, two camera labels and optional short facts;
- `provenance` author/license/attribution/description/note and optional source URL;
- optional declarative `presentationPolicy` and authored `tour` path.

Paths must remain inside the repository, including resolved symlinks. The
configuration validator checks source identity, hierarchy, operation and tour
references. Build checks verify derived hashes and compression. Do not manually
edit generated binary ranges. Re-import changed geometry, and curate names,
material families, descriptions and offsets in the source definition.

## Motion and guided tours

An operating package declares a real source animation clip and its duration.
`operation` stages explain meaningful positions in that clip. Authored clips
illustrate stated motion; they do not establish mechanical accuracy, constraints,
force, collision or manufacturability. The bench-vise sample explicitly documents
its assumed screw lead and travel.

A tour is declarative JSON, with chapter durations, scope/selection IDs,
rendering treatment, explosion interval, camera target/direction, highlight IDs
and short English captions. Cues change those values at authored times. Operating
chapters sample the existing source clip through authored passes. The sample
[tour](../examples/bench-vise/authored-tour.json) is a complete 60-second example.
Do not auto-generate unsupported engineering claims from geometry alone.

## Practical budgets

The import guard is 64 MiB source, 2,000 meshes and 1,000,000 triangles, with
additional per-geometry, animation and derived-output limits. These are rejection
limits, not performance recommendations. Warnings begin above 200,000 triangles
or 5 MiB compressed model data. Prefer fewer draw calls, repeated geometry,
embedded rigid clips and small downloads. Test with reduced quality and a mobile
viewport. Apollo is an intentionally large optional sample; it is not the
recommended size for every customer project.


### Optional short actions

Set `presentationPolicy.actionDuration` in the prepared manifest to the manual
presentation cycle length in seconds (finite, 0.5–10). The bundled models use 2.5.
Source clip metadata and geometry stay unchanged. Without this override,
operation retains the source duration; separation defaults to 2.5 seconds.

Set `playback: "steps"` at the top of a tour to hold at each chapter endpoint.
Omit it or use `"continuous"` for the original continuous player. Each chapter's
`duration` controls its active time independently; the bundled short tours use
2.5 seconds. Use `previewAt: 0` for a ready-to-play start and choose `settledAt`
for reduced-motion visitors. Keep a stable camera during causal motion; use a
separate chapter for decomposition. Restore separation to zero before changing
assembly scope. Scope transitions prepare the next view before playback.

The [short-action review](short-actions.md) records the reference decisions,
transport behavior, API additions and validation boundaries.

### Optional layered separation

A model can reveal its root assembly in authored layers without adding a second
animation clock. Add normalized intervals addressed by existing navigation IDs:

```json
{
  "presentationPolicy": {
    "explosion": {
      "separationProfiles": {
        "outer-shell": [0, 0.4],
        "drive-module": [0.3, 0.85],
        "sensor-board": [0.55, 1]
      }
    }
  }
}
```

Each interval needs finite `0 <= start < end <= 1`. Part identities override their
nearest authored subassembly/group/root interval. An omitted interval or `[0,1]`
retains the existing linear pose mapping exactly. Narrower authored intervals
use smooth local progress, holding the source position before `start` and the
complete offset after `end`. Reverse scrubbing samples the same function, so
every part retraces its path and returns to its immutable source transform.

These timings apply to the whole root presentation. Inspecting a narrower
assembly gives its separation a complete, immediate local range instead of
waiting for another group's reveal. Final vectors still come from the existing
offset rules. Profiles do not animate geometry, alter the operating clip or
allow operating an exploded model. Invalid identities/ranges fail validation
before loading or publishing the package; timing changes alter its revision.
