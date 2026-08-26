"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { getStoredName, storeName } from "@/lib/identity";
import { useRoomSocket } from "@/lib/useRoomSocket";
import type { PublicPlayer, PublicRoom } from "@/lib/game/types";

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toLowerCase();
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    // Browser storage is intentionally read after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(getStoredName());
  }, []);
  if (name === null) return <main className="flex min-h-screen items-center justify-center">loading…</main>;
  if (!name.trim()) return <NamePrompt onDone={setName} />;
  return <RoomClient code={code} name={name} />;
}

function NamePrompt({ onDone }: { onDone: (name: string) => void }) {
  const [value, setValue] = useState("");
  return <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6"><p className="text-xl">who are you?</p><form onSubmit={(event) => { event.preventDefault(); const name = value.trim(); if (name) { storeName(name); onDone(name); } }} className="flex gap-3"><input autoFocus value={value} onChange={(event) => setValue(event.target.value.slice(0, 20))} placeholder="name" className="border px-3 py-2 text-lg" /><button type="submit" className="cursor-pointer border px-4 py-2 text-lg">enter arena</button></form></main>;
}

function RoomClient({ code, name }: { code: string; name: string }) {
  const { room, playerId, actions, connected } = useRoomSocket(code, name);
  if (!connected || !room) return <main className="flex min-h-screen items-center justify-center">connecting…</main>;
  const you = room.players.find((player) => player.id === playerId) ?? null;
  return <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center gap-6 p-6"><p className="text-sm tracking-widest text-gray-500">laser swamp // room {code}</p>{room.phase === "lobby" && <Lobby room={room} you={you} onReady={actions.setReady} />}{room.phase === "countdown" && <Countdown endsAt={room.countdownEndsAt} />}{room.phase === "live" && <Arena room={room} playerId={playerId} move={actions.move} aim={actions.aim} shoot={actions.shoot} />}{room.phase === "results" && <Results winnerName={room.winnerName} isYou={room.winnerId === playerId} onPlayAgain={actions.playAgain} />}</main>;
}

function Lobby({ room, you, onReady }: { room: PublicRoom; you: PublicPlayer | null; onReady: (ready: boolean) => void }) {
  return <div className="flex flex-col items-center gap-6"><div className="text-center"><p className="text-3xl font-bold">LASER SWAMP</p><p className="mt-2 text-gray-600">WASD to move · mouse to aim · click to fire</p><p className="text-gray-600">last blob standing wins</p></div><ul className="flex flex-col gap-2">{room.players.map((player) => <li key={player.id}>{player.name} <span className="text-sm text-gray-500">{!player.connected ? "disconnected" : player.ready ? "ready" : "lurking"}</span></li>)}</ul><button onClick={() => onReady(!you?.ready)} className="cursor-pointer border px-6 py-3 text-lg">{you?.ready ? "unready" : "ready up"}</button><p className="text-sm text-gray-500">the arena starts when every connected creature is ready</p></div>;
}

function Countdown({ endsAt }: { endsAt: number | null }) {
  const [remaining, setRemaining] = useState(() => endsAt ? Math.max(0, endsAt - Date.now()) : 0);
  useEffect(() => { if (!endsAt) return; const interval = setInterval(() => setRemaining(Math.max(0, endsAt - Date.now())), 100); return () => clearInterval(interval); }, [endsAt]);
  return <div className="flex flex-1 flex-col items-center justify-center gap-2"><p className="text-sm tracking-widest">THE SWAMP STIRS</p><p className="text-8xl font-bold">{Math.ceil(remaining / 1000)}</p></div>;
}

function Arena({ room, playerId, move, aim, shoot }: { room: PublicRoom; playerId: string | null; move: (x: number, y: number) => void; aim: (x: number, y: number) => void; shoot: () => void }) {
  const arenaRef = useRef<HTMLDivElement>(null);
  const keys = useRef(new Set<string>());
  useEffect(() => {
    const sendMove = () => move((keys.current.has("d") ? 1 : 0) - (keys.current.has("a") ? 1 : 0), (keys.current.has("s") ? 1 : 0) - (keys.current.has("w") ? 1 : 0));
    const down = (event: KeyboardEvent) => { const key = event.key.toLowerCase(); if (!"wasd".includes(key)) return; event.preventDefault(); keys.current.add(key); sendMove(); };
    const up = (event: KeyboardEvent) => { const key = event.key.toLowerCase(); if (!"wasd".includes(key)) return; keys.current.delete(key); sendMove(); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [move]);
  const point = (event: React.MouseEvent<HTMLDivElement>) => { const rect = arenaRef.current?.getBoundingClientRect(); const you = room.players.find((player) => player.id === playerId); if (!rect || !you || you.x === null || you.y === null) return; const x = (event.clientX - rect.left) / rect.width * room.width; const y = (event.clientY - rect.top) / rect.height * room.height; aim(Math.sign(x - you.x), Math.sign(y - you.y)); };
  return <div className="w-full"><p className="mb-3 text-center text-sm text-gray-600">WASD move · point · click to fire</p><div ref={arenaRef} onMouseMove={point} onClick={(event) => { point(event); shoot(); }} className="relative aspect-[3/2] w-full cursor-crosshair overflow-hidden border-2 border-black bg-lime-100 touch-none">{Array.from({ length: room.width * room.height }, (_, index) => <span key={index} style={{ left: `${index % room.width / room.width * 100}%`, top: `${Math.floor(index / room.width) / room.height * 100}%` }} className="absolute h-px w-px bg-lime-300" />)}{room.shots.map((shot) => <Laser key={shot.id} shot={shot} room={room} />)}{room.players.filter((player) => player.alive && player.x !== null && player.y !== null).map((player) => { const x = player.x ?? 0; const y = player.y ?? 0; return <div key={player.id} title={player.name} style={{ left: `${((x + .5) / room.width) * 100}%`, top: `${((y + .5) / room.height) * 100}%` }} className={`absolute flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-black text-xs font-bold ${player.id === playerId ? "bg-fuchsia-400" : "bg-cyan-300"}`}>{player.name.slice(0, 1).toUpperCase()}</div>; })}</div><div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">{room.players.map((player) => <span key={player.id} className={player.alive ? "" : "line-through text-gray-400"}>{player.id === playerId ? "you" : player.name}</span>)}</div></div>;
}

function Laser({ shot, room }: { shot: PublicRoom["shots"][number]; room: PublicRoom }) {
  const length = Math.max(room.width, room.height) * 1.5;
  const degrees = Math.atan2(shot.dy, shot.dx) * 180 / Math.PI;
  return <span style={{ left: `${((shot.x + .5) / room.width) * 100}%`, top: `${((shot.y + .5) / room.height) * 100}%`, width: `${length / room.width * 100}%`, transform: `rotate(${degrees}deg)` }} className="absolute h-1 origin-left -translate-y-1/2 bg-red-500" />;
}

function Results({ winnerName, isYou, onPlayAgain }: { winnerName: string | null; isYou: boolean; onPlayAgain: () => void }) {
  return <div className="flex flex-col items-center gap-6"><p className="text-4xl font-bold">{isYou ? "you own the swamp" : winnerName ? `${winnerName} owns the swamp` : "the swamp ate everyone"}</p><button onClick={onPlayAgain} className="cursor-pointer border px-6 py-3 text-lg">drain the swamp</button></div>;
}
