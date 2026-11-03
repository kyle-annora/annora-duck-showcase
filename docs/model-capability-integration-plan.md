# Model capability inventory and main Explorer integration

Review date: November 3, 2026. Status: proposed integration; no main application
changes are included in this audit.

The robot studies extend the existing Annora Explorer. Consolidate their small
runtime additions, prepared models and presentation tools into the main project
in separate stages. Product Room and Studio need a product registration layer
before a new model can participate in the complete commercial workflow.

Compared baselines: main `ab206fc20eb96d8c61b8bf341a820ac00e7ae609` and robot
Showcase `3005c25a040c488397c1f487a507aa3b7b6827fb`. Both matched their remote
main branches at audit time. Existing uncommitted main documentation is preserved.

## Inventory and readiness

There are nine prepared model packages across the two repositories. Main
registers four. Showcase registers eight, including an arm validation fixture;
its customer selector exposes three robots. Bench vise remains an import proof.
An available model package is distinct from a registered Explorer example and
from a reviewed Room product with an inquiry configuration.

| Package | Verified use | Important boundary | Integration role |
| --- | --- | --- | --- |
| Crank slider | 2.5-second presentation of a source cycle; 7.5-second tour; complete sample buyer/seller flow | Authored kinematics, not contact or force simulation | Keep default and commercial regression sample |
| Apollo hatch | Nested latch inspection, structural separation and 17.5-second tour | No operating mechanism clip; intentionally heavy | Complex assembly regression |
| Connecting rod | Actual CAD body, linked STEP/PDF, regions and drawing versions | Feature regions are not separate manufactured parts | Drawing and quotation reference regression |
| SK08 shaft support | Actual CAD body, seven feature regions, versioned technical reading views | Demo drawing B is a workflow edition, not a supplier engineering revision | Drawing authoring and history regression |
| Bench vise | Reproducible import, screw/jaw clip and 60-second tour | Authored screw/travel assumptions; not currently registered in main | Independent onboarding proof |
| Open Duck Mini v2 | 131 source visuals; 170 display meshes; 16 revolute joints; 20-second presentation | Illustrative source-joint gesture, no walking or balance | First presentation integration candidate |
| Hexapod | 72 source visuals; 92 display meshes; 18 revolute joints; 2.5-second leg reach and 20-second tour | Computed display stance; one leg moves, no gait solver | Joint-chain and radial reveal example |
| Dropbear arm proof | 68 source visuals; 86 display meshes; neutral and internal closure preservation | Whole shoulder subtree swivel only | Internal validation fixture |
| Dropbear humanoid | 668 source visuals; 728 display meshes; 27 recorded closures; 20-second tour | 8-degree shoulder swivel; internal joints held, no closed-chain solver | Large-model and qualification example |

Engineering, Linework, Flat highlight, custom accents, Light/Dark, grid, short
actions and tour transport already exist in main. The robot work adds preparation
evidence, presentation content and the reusable increments below; it does not add
a separate rendering engine.

## Reusable increments

| Capability | Current implementation | Consolidation boundary |
| --- | --- | --- |
| Robotics preparation | Three source-specific offline fetch, transform, geometry, hierarchy and motion adapters | Document a common preparation contract; keep adapters independent |
| Source identity | Pinned bytes, source-visual to display-surface mapping, original frames and closure evidence | Retain source pins, licenses, mappings and reproducible reports |
| Layered separation | Optional normalized timing intervals inherited by semantic hierarchy | Shared runtime and validation; omitted intervals preserve old behavior |
| Compact presentation host | API-based scene, scoped navigation, chapter copy, preferences and safe robot switching | Optional Showcase surface using the existing controller |
| Matching media | Fixed-frame model/tour capture with WebCodecs; offline MP4/GIF/keyframe preparation | Internal authoring utility, separate from business publication |
| Evidence | Hash checks, transform/limit/return tests, desktop/mobile review and local performance JSON | Reuse evaluation gates; qualify each new product and device |

These adapters do not provide arbitrary URDF upload with automatic semantic
grouping, materials, mechanically correct motion and finished films. Those choices
are authored and reviewed. The browser does not need a CAD or robotics kernel.

## Minimal runtime migration

Only seven files differ under `src/explorer/`. The normal importer, geometry
preparation library, dependencies and lockfile are unchanged.

| Files | Addition to migrate |
| --- | --- |
| `app.js`, `workspace-layout.css` | Opt-in `embed=1&chrome=none` shell and neutral viewport insets |
| `appearance.js` | Additional `coatedWhite` finish family |
| `model-state.js`, `model-validation.js` | Reversible, nearest-ancestor `separationProfiles` and strict interval/identity validation |
| `scene.js` | Apply those profiles to pose sampling/bounds; fit the benchmark after selection changes layout |
| `controller.js` | Add authored chapter `title` and `caption` to existing `getTour` descriptors |

`scripts/lib/project-config.mjs` must also accept and validate the optional
separation field before the robot packages can register. Retain existing importer
limits. The same scene owns rendering, operation, separation and presentation time.

The four configured main packages and bench-vise fixture are byte-identical
between repositories. Preserve those bytes and their exact revisions during the
first migration. Re-generate `src/generated/`; never copy it by hand.

The independent repository has fresh-root history, different project identity and
defaults, and a different deployment workaround. Do not merge it wholesale. Keep
main's Kinetic default, routes, storage namespaces, existing customer references
and automatic Pages workflow. Give the consolidated runtime an explicit release
tag while preserving compatible JSON commands.

## One core with several application surfaces

