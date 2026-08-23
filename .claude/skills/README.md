# Three.js game skills

The `threejs-*` skills in this directory are copied in from
[majidmanzarpour/threejs-game-skills](https://github.com/majidmanzarpour/threejs-game-skills),
installed globally via `npx skills add majidmanzarpour/threejs-game-skills --skill '*'`
and vendored here so they're available to agents working in this repo.

- `threejs-game-director` — main entrypoint, routes to the specialists below
- `threejs-gameplay-systems` — playable loop, mechanics, controls, camera, physics
- `threejs-aaa-graphics-builder` — models, materials, lighting, VFX, render polish
- `threejs-game-ui-designer` — HUDs, menus, overlays, responsive/touch UI
- `threejs-debug-profiler` — runtime/render/mobile bugs, performance profiling
- `threejs-qa-release` — browser QA, screenshots, production build, release checks
- `threejs-3d-generator` / `threejs-image-generator` / `threejs-audio-generator` —
  optional AI asset generation (Tripo / Gemini / ElevenLabs); these fall back to
  procedural/local assets when the relevant API key isn't set

None of this is wired into the current game (`docs/GAME.md`) — it's here for
whoever decides to build a Three.js-based minigame next. Update `docs/GAME.md`
if you use it to change what the game does.
