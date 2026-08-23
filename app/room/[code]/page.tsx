"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { getStoredName, storeName } from "@/lib/identity";
import { useRoomSocket } from "@/lib/useRoomSocket";
import type { PublicPlayer, PublicRoom } from "@/lib/game/types";

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toLowerCase();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    // Reading browser-only storage once at mount; SSR rendered the loading state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(getStoredName());
  }, []);

  if (name === null) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p>loading…</p>
      </main>
    );
  }

  if (!name.trim()) {
    return <NamePrompt onDone={setName} />;
  }

  return <RoomClient code={code} name={name} />;
}

function NamePrompt({ onDone }: { onDone: (name: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <p className="text-xl">who are you?</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = value.trim();
          if (!trimmed) return;
          storeName(trimmed);
          onDone(trimmed);
        }}
        className="flex gap-3"
      >
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, 20))}
          placeholder="name"
          className="border px-3 py-2 text-lg"
        />
        <button type="submit" className="cursor-pointer border px-4 py-2 text-lg">
          go
        </button>
      </form>
    </main>
  );
}

function RoomClient({ code, name }: { code: string; name: string }) {
  const { room, playerId, actions, connected } = useRoomSocket(code, name);

  if (!connected || !room) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p>connecting…</p>
      </main>
    );
  }

  const you = room.players.find((p) => p.id === playerId) ?? null;

  return (
    <main className="flex min-h-screen flex-col items-center gap-8 p-6">
      <p className="text-sm tracking-widest text-gray-500">room {code}</p>

      {room.phase === "lobby" && (
        <Lobby room={room} you={you} onReady={actions.setReady} />
      )}
      {room.phase === "countdown" && (
        <Countdown endsAt={room.countdownEndsAt} />
      )}
      {room.phase === "live" && (
        <LiveButton pos={room.buttonPos} onClick={actions.click} />
      )}
      {room.phase === "results" && (
        <Results
          winnerName={room.winnerName}
          isYou={room.winnerId === playerId}
          onPlayAgain={actions.playAgain}
        />
      )}
    </main>
  );
}

function Lobby({
  room,
  you,
  onReady,
}: {
  room: PublicRoom;
  you: PublicPlayer | null;
  onReady: (ready: boolean) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-lg">waiting for everyone to be ready</p>
      <ul className="flex flex-col gap-2">
        {room.players.map((p) => (
          <li key={p.id} className="flex items-center gap-3">
            <span>{p.name}</span>
            <span className="text-sm text-gray-500">
              {!p.connected ? "disconnected" : p.ready ? "ready" : "not ready"}
            </span>
          </li>
        ))}
      </ul>
      <button
        onClick={() => onReady(!you?.ready)}
        className="cursor-pointer border px-6 py-3 text-lg"
      >
        {you?.ready ? "cancel ready" : "ready up"}
      </button>
      <p className="text-sm text-gray-500">
        share the room code so friends can join
      </p>
    </div>
  );
}

function Countdown({ endsAt }: { endsAt: number | null }) {
  const [remaining, setRemaining] = useState(() =>
    endsAt ? Math.max(0, endsAt - Date.now()) : 0,
  );

  useEffect(() => {
    if (!endsAt) return;
    const interval = setInterval(() => {
      setRemaining(Math.max(0, endsAt - Date.now()));
    }, 100);
    return () => clearInterval(interval);
  }, [endsAt]);

  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-8xl font-bold">{Math.ceil(remaining / 1000)}</p>
    </div>
  );
}

function LiveButton({
  pos,
  onClick,
}: {
  pos: { x: number; y: number } | null;
  onClick: () => void;
}) {
  if (!pos) return null;
  return (
    <div className="relative min-h-[70vh] w-full flex-1">
      <button
        onClick={onClick}
        style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
        className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer border px-8 py-4 text-2xl"
      >
        click
      </button>
    </div>
  );
}

function Results({
  winnerName,
  isYou,
  onPlayAgain,
}: {
  winnerName: string | null;
  isYou: boolean;
  onPlayAgain: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-4xl font-bold">
        {isYou ? "you won" : `${winnerName ?? "someone"} won`}
      </p>
      <button
        onClick={onPlayAgain}
        className="cursor-pointer border px-6 py-3 text-lg"
      >
        play again
      </button>
    </div>
  );
}