```text
Prepared model packages and presentation assets
                       |
             One Explorer runtime
                       |
          Public JSON controller and client
             /        |          \
      Explorer    Showcase     Product Room / Studio preview
                                     |
                         Reviewed product releases
                                     |
                         Versioned customer projects
```

A Room should reuse its existing viewer/client to start a presentation. Avoid
embedding a second Showcase scene beside the Room scene. Showcase can remain a
dedicated presentation route; the controls and surrounding content differ by
host, while the model package, controller and player are shared.

For now, keep source preparation and full-resolution masters in the model lab,
with pinned references and redistribution notices. Make prepared example packs
opt-in for main builds. Do not add hundreds of megabytes of raw robot source to
every new customer project or put all validation fixtures in its product menu.

## Product Room and Studio gaps

The generic Room viewer already captures exact model revision, selected part and
active tour/chapter. It can reopen a part or chapter through the public API.
Camera capture is not a replacement for this context: `captureView` rejects an
active tour or detached intermediate pose.

However, the current complete ordinary Room/Studio workflow is authored around
the crank sample. Studio seed/domain/repository logic, static Room release
installation, persistent inquiry entry and project-to-3D return include that
sample's identity. The drawing workflow has its own version-aware adapter and
must remain intact. Robot registration alone does not remove these constraints.

Studio's current part list also flattens groups and components, omitting curated
subassemblies. Generalization must use the shared hierarchy descriptors, not
reconstruct a flat robot list. Studio currently stores a default render style;
it has no reviewed tour/media publication profile or public export API.

Introduce a prepared-product registration that resolves model ID and exact
revision, authored hierarchy, permitted documents, optional drawing package,
inquiry configuration and reviewed Room release. Add a separately versioned
presentation reference for a prepared tour, chapter and managed media set.

Studio can initially select, preview and publish existing approved presentations.
Joint animation, camera timeline editing and arbitrary CAD import remain later
authoring work. No drawings, specifications or commercial claims should be
invented for robots that have only presentation assets.

## Proposed implementation stages

1. **Consolidate the optional core additions.** Backport the runtime/schema
   changes and focused tests. Verify original package hashes, existing routes,
   controller compatibility and one active scene. Preserve current main behavior.
2. **Integrate Open Duck as one optional presentation.** Add its exact prepared
   package, registry entry, host and evidence. Keep the current default. Validate
   the 20-second tour, 2.5-second action, selection/Inspect/return, manual takeover,
   custom accent and mobile. Then add Hexapod; keep Dropbear optional and subject
   to its heavier loading/device gate.
3. **Generalize products and connect one more Room.** Replace sample-specific
   gates through product registration. Use one additional presentation-only
   product to prove selected part/chapter → reviewed inquiry → seller quotation
   and modification → return to the pinned 3D reference. Drawings stay optional.
4. **Add reviewed Studio presentation selection.** Choose prepared tour/media,
   preview and publish an immutable release. Customer projects retain their
   original model, Room, presentation and drawing references. Broader animation
   authoring follows after this path works.

Model revisions currently include manifest, geometry, derived files, license,
policy and tour. A tour-only edit can therefore change a model revision. Do not
change that hash scheme or silently overwrite old packages during consolidation.
Preserve historical bundles; design any future separation of model and
presentation revisions as an explicit migration.

## Evaluation and handoff

Use main's existing evaluation matrix, augmented with:

- Original Kinetic/Apollo behavior, existing project stores, quotation review
  boundaries and old model revisions remain valid.
- SK08/linkrod drawing A/B, mapping and overview references remain exact; old
  quotes/discussions retain A while a reviewed new quote can reference B.
- Model switching during loading/line preparation rejects stale results, preserves
  viewer preferences and resets selection, isolation and playback.
- One renderer/clock; no hidden Room/Studio scene continues playing.
- Source visual coverage, neutral transforms, joint limits, exact return,
  package hashes and license/source notices remain checked.
- Unsupported drawings, tours or motion are omitted through capabilities.
- Desktop, 390-pixel portrait, compact portrait and landscape controls remain
  reachable; target-device and cold-network qualification are recorded separately.

Maintain one inventory record per exact package revision: source pin/license,
geometry counts/transfer cost, hierarchy, supported rendering/operation/tour,
drawings, Room readiness, preparation method and actual evaluation evidence.
Organize future agent guidance around source preparation, presentation authoring,
host integration and release evaluation, with the contracts as the authority.
Do not require extra skills merely to consume a prepared model through the API.

The existing robot release has 598 passing tests and one optional skip. Those
results apply to its own build, not a future merged main release. Four raw new
performance reports record a **1280 × 720** viewport: Engineering DPR 1.25 and
adaptive Linework DPR 1.47. Both models recorded 16.7 ms median frame intervals on
the available workstation. Dropbear Engineering still recorded 2,191 draw calls;
its model gzip is 6.26 MiB. Physical ordinary computers/phones, cold-network
loading and operation-clip performance remain unqualified.

## Evidence

- [Current model and host delivery](robot-showcase-expansion-delivery.md)
- [Open Duck preparation](../examples/open-duck/README.md)
- [Hexapod preparation](../examples/hexapod/README.md)
- [Dropbear preparation](../examples/dropbear/README.md)
- [Main architecture](https://github.com/kyle-annora/annora-explorer/blob/ab206fc20eb96d8c61b8bf341a820ac00e7ae609/docs/architecture.md)
- [Main host contract](https://github.com/kyle-annora/annora-explorer/blob/ab206fc20eb96d8c61b8bf341a820ac00e7ae609/docs/integration.md)
- [Main evaluation matrix](https://github.com/kyle-annora/annora-explorer/blob/ab206fc20eb96d8c61b8bf341a820ac00e7ae609/docs/evaluation.md)
