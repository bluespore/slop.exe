# slop.exe — agent instructions

You are contributing to a game that a small group of friends plays once a
week. Between sessions, **anyone can change anything** — the point of the
project is that nobody knows exactly what they're about to play until they
sit down and play it. Surprise, drift, and mild chaos are the intended
experience, not bugs to guard against.

## What this repo is

- **Frontend**: Next.js (App Router) + TypeScript + Tailwind, deployed on
  Vercel. Entry point: `app/page.tsx` (home), `app/room/[code]/page.tsx`
  (the room / game itself).
- **Realtime backend**: a single Cloudflare Durable Object per room
  (`party/index.ts`, via the `partyserver` library, deployed with
  `wrangler`), talked to from the client through `partysocket`
  (`lib/useRoomSocket.ts`). The DO is the authority on all game state —
  the client only renders what it's told. See `docs/GAME.md` for the
  current rules and `lib/game/types.ts` for the client/server protocol.
- **Styling**: Tailwind is installed, but the project starts intentionally
  **raw and unstyled** — no design system, no custom theme in
  `app/globals.css`. Don't invent a visual identity unprompted; if you're
  improving the look, keep changes additive and easy for the next person to
  rip out or build on, and lean on plain Tailwind utilities rather than a
  bespoke component library.

## How to work here

- Make self-contained, working changes. You are not going to get a design
  review or a back-and-forth — treat every PR as if it will be merged the
  moment CI goes green, because it will be (see below).
- Prefer small, additive changes over rewrites. Someone else's half-built
  idea from last week may still be in flight; don't clobber it out of
  convenience.
- Run `npm run lint` and `npm run build` before opening a PR. CI runs the
  same checks — there is no human review gate, so a broken build ships
  straight to next week's session.
- If you change how the game plays, update `docs/GAME.md` in the same PR.
  It's the one place a future contributor can read to find out what the
  game currently does without spelunking through `party/index.ts`.
- Keep the Durable Object authoritative for anything that affects who wins.
  Client-trusted game logic is the one category of change that isn't in
  the spirit of this project — everything else is fair game.

## Pull requests

See `CONTRIBUTING.md` for the PR description rule (one vague line, no
more) and the auto-merge policy. Both are load-bearing to how this project
works, not arbitrary process.

## Asset generation

If you're adding audio or visual/3D assets, see `CONTRIBUTING.md` for the
recommended tools (ElevenLabs for audio, Tripo for 3D/visual generation)
and where generated assets should live.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
