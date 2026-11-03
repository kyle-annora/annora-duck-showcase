# Open Duck Mini showcase plan

Status: approved and implemented in the independent showcase repository, November 2, 2026.
See `open-duck-showcase-delivery.md` for release evidence and remaining hardware qualification.
The main Annora Explorer deployment has not been changed.

## Goal and first release

Create an independent, visually distinctive Open Duck Mini v2 showcase using
Annora's existing Explorer. Prioritize model quality, purposeful camera movement,
layered decomposition and a compact instrument interface. A visitor should enjoy
the presentation, inspect a component and take control of the same scene.

The first release contains one prepared robot, one approximately 20-second
presentation, short manual actions, desktop/mobile layouts and shareable media.
Product Room, Studio and quotation workflows remain outside this release.

## Sources and confirmed facts

| Source | Role and pinned revision |
| --- | --- |
| [Open Duck Mini v2](https://github.com/apirrone/Open_Duck_Mini) | Original robot project; `b23317a485b3cec7d8417f352478778b3475173c` |
| [Open Duck Mini Viewer](https://github.com/mertcookimg/Open_Duck_Mini_Viewer) | Convenient URDF/STL distribution and motion reference; `dfdb84ef3ae2405e5f115b32f48471331dc65d78` |
| [Asset-specific notice](https://github.com/mertcookimg/Open_Duck_Mini_Viewer/blob/dfdb84ef3ae2405e5f115b32f48471331dc65d78/public/assets/open_duck_mini_v2/NOTICE) | Apache-2.0 provenance and attribution for the robot assets |
| [Teardown](https://github.com/elvarofficial/teardown) | Showcase reference and selected authoring/capture patterns; inspected revision `a91262ac1109051e014662d42ecb0b7bc1f113b1` |

The inspected viewer package has 46 STL files, 131 visual mesh references, 21
links and 20 joints, of which 16 are revolute. Visual references include repeated
geometry; these counts are not 131 distinct engineering parts. Source inventory
is approximately 21.6 MB, not the final browser download size.

Teardown includes the bee/scorpion/octopus GIFs, but their runnable models and
applications are not supplied. Its included machine sources are V8, Cessna and
Strandbeest. We will author the Duck presentation from the available robot assets.

## Reference lock

| Decision | Reference | Application |
| --- | --- | --- |
| Primary presentation language | Teardown bee GIF and included film sources | Large robot, pale instrument stage, numbered modules, selective leader lines, one functional accent |
| Interaction and hierarchy | Existing Annora Explorer and [Oxide Explorer](https://explorer.oxide.computer/) | Compact floating controls; hover, selection and entering a component remain distinct |
| Clear technical rendering | Existing Annora linework and [Atlas Motion](https://atlasmotion.com/) | Crisp occluded lines and selective flat Ember, preserving model readability during motion |
| Product lighting and surface restraint | Refero teenage engineering style `2055406e-755a-4276-af43-09d6b06a78f3` | Neutral studio lighting, controlled highlights and material contrast; retain Annora typography and colors |
| Restrained control hierarchy | Refero Oxide style `57399d2f-b94d-48df-a573-2c423077b16c` | Fine dividers, low elevation and an accent reserved for action/context |

The Three.Tools style `3b3396b2-6304-4f82-9703-78c9fc2fabbd` was also reviewed.
Its large marketing cards and rounded controls are not part of this direction.

Proposed appearance: Light by default; silver-white shells, graphite mechanisms
and restrained metallic fasteners. Keep Ember as the default interaction accent
and retain Dark mode. Use the established Annora tokens. Model part finishes and
hover/selected outlines retain separate roles. Use readable sans-serif controls
and monospace identifiers/values, with compact dividers and restrained radii.

## Desktop and mobile composition

| Area | Proposed contents |
| --- | --- |
| Top | Small Annora/Open Duck identity, current presentation step, compact appearance/display controls |
| Center | Full-viewport 3D stage; frame the robot within roughly 65–75% of the usable stage height in the hero view |
| Left | Collapsed assembly index; reveal parts only when browsing them |
| Right | One compact component/pose panel; selected part, phase and source-derived joint angle where useful |
| Bottom | One Play showcase action, then pause/resume, replay, progress scrubber and chapter labels |

Hover previews a component; click selects it; Inspect enters its assembly. Touch
uses selection directly. During the guided presentation the tree is closed and
only the relevant annotation is shown. Manual input pauses authored movement
and hands control to the visitor; Resume is explicit. Inactive time never steals
control back.

Mobile uses the full-width scene, a compact top row and a collapsible bottom
detail sheet. Keep touch targets at least 44 px. Reframe for portrait instead of
shrinking the desktop console. The robot, selected detail and playback controls
must remain visible together. Dense charts are not part of the initial layout.

## Proposed presentation script

The timing below is a starting storyboard. Each active beat is about 2–3 seconds;
camera preparation and a readable final hold may change the total slightly.
Use a continuous, one-pass tour definition for Play showcase. Existing pause and
chapter seeking provide manual inspection; a new runtime playback-mode toggle
is not required for the first release.

| Approximate time | Beat | Camera, model and UI coordination |
| --- | --- | --- |
| 0–2.5 s | Meet the robot | Strong three-quarter hero view; brief restrained reveal; show the product name and Play/transport clearly |
| 2.5–5 s | Look closer | Approach the head; then add Ember emphasis and one label; retain enough body context to understand its location |
| 5–7.5 s | Open the body | Return to a neutral authored pose; separate source-defined outer panels before showing internal modules |
| 7.5–10 s | Reveal the assembly | Pull back to fit the explosion envelope; stagger head/body/leg groups instead of moving every part simultaneously |
| 10–12.5 s | Read one detail | Hold a selected head or torso module; use a brief Linework/Flat treatment to explain its relation to the surrounding structure |
| 12.5–15 s | Reassemble | Reverse the authored separation to exact source transforms; preserve visible correspondence between parts |
| 15–17.5 s | Give it character | A short head/antenna scan and restrained joint-pose gesture, authored within source joint limits |
| 17.5–20 s | Explore freely | Settle in the assembled hero pose; offer Replay or free inspection |

The material, detail and motion choices depend on the asset audit. Do not invent
internal gears or opening hinges absent from the source. The initial gesture is
illustrative animation, not a claim of physically balanced walking. We can add
verified upstream walking later as a separate scope.

Pause and reverse scrubbing must produce coherent poses at any point. Never
operate the robot while its components remain exploded. Labels appear after the
camera establishes the view, with a short readable hold. UI values initially use
actual pose/progress; simulated force, battery and performance readouts are deferred.
The public state currently exposes clip progress, not individual joint transforms.
A joint-angle display requires an exported, unit-labelled declarative curve from
the same authored clip. Otherwise show the current phase/progress alone.

## Implementation sequence and gates

### 1 Prepare and inspect the model

- Download only the pinned asset set and preserve its license, notice and hashes.
- Audit the actual instance-level geometry, mesh topology, model dimensions,
  origins, axes and joint limits. Count referenced triangles and draw calls.
- Convert URDF visuals offline into uniquely named rigid GLB nodes and pivot
  groups. Preserve visual origins, scales and joint transforms. Use the existing
  generic importer after conversion.
- Organize customer-readable head, body, left/right leg and antenna groups, with
  deeper source-derived parts. Repair or simplify derived geometry while keeping
  stable identities and provenance.
- Author one source clip with neutral-bounded motion sections for the tour. If
  showing a joint-angle readout, export and verify its finite angle curve and
  sample it from the same playback progress through the host's public state.

Gate: assembled model matches the source, representative joint poses are correct,
the interior supports a useful reveal, and the prepared package passes validation.
If source detail cannot support the storyboard, report that gap before changing
the model choice or inventing geometry.

### 2 Establish the visual target

Produce a desktop hero, an exploded/detail view and a mobile composition using
the actual model. Check engineering materials, crisp linework, Ember emphasis,
dividers, button states and the model-to-UI proportion against the reference lock.
Use these frames as the visual QA target for the remaining implementation.

Gate: the model reads clearly in both assembled and separated states; UI and
annotations do not cover the selected details.

### 3 Build the choreography and interaction

Reuse Annora's renderer, one scene clock and JSON controller. Existing tour
chapters can sample different sections of the single authored operation clip.

True staggered explosion requires a small optional, generic separation profile:
normalized start/end intervals per part or group. Existing models default to the
current full-range behavior. Verify forward/reverse sampling, exact restoration
and interruption before using it in the Duck presentation.

Reuse the existing shell's controls where possible. A separate showcase host
may add compact explanation panels through the public client. Assign each
control one owner; avoid overlapping embedded and host navigation. Any needed
presentation capability must be generic and preserve existing defaults.

Gate: the complete sequence, pause, replay, backward scrub, manual takeover,
selection/Inspect distinction and free-exploration return all work.

### 4 Verify mobile and performance

- Check desktop 1440×900, portrait 390×844, compact 320×780 and landscape 844×390.
- Record actual geometry, compressed asset transfer, draw calls, frame intervals,
  viewport, browser and device. Measure Engineering and linework separately.
- Initial optimization targets: approximately 200k referenced triangles, no more
  than 5 MiB compressed model transfer, and a 30 fps baseline on a tested ordinary
  device. Treat these as targets to validate, not achieved measurements.
- Reuse geometry and materials where supported, load optional line data on
  demand, limit pixel ratio and shadow cost, and avoid expensive full-screen
  effects. Held/hidden views should stop advancing.
- Respect reduced motion and check touch, keyboard, safe areas and focus states.

The importer's existing hard limits remain rejection limits, not performance
goals. Narrow-viewport or CPU-throttled testing does not certify a phone GPU or
an ordinary laptop; report untested hardware explicitly.

### 5 Export, publish and hand off

Produce three full-resolution keyframes, a short demonstration video and a small
looping GIF. Exact frame capture needs an offline adapter that advances Annora's
existing scene sampler and waits for the rendered frame. `captureView` is a JSON
bookmark API and is not a screenshot/video exporter. Inspect frame sheets and
the final encoded file for timing, missing geometry, labels and restoration.

Publish an independent GitHub Pages preview and its source after the agreed
implementation and checks. Keep the main Explorer's default model and the
existing customer workflows stable. Deliver one review URL, media, an English
source/attribution record and an acceptance report.

## Acceptance and regression

The release is reviewable when:

1. The actual source-based robot has a convincing hero, readable internal detail
   and coherent hierarchical selection.
2. The short sequence includes deliberate close-ups, staggered separation and
   exact reassembly, with pause/replay/scrub/takeover throughout.
3. Hover, selected, Inspect, disabled, loading and focus states are distinct and
   stable. Appearance and rendering switches preserve context.
4. Mobile provides usable controls and an unobscured model without horizontal
   overflow or a forced landscape requirement.
5. Performance evidence states the tested hardware and quality; media matches
   the same model and authored sequence as the live preview.
6. Existing crank/Apollo playback, display styles, custom accents/grid, host
   lifecycle, drawing revision links and inquiry/quotation confirmations pass
   relevant regression checks. Run `npm run verify` and inspect the production
   subpath before deployment.

## Review decisions

Proposed defaults for approval: Light/silver with Ember; approximately 20 seconds;
explicit Play with one pass and free exploration at the end; one restrained
character gesture; three stills, one video and one GIF; independent preview first.

The earlier crank readout and single-cylinder ideas remain parked. Physics,
learned walking, new commercial workflows, a production telemetry dashboard and
a general animation editor are possible follow-ups after the visual showcase is
reviewed. Record the successful preparation and choreography process as a
project-local authoring checklist for reuse.
