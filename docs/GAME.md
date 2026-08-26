# Current game

This file describes what the game **actually does right now**. It will go
stale the moment someone changes the game — that's expected. If you change
gameplay, update this file in the same PR so the next contributor (human or
LLM) can read the current rules instead of reverse-engineering them from
`party/index.ts`.

## The loop, as of the last edit to this file

1. **Home** (`app/page.tsx`) — create a four-letter room or join one a friend
   shared. The mouse cursor is a carrot everywhere on the site
   (`public/images/carrot-cursor.png`, from the 3D model at
   `public/models/carrot.glb`). On load, a woman yells "OH YEAH SLOP IT UP!!!"
   (`public/audio/voice/oh-yeah-slop-it-up.mp3`). Browsers that block autoplay
   play it on the first click or keypress instead.
2. **Lobby** — pick a name, read the controls, and ready up. Once every
   connected player is ready, a five-second countdown begins.
3. **Laser Swamp** — everyone is spawned into an 18 by 12 grid. Use **WASD**
   to move, point the mouse to choose one of eight firing directions, and
   click to fire a laser. Lasers are instant and stop at the first creature
   they meet. One hit eliminates a creature. The last living player wins.
4. **Results** — any connected player may drain the swamp, returning everyone
   to the lobby with ready states reset.

Audio is client-side only and does not affect who wins. The home page plays a
one-shot female shout (`public/audio/voice/oh-yeah-slop-it-up.mp3`) when it
loads, or on the first click/key if the browser blocks autoplay. Each new
laser shot plays a random adult-male scream (`public/audio/sfx/scream-01.mp3`
through `scream-04.mp3`). A dubstep loop
(`public/audio/music/dubstep-arena-loop.mp3`) starts when the arena goes live
and stops when the round ends. Playback in the room uses Web Audio in
`lib/gameAudio.ts`: first click or keypress unlocks the context, hiding the
tab suspends it, and a mute toggle on the room header silences every group.

## Authority and networking

The Durable Object in `party/index.ts` owns all positions, movement timing,
spawn points, shooting cooldowns, hit detection, elimination, and victory.
The client sends only movement, aim, and fire intent, then renders room
snapshots. The live arena ticks at 10 Hz; players may move one grid square
every 150 ms and fire every 450 ms.

`lib/game/types.ts` contains the wire protocol. Keep anything that could
decide a winner on the Durable Object.
