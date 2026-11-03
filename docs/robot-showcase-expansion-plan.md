# Hexapod and Dropbear showcase expansion plan

Status: proposal for review. The published Open Duck experience remains unchanged.

Extend the independent Annora showcase to three robots: Open Duck Mini v2,
Hexapod and Dropbear. Build Hexapod next, validate a Dropbear arm, then expand to
the whole humanoid. Each robot gets its own mechanical story, prepared package
and media while sharing the existing Explorer and transport.

## Scope and sequence

| Subject | Presentation purpose | First deliverable |
| --- | --- | --- |
| Open Duck Mini v2 | Character, enclosure layers and articulated assemblies | Preserve the existing 20-second showcase and links |
| Hexapod | Explain one three-joint leg, then the relationship between six legs | Complete robot with a single-leg action and layered structural tour |
| Dropbear | Explain a dense humanoid through progressively closer assembly views | Detailed left-arm proof before a complete humanoid showcase |

Use the existing silver, graphite and Ember direction, compact floating controls,
crisp linework and optional flat emphasis. Hexapod can emphasize the rhythm and
symmetry of its legs; Dropbear can emphasize exposed structural metal and dark
linkages. Finishes remain illustrative. Keep Light/Dark, custom accents and the
switchable grid.

## Sources and preparation decisions

### Hexapod

