# Robot showcase expansion delivery

Release date: 2026-11-03. Review scope: the independent
`kyle-annora/annora-duck-showcase` repository only.

## Review links and sequence

- [Default Open Duck presentation](https://kyle-annora.github.io/annora-duck-showcase/showcase/)
- [Hexapod presentation](https://kyle-annora.github.io/annora-duck-showcase/showcase/?model=hexapod)
- [Dropbear presentation](https://kyle-annora.github.io/annora-duck-showcase/showcase/?model=dropbear)
- Each robot has a matching **Film & keyframes** page and a fixed-frame export route.
- The hidden [Dropbear arm proof](https://kyle-annora.github.io/annora-duck-showcase/?model=dropbear-arm)
  remains available for structural review; it is not a fourth public showcase.

Play the 20-second tour, pause, seek backward, replay and orbit to take control.
Open Parts, select a system, Inspect to enter, isolate and return to the whole
assembly. Try Engineering, Linework and Flat highlight, then switch robots.
Display preferences carry over; model navigation, playback, isolation and pending
actions do not. Keep an explicit Resume after manual takeover.

## Delivered structure

`content/showcases/registry.json` owns robot identity, model/tour IDs, authored
presentation copy and media paths. Unknown IDs fail explicitly, without opening
Duck under the wrong label. Bare links keep Open Duck as the default. Each
registered robot must have its own complete media set before release.

The host uses one embedded Explorer and the public JSON controller. Retired
sessions close their controller and remove the old frame before replacement;
generation guards reject late hydration, selection, queue completion and errors.
The existing scene owns the render clock. The export utility takes over its own
scene clock only for fixed-frame authoring; it does not alter live playback.

All model-specific geometry, finishes, hierarchy, motion, camera choices and
separation timing are data in the model package. The shared renderer is unchanged.
The controller adds bounded chapter title/caption fields to its existing read API.
No backend, customer data, credentials or telemetry are added. The main Annora
Explorer repository and its existing customer projects are unchanged.

## Model evidence

| Model | Source visual instances | Display meshes | Referenced triangles | Compressed model |
| --- | ---: | ---: | ---: | ---: |
| Open Duck Mini v2 | 131 | 170 | 356,153 | 2,328,592 bytes |
| Hexapod | 72 | 92 | 248,656 | 964,423 bytes |
| Dropbear arm proof | 68 | 86 | 79,779 | 1,222,767 bytes |
| Dropbear humanoid | 668 | 728 | 348,558 | 6,568,668 bytes |

Additional edge/silhouette data is prepared offline and loaded when needed.
Dropbear keeps small connectors and source part envelopes at the cost of exceeding
the 5 MiB loading target. It remains optional and loads only when selected. Cold
network behavior and physical ordinary-device qualification remain release-pilot
work; successful import or a fast workstation is not a general speed guarantee.

Source byte hashes, source-to-display transforms, decimation/repair reports,
licenses, reproduction commands and motion boundaries are in
[Hexapod preparation](../examples/hexapod/README.md) and
[Dropbear preparation](../examples/dropbear/README.md). The generic validator and
its limits were not weakened.

Hexapod uses a 2.5-second single-leg lift/reach/return within declared source joint
limits. Its display stance is computed, not physically calibrated. Dropbear uses
a 2.5-second 8-degree shoulder-subtree swivel; all internal joint relationships
remain fixed. All 27 source closure records are retained. No closed-loop solving,
walking, balance, torque, force rating or collision validation is claimed.

The arm proof was visually checked before whole-model release: neutral geometry,
full-height framing, Engineering/Linework, midpoint swivel and exact return.
Whole-model preparation preserves every source visual while flattening the deep
static URDF frame chain offline; original frame relationships remain in evidence.

## Acceptance record

- Generic import checks cover eight valid licensed model packages and the existing
  drawing/version assets.
- Automated suite: 599 tests, 598 pass, one pre-existing optional skip, zero failures.
- Focused tests cover source hashes and transform reconstruction, joint limits,
  motion isolation and return, closure preservation, registry/media typing,
  explicit routes and stale-session isolation.
- Static production build is tested under `/annora-duck-showcase/`, matching Pages.
- Desktop and mobile review covers model selection, tour transport, assembly
  navigation, display preferences and matching media.
- Media is rendered from the prepared model and authored tour at 960 × 600,
  30 fps, 600 frames / 20 seconds, silent. Each new robot has an MP4, looping GIF
  and three keyframes. No footage or model is borrowed from Teardown's bee demo.

## Measurement and remaining qualification

Measurements are local browser observations on the development Apple workstation,
not ordinary-PC or physical-phone certification. Raw JSON is included beside each
robot's media. Browser viewport tests verify layout and interaction only.

The 1440 × 900 Balanced / Light checks recorded median intervals of 16.7 ms
for both models and modes. Hexapod p95: 17.6 ms Engineering / 18.3 ms Linework;
Dropbear p95: 18.5 ms Engineering / 18.4 ms Linework. No frame interval exceeded
50 ms in these four runs. Dropbear Engineering still reports 2,191 draw calls per
frame in this scenario; that is an explicit ordinary-device follow-up, despite
the fast development-machine result.

Publication runs `npm run verify`, then the stricter release media check, before
building the `gh-pages` release. Its `release.json` identifies the source commit.
Review the matching source revision and preserve the original model licenses when
reusing assets. Full copyright and license notices are linked from media credits.
