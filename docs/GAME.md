# Current game

This file describes what the game **actually does right now**. It will go
stale the moment someone changes the game — that's expected. If you change
gameplay, update this file in the same PR so the next contributor (human or
LLM) can read the current rules instead of reverse-engineering them from
`party/index.ts`.

## The loop, as of the last edit to this file

1. **Home** (`app/page.tsx`) — big "slop.exe" title, **Create game** (mints a
   random 4-letter room code and navigates to it) and **Join game** (type in
   a code someone shared with you).
2. **Room** (`app/room/[code]/page.tsx`) — first visit asks for a name
   (stored in `localStorage`, reused across rooms). Then you're in the room's
   current phase:
   - **lobby** — everyone connected sees the player list and a "ready up"
     toggle. The moment every connected player is ready, the countdown
     starts automatically — nobody needs to press a separate "start".
   - **countdown** — a big number counts down from 10.
   - **live** — a single button appears at a random position on the page.
     First person to click it wins. That's the entire game.
   - **results** — announces the winner, offers "play again" (returns
     everyone to the lobby, ready states reset).

## Where the rules live

All of this is server-authoritative in the Durable Object at
`party/index.ts` (class `ButtonRoom`). The client (`app/room/[code]/page.tsx`,
`lib/useRoomSocket.ts`) only renders whatever `PublicRoom` state the server
broadcasts — it does not decide who won, when the countdown ends, or where
the button goes. Keep it that way: if a change requires trusting the client,
it's the wrong change. See `lib/game/types.ts` for the wire protocol between
client and room.

## Extending this

Nothing here is sacred. Add rounds, points, obstacles, decoys, sabotage,
whatever — the whole point of this repo is that it drifts. Just:

- Keep game state and transitions in the Durable Object, not the client.
- Update this file to describe the new loop.
- Don't assume the person playing next has read your PR.
