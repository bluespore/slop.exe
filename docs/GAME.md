# Current game

This file describes what the game **actually does right now**. It will go
stale the moment someone changes the game — that's expected. If you change
gameplay, update this file in the same PR so the next contributor (human or
LLM) can read the current rules instead of reverse-engineering them from
`party/index.ts`.

## The loop, as of the last edit to this file

1. **Home** (`app/page.tsx`) — create a four-letter room or join one a friend
   shared.
2. **Lobby** — pick a name, read the controls, and ready up. Once every
   connected player is ready, a five-second countdown begins.
3. **Laser Swamp** — everyone is spawned into an 18 by 12 grid. Use **WASD**
   to move, point the mouse to choose one of eight firing directions, and
   click to fire a laser. Lasers are instant and stop at the first creature
   they meet. One hit eliminates a creature. The last living player wins.
4. **Results** — any connected player may drain the swamp, returning everyone
   to the lobby with ready states reset.

## Authority and networking

The Durable Object in `party/index.ts` owns all positions, movement timing,
spawn points, shooting cooldowns, hit detection, elimination, and victory.
The client sends only movement, aim, and fire intent, then renders room
snapshots. The live arena ticks at 10 Hz; players may move one grid square
every 150 ms and fire every 450 ms.

`lib/game/types.ts` contains the wire protocol. Keep anything that could
decide a winner on the Durable Object.
