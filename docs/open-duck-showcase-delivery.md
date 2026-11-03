# Open Duck showcase delivery

Date: November 2, 2026. Independent preview, not a replacement for the main Annora deployment.

## Review links

- [Interactive showcase](https://kyle-annora.github.io/annora-duck-showcase/showcase/)
- [Film and keyframes](https://kyle-annora.github.io/annora-duck-showcase/showcase/media/)
- [Source repository](https://github.com/kyle-annora/annora-duck-showcase)
- [Full Explorer](https://kyle-annora.github.io/annora-duck-showcase/?model=open-duck)

Choose **Play showcase**, then pause, replay or scrub backwards. Open Parts to
select a component; Inspect enters its assembly. The parent action returns one
level. The reset action restores and reframes the whole robot. Manual separation
and the 2.5-second gesture live under Assembly actions, outside the active tour.

## Delivered scope

The 20-second presentation has eight 2.5-second beats: Meet, Head, Open, Assembly,
Detail, Restore, Motion and Explore. Camera framing precedes delayed emphasis;
outer panels separate before inner modules. A brief technical view introduces
crisp linework and selective flat Ember. Exact source poses return before the
robot performs its short greeting. Playback ends once; free exploration remains
available. Camera input takes control, and resuming is explicit.

The independent host uses the existing JSON controller and a single embedded
Explorer. It does not add a second live renderer or animation clock. A generic
optional separation profile supports staggered timing; existing model defaults
retain their previous interpolation. The main repository and existing customer
projects have not been edited by this release.

The host includes Engineering, Linework and Flat highlight; Light/Dark; ten
accents and a custom color; a switchable grid; and the existing quality presets.
Busy, disabled and selected states are distinct. Hover is a preview, selection
is separate from entering an assembly. Portrait uses a compact details sheet
with real scene space reserved for the caption and transport.

Reference lock: Teardown for presentation choreography and instrument restraint,
Oxide for compact assembly interaction, Atlas for clear technical lines. Refero
Oxide and teenage engineering references informed surface restraint. See the
[approved plan](open-duck-showcase-plan.md). The Teardown bee model is not used.

## Source and preparation

| Item | Final evidence |
| --- | --- |
| Source | Open Duck Mini v2, Antoine Pirrone and contributors, Apache-2.0 |
| Distribution revision | `dfdb84ef3ae2405e5f115b32f48471331dc65d78` |
| Source inventory | 46 STL files; 45 referenced by URDF; 131 visual instances |
| Kinematics | 21 links; 20 joints; 16 revolute joints |
| Referenced triangles | 2,423,386 source → 356,153 display |
| Display representation | 170 meshes, 57 unique geometries, all 131 source visuals retained |
| Compressed GLB | 2,328,592 bytes, about 2.22 MiB |
| Source clip | `DuckPresentation`, 5 seconds; scan and gesture sections |
| Manual playback | Same clip compressed into a 2.5-second action |
| Neutral checks | Exact rigid transforms at source times 0, 2.5 and 5 seconds |

The source head contained non-manifold contacts. Derived facets were partitioned
into coincident rigid display surfaces so the normal importer could validate
them. No validator was weakened. Partitions of one source visual share the same
explode vector and remain together. Full source head detail was retained after
the first visual review; this increased the display geometry from about 311k to
356k triangles. Shells use illustrative coated white, with graphite mechanisms
and metallic detail. They are not verified engineering material specifications.

Reproduction commands, asset hashes, raw source, preparation dependencies,
source-to-display mappings and license notices are in
[`examples/open-duck/README.md`](../examples/open-duck/README.md). All source
bytes remain preserved. Conversion tools run offline; the browser does not
load a CAD/robotics engine or the upstream viewer application.

## Verification

`npm run verify` runs package/drawing checks, the shared regression suite and the
production build. The final suite passed 580 tests, with one pre-existing optional test skipped and no failures.
Final checks also include source hashes, complete visual
identity coverage, within-limit joint curves, neutral poses and reversible
separation. The normal regression suite includes Explorer lifecycle/host control,
Apollo/crank behavior, drawing version identity, Studio/Product Room releases
and inquiry/quotation review guards.

Browser review covered desktop 1440 × 900, portrait 390 × 844, compact 320 × 780
and landscape 844 × 390. Checked tour completion, chapter seeking, backward
scrub, pause/resume/replay, component selection/Inspect/parent return, manual
separation/restore, short gesture, rendering modes, appearance, custom accent,
grid and horizontal overflow. Custom `#b66bff` was verified to match the host
control, color picker and actual renderer outline. Portrait captions no longer
overlap the robot, and the narrow parent action no longer overlaps Details.

A benchmark layout bug was found during verification: selecting the measured
assembly expanded the inspector after the camera fit, cancelling the run. The
benchmark now fits after its selection callback. This affects measurement setup;
ordinary Explorer interaction is unchanged.

## Measured performance and limits

Measurements below are **this device only**: MacBook Pro, Apple M5 Pro, 48 GB,
macOS 26.5.1, Chromium in the Codex in-app browser, 1280 × 720 viewport, Balanced
quality. Model and scripts were served locally and warm; these are not network
loading or ordinary-device certification results.

| 12-second orbit / separate / restore check | Median FPS | p95 frame interval | Median draw calls | Frames > 50 ms |
| --- | ---: | ---: | ---: | ---: |
| Engineering, selected head assembly | 59.88 | 17.6 ms | 517 | 0 |
| Linework | 59.88 | 17.6 ms | 4 | 0 |

Raw measurements: [Engineering](media/performance-engineering-balanced.json) and
[Linework](media/performance-linework-balanced.json). Draw counts include all
passes. CPU submission time is not GPU timing. The scenario tests orbit,
separation and restoration, not the operation clip. Line data is loaded on demand;
the shared runtime retains pixel caps, adaptive quality and idle/hidden handling.

The package exceeds the initial 200k triangle target in order to retain readable
head details. A physical ordinary laptop and phone have not been tested. Mobile
viewport testing demonstrates layout, not phone GPU performance. Qualify those
devices before treating this as a production hardware baseline; Performance
quality remains available for a lower pixel budget.

## Media

- [Silent MP4 film](media/annora-open-duck-20s.mp4): 960 × 600, 30 fps, 600 frames, exactly 20 seconds.
- [WebM master](media/annora-open-duck-20s.webm).
- [Looping GIF](media/annora-open-duck.gif): 640 × 400, 12 fps.
- [Hero](media/open-duck-hero.png), [exploded layers](media/open-duck-exploded.png), [technical detail](media/open-duck-detail.png).

Every frame is rendered from the same prepared robot and authored tour. The
separate export page temporarily owns the existing scene's clock at fixed 30 fps;
it uses native WebCodecs, not another animation runtime. It aborts on hidden-tab
capture, supports cancellation and disposes failed preparations. The master and
MP4 decode successfully; a contact sheet was inspected for missing geometry,
framing, clear labels and exact restoration. The film is silent by design.

## Publication and next review

The current CLI authorization can publish repository content but cannot create
Actions workflows. This independent preview therefore uses a validated `gh-pages`
branch, with `npm run deploy:preview -- --repo https://github.com/OWNER/REPOSITORY.git`
for repeatable publication. The pinned workflow is retained in
`scripts/deployment/pages.workflow.yml` for later owner activation. A fresh source
snapshot separates this experiment from the main repository history.
The deployed `release.json` records its exact source revision.
Published runtime source: `e0417e776e7ee8c3221b61dc36b37d25e1d7175e`.
The GitHub Pages build succeeded and `release.json` matches that revision.
Hosted checks passed for the repository subpath, embedded model assets, complete
20-second tour, error-free console, video metadata/playback readiness and mobile
layout. At 390 px the document width remained exactly 390 px with no horizontal
overflow. This delivery record was updated after publication; the subsequent
source commit changes documentation only. No backend,
customer records, production telemetry, physics engine or account integration
was added. The gesture follows source joint axes and limits; it is not balanced
walking.

Next feedback should focus on the hero, the order/readability of the layered
reveal, and the head/motion close-ups. Hardware qualification remains a separate
explicit gate. Reuse the successful preparation pipeline and optional stagger
policy after reviewing this independent presentation.