Pinned hardware: [ggldnl/Hexapod-Hardware at f8ee8084](https://github.com/ggldnl/Hexapod-Hardware/tree/f8ee8084d48470283d5ca23394d5a4b9590ad9e8),
with [CERN-OHL-W-2.0](https://github.com/ggldnl/Hexapod-Hardware/blob/f8ee8084d48470283d5ca23394d5a4b9590ad9e8/LICENSE.md).

The [source URDF](https://github.com/ggldnl/Hexapod-Hardware/blob/f8ee8084d48470283d5ca23394d5a4b9590ad9e8/hexapod.urdf)
has 72 links and 71 tree joints: 18 revolute and 53 fixed. Its 72 visual instances
reference 11 distinct STL files. Collision references duplicate those visuals and
must not inflate the display-part count. The full tree contains 13 STL and eight
STEP files; referenced STL source bytes total about 7 MB. Binary-header counts
indicate 517,230 referenced triangles before preparation. These are source counts,
not a measured browser package.

Preserve the `0.001` visual scale alongside each URDF origin and joint axis. Check
one calibrated standing pose against the upstream reference before authoring
motion. The [controller configuration](https://github.com/ggldnl/Hexapod-Controller/blob/0f68c0c15e1d194675c294022baa5efbade28f6a/hexapod/config/config.yml)
and [simulation adapter](https://github.com/ggldnl/Hexapod-Simulation/blob/fc03ebf8b222031c40dc003c95f96d7f96302cf9/simulation/viser/interface.py)
show why raw servo degrees and URDF joint angles cannot be treated as identical.

No ready animation clip is supplied by the hardware package. The separate
[firmware](https://github.com/ggldnl/Hexapod-Firmware/blob/a56d397074c383c454e02bee507a7e242474e22a/src/core/gait.hpp)
contains gait generation under GPL-3.0. Initially author a source-joint pose study
in the offline preparation layer. Any later reuse of firmware code or generated
motion must account for that separate source and license. Placeholder URDF effort
and velocity values must not appear as rated-performance UI readouts.

### Dropbear

Pinned hardware: [Hyperspawn/dropbear_hardware at 72b29b7](https://github.com/Hyperspawn/dropbear_hardware/tree/72b29b7fd5d32cae1eb9bca2f16f1f76afca68dd),
with its [MIT license](https://github.com/Hyperspawn/dropbear_hardware/blob/72b29b7fd5d32cae1eb9bca2f16f1f76afca68dd/LICENSE).
The full STEP is 167,373,895 bytes. Left-arm STEP is about 24.1 MB and torso STEP
about 16.7 MB. Keep CAD conversion offline.

The better initial source for explicit identities and transforms is the separate
[MIT Dropbear URDF package at 9bac53d](https://github.com/Hyperspawn/dropbear_urdf/tree/9bac53d0dee196c62620eee9e8a0fa255a0ff5fa).
Its modular description has 101 links and 100 visual STL references, totaling
about 286 MB of source meshes. The granular description has 669 links and 668
visual references, totaling about 188 MB. Fewer modular objects do not imply a
smaller geometry payload. Both use visual scale `0.001`.

Start with the granular left arm: 68 referenced visuals, about 22 MB of raw source.
The shoulder subtree includes the torso rotor in addition to the 67 arm-folder STLs.
The [granular URDF](https://github.com/Hyperspawn/dropbear_urdf/blob/9bac53d0dee196c62620eee9e8a0fa255a0ff5fa/dropbear_granular_urdf/urdf/dropbear.urdf)
also declares 27 additional Gazebo loop closures: three per arm, five at the head
and eight per leg. Record these relationships in preparation evidence; a plain
URDF tree animation does not solve them.

For the first motion, validate the neutral registration and clearance, then
rotate the whole `LH_yaw` subtree modestly and return. All three left-arm closures
are contained within that 68-link subtree; keeping internal relative transforms
fixed preserves those relationships. Do not animate elbow flexion, finger
mechanisms, head linkages or walking until their coupled motion is verified.

Use the MIT hardware and URDF candidates. Exclude motion policies and recorded
rollouts from the separate [PolyForm Noncommercial WBC package](https://github.com/Hyperspawn/dropbear-wbc/blob/7315226fb8ba9b74bca2796ec55a171757cd6d8a/LICENSE)
from this commercial Annora showcase. Do not mix CAD and URDF revisions merely
because their names match; compare the chosen assembly before combining them.

## Hexapod presentation

Target 20–22.5 seconds, with individual actions around 2.5 seconds.

1. Establish the whole robot from a low three-quarter view.
2. Approach one leg and identify its coxa, femur and tibia relationship.
3. Show a single-leg lift, reach and return. Hold the coxa initially so the femur
   and tibia movement is easy to follow; add joint emphasis after the camera settles.
4. Separate source-defined body and electronics layers.
5. Spread the six leg modules radially in staggered, balanced groups.
6. Hold one joint/leg detail in Linework and selective flat Ember.
7. Reassemble along the same paths and return exactly to the standing pose.
8. End with a complete robot and free exploration.

A ninth, 2.5-second tripod coordination beat can follow restoration only after
servo mapping and foot-contact phases are checked. Label it as an authored pose
study unless a validated gait source supports a stronger claim. The initial
release does not require physics or a new inverse-kinematics engine in the browser.

Curate the supported hierarchy as whole robot → body or one of six legs → useful
subassemblies → source display components. The first action must stay inside
verified joint ranges, including the narrower tibia safety range where applicable.

## Dropbear presentation

First review one arm in three views: assembled, separated and technical detail.
Prove source registration, semantic groups, closed-linkage containment and the
short whole-arm swivel before converting the complete robot.

The complete tour can then use eight 2.5-second beats:

1. Establish the complete humanoid silhouette.
2. Approach the reviewed arm with enough torso context to locate it.
3. Separate outer covers where the source assembly actually contains them.
4. Reveal actuator and linkage layers in a controlled composition.
5. Hold a selected connection in Linework and flat Ember.
6. Restore the complete assembly exactly.
7. Perform the verified whole-arm action with internal linkages fixed.
8. Return to the hero view and free exploration.

Do not add a full-body walk to make the presentation appear more capable. More
articulated actions can be separate milestones once loop closure and clearance
are validated. The current hierarchy supports root, system, subassembly and
component levels; curate those levels and retain the original CAD/URDF paths in
source mappings. Arbitrarily deep CAD containment would require a separate
shared-runtime extension.

## Shared host and content architecture

Keep `/showcase/` as the existing Duck entry. Add explicit deep links:

- `/showcase/?model=open-duck`
- `/showcase/?model=hexapod`
- `/showcase/?model=dropbear`

Use one compact selector near the identity and keep one Play showcase primary
action. Each model opens directly; visitors do not need to traverse a gallery
before reaching 3D. Selection, Inspect, parent return and manual takeover retain
their existing meaning.

The shared renderer already supports multiple prepared models. The single-model
assumptions are in the showcase and media/export layer: the fixed Duck ID,
identity, source links, eight-position copy array, duration fallbacks, credits and
gesture labels. Extract these into a validated showcase registry rather than
copying three applications or adding robot branches to the renderer.

Planned content ownership:

| Location | Responsibility |
| --- | --- |
| `content/showcases/registry.json` | Allowed showcase IDs, model/tour references, identity, action wording and media |
| `content/models/<robot>/` | Prepared geometry, supported hierarchy, finishes, separation policy and tour |
| `examples/<robot>/` | Pinned source, offline conversion, joint/closure records, mappings and hashes |
| `src/showcase/` | Shared selection, transport, floating controls and per-mount lifecycle |
| `src/showcase-export/` | The selected model/tour, dynamic timing, credits and filenames |
| `showcase/media/` | Matching media for the selected robot; no substitute Duck assets |

Keep cameras, highlights, durations and mechanical explanations in authored
model content. Store any presentation-copy overrides by chapter ID, never by
array position. Preserve the current Duck copy and existing exported film during
extraction. Read the manual action duration from package/state data rather than
assuming every robot has the same clip length.

Register only validated packages and reject unknown showcase IDs visibly. The
current generic `resolveModel()` fallback must not allow another robot's title
to display Duck geometry. Media and export routes use the same registry and ID.

## Model switching and loading

Only the selected robot's geometry is fetched. Optional line data remains lazy.
Catalog configuration may list all robots, but mobile visitors must not download
three geometry sets. Measure catalog/tour metadata growth as well as GLB size.

A switch owns a new session containing its client, node maps, generation and
cancellation state. Stop playback, disable controls and cancel pending actions;
dispose the old scene through the existing lifecycle, close its client and remove
the iframe before mounting the next robot. Clear selection, expanded branches,
search, queued separation, scrub state, isolation, progress and errors.

Every asynchronous continuation must verify that its session is still current.
This includes recursive tree loading, hydration, selection, catches and finalizers.
A delayed Duck result must not overwrite a newly loaded Hexapod. Failed loading
shows the requested robot and a retry action, with no stale controls or geometry.
Keep one active Explorer scene and one live animation clock.

## Performance and release gates

Initial preparation targets are roughly 200–250k referenced triangles for
Hexapod and a small, independently measured arm package for Dropbear. Aim for
no more than 5 MiB compressed model transfer per initially selected package.
These are preparation goals, not achieved results. Shared geometry reduces
buffer cost; lowering referenced triangles still requires careful simplification.

Retain source identities, axes and silhouette. Profile Engineering draw calls
separately from the already batched Linework path. A whole Dropbear must meet the
existing importer limits and a measured viewing budget before release. Detail
streaming, geometry LOD and new Engineering batching are conditional follow-up
work, not capabilities the present Explorer already provides.

| Milestone | Evidence required before proceeding |
| --- | --- |
| Shared host extraction | Duck's old link, hierarchy, tour, controls and existing media still work |
| Hexapod preparation | Complete visual coverage, correct units/origins, calibrated rest pose and reversible single-leg motion |
| Hexapod showcase | Distinct readable story, exact restoration, pause/replay/reverse scrub/takeover and usable mobile composition |
| Dropbear arm proof | Source correspondence, neutral registration, internal closure relationships, safe subtree action and acceptable geometry/draw cost |
| Whole Dropbear | Complete source mappings, supported hierarchy, clear internal detail and measured package/render budgets |
| Model switching | Rapid Duck → Hexapod → Dropbear switching under slow loads/failures cannot commit stale state or retain old scenes |
| Publication | Full verification, production subpath checks, model-specific film/GIF/keyframes and English release evidence |

Review 1440×900, 390×844, 320×780 and 844×390 layouts. Keep touch controls usable,
reserve real caption space and avoid masking the selected mechanism. Check
reduced motion and hidden-tab behavior. Repeat the standard render benchmark
for each model and style; the Duck's M5 result does not certify another robot or
an ordinary laptop. Physical ordinary-computer and phone qualification remains
an explicit release gate for performance claims.

## Implementation order and deliverables

1. Extract shared host identity, routing, copy and export assumptions; add session
   isolation tests while preserving Duck.
2. Prepare Hexapod and review its hero, single-leg mechanism and mobile frame.
3. Complete Hexapod choreography, switching and media; publish for review.
4. Prepare and review the Dropbear arm proof, including closure evidence.
5. Expand to the whole humanoid only after that proof passes; author its tour and
   measure it independently.
6. Publish the three-robot selector, stable deep links and individual release
   records. Each new robot includes three keyframes, one silent film and one GIF.

Product Room, Studio, drawing revisions and inquiry/quotation flows stay outside
this independent expansion. No backend is added. The resulting model packages
remain usable by other Annora hosts through the existing JSON controller.
