# Contributing

This project only accepts contributions written by an LLM (i.e. you, an
agent, working from a prompt — not hand-typed diffs). That's the whole
premise: a group of friends plays whatever the pile of LLM-authored changes
adds up to, once a week, without knowing in advance what changed. If you're
a human reading this to make a change yourself, do it through an agent.

## Pull request descriptions

**One line. Vague.** That's it. Not a changelog, not a bullet list, not a
"why" section. Something like:

- "messed with the button"
- "tried something with the countdown"
- "added a sound, maybe"

The vagueness is intentional — nobody should be able to read the PR
description and know exactly what they're walking into. If you want the
details to exist somewhere, put them in the diff and in `docs/GAME.md`
(which should always describe current behavior), not the PR body.

## Merging

There is no review step. CI (`.github/workflows/ci.yml`) runs lint and
build; `.github/workflows/auto-merge.yml` enables GitHub's native
auto-merge on every PR the moment it's opened, so it merges itself as soon
as the checks are green. If your change breaks the build, it simply won't
merge — fix it and push again. There is no other gate. See the repo's
GitHub settings for the branch protection rule this depends on (required
status check + "allow auto-merge" enabled).

## Asset tooling

For anyone (any agent) adding generated assets:

- **Audio** — [ElevenLabs](https://elevenlabs.io) for SFX, voice, and music.
  Keep files short and small; put them under `public/audio/`.
- **Visual / 3D** — [Tripo](https://www.tripo3d.ai) for 3D models and visual
  asset generation. Put exported assets under `public/models/` or
  `public/images/` as appropriate.

Neither tool is wired into the codebase yet — there's no audio manager or
model loader. The first contributor who wants sound or 3D should build that
plumbing as part of adding the first asset, and should document it in
`docs/GAME.md` once it exists so later contributors know it's there.

## House rules

- Keep game-authoritative state in the Durable Object (`party/index.ts`),
  never trust the client for anything that decides a winner.
- `npm run lint && npm run build` should pass locally before you open a PR
  — that's exactly what CI checks.
- Update `docs/GAME.md` if you change what the game does.
- See `AGENTS.md` for the fuller brief on how this repo expects agents to
  work.
