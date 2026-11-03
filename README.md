# Annora · Open Duck Showcase

An independent assembly presentation built on the existing Annora Explorer.
Open Duck Mini v2 is the subject: a compact, open-hardware robot with source-linked
parts, sixteen revolute joints, a staggered exploded view and a 20-second tour.

**[Open the live showcase](https://kyle-annora.github.io/annora-duck-showcase/showcase/)** ·
**[Open the full Explorer](https://kyle-annora.github.io/annora-duck-showcase/?model=open-duck)**

This repository is an isolated presentation experiment. The main
[Annora Explorer](https://github.com/kyle-annora/annora-explorer) and its existing
customer projects are not replaced by this release. Product Room, Studio,
drawing/version links and quotation workflows remain in the shared source for
regression coverage; they are not the navigation of this showcase.

## Review

1. Open the showcase and choose **Play showcase**. Eight short chapters introduce
   the robot, its head, outer panels, internal structure, restoration and motion.
2. Pause, replay or drag the timeline in either direction. Orbiting takes control;
   resuming is always explicit.
3. Open **Parts**. Selecting a component highlights it; **Inspect assembly** enters
   that branch. Return through the assembly navigation to recover the whole model.
4. Try Engineering, Linework and Flat highlight. Light/Dark, a custom accent and a
   switchable ground grid remain available.

The movement is an illustrative, source-joint pose study within the original
limits. It is not learned walking, a physically balanced gait or manufacturing
validation. Curated finishes and exploded offsets are presentation choices.

## Local development

Requires Node.js 22.13 or newer.

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:8095/showcase/`. Before publishing:

```sh
npm run verify
```

This independent preview publishes a validated static build on the `gh-pages` branch.
Run `npm run deploy:preview -- --repo https://github.com/OWNER/REPOSITORY.git`
after setting Pages to that branch. The command runs verification before publishing.
The pinned Actions workflow is retained as `scripts/deployment/pages.workflow.yml`;
a repository owner can activate it when workflow authorization is available.
The main Explorer template keeps its existing automatic deployment. Relative
assets work under a repository subpath. See [deployment](docs/deployment.md).

## Organization

| Location | Responsibility |
| --- | --- |
| `showcase/`, `src/showcase/` | Compact presentation host; public JSON controller only |
| `content/models/open-duck/` | Prepared model, semantic hierarchy, line data and authored tour |
| `examples/open-duck/` | Pinned raw source, offline conversion, mappings and provenance reports |
| `src/explorer/` | Shared renderer, animation and host controller |
| `export/`, `src/showcase-export/` | Offline, fixed-frame media authoring using the same scene and tour |
| `docs/open-duck-showcase-plan.md` | Approved reference lock, scope and acceptance gates |
| `docs/open-duck-showcase-delivery.md` | Release checks, measured performance, limitations and media |

There is one scene-owned clock in the live Explorer. The showcase does not add a
second renderer or animation loop. Model-specific motion, offsets, labels and
camera choices live in the content package. The optional generic separation
profile preserves all existing models' default behavior.

The offline media page replaces the live clock for its own scene instance and
renders at a fixed 30 fps. Keep that tab visible during capture. It exports PNGs
and a silent VP8/WebM film through the browser; it is an authoring utility, not a
second production player.

## Reuse and source

The existing [API](docs/api.md), [model package](docs/models.md),
[integration](docs/integration.md) and project-local
[onboarding skill](.agents/skills/explorer-project/SKILL.md) describe the reusable
runtime. New models go through the generic importer; do not add product-specific
branches to the renderer.

Open Duck Mini v2 was created by Antoine Pirrone and contributors. The pinned
[asset distribution](https://github.com/mertcookimg/Open_Duck_Mini_Viewer/tree/dfdb84ef3ae2405e5f115b32f48471331dc65d78/public/assets/open_duck_mini_v2)
is used under Apache-2.0; its license and notice are preserved with the assets.
See the [original robot project](https://github.com/apirrone/Open_Duck_Mini).
Derived geometry, material curation and illustrative animation are by Annora.
Teardown informs the presentation choreography; its bee model is not used.

Annora runtime source is MIT. Models and bundled dependencies retain their own
licenses; builds include `LICENSES.txt`. No backend, credentials, real account,
customer data or external telemetry is included.
