"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { randomRoomCode } from "@/lib/identity";
import { useHomeStinger } from "@/lib/useHomeStinger";

export default function HomePage() {
  const router = useRouter();
  const [joining, setJoining] = useState(false);
  const [code, setCode] = useState("");
  useHomeStinger();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <h1 className="text-6xl font-bold tracking-tight sm:text-8xl">
        slop.exe
      </h1>

      {!joining ? (
        <div className="flex flex-col gap-4 sm:flex-row">
          <button
            onClick={() => router.push(`/room/${randomRoomCode()}`)}
            className="cursor-pointer border px-6 py-3 text-lg"
          >
            Create game
          </button>
          <button
            onClick={() => setJoining(true)}
            className="cursor-pointer border px-6 py-3 text-lg"
          >
            Join game
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = code.trim().toLowerCase();
            if (trimmed) router.push(`/room/${trimmed}`);
          }}
          className="flex flex-col items-center gap-4"
        >
          <input
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.slice(0, 8))}
            placeholder="room code"
            className="border px-4 py-2 text-center text-2xl tracking-widest uppercase"
          />
          <div className="flex gap-4">
            <button
              type="submit"
              className="cursor-pointer border px-6 py-3 text-lg"
            >
              Go
            </button>
            <button
              type="button"
              onClick={() => setJoining(false)}
              className="cursor-pointer border px-6 py-3 text-lg"
            >
              Back
            </button>
          </div>
        </form>
      )}

      <p className="text-sm opacity-60">
        This game is built from random contributions, so you never know what
        you&apos;ll get.{" "}
        <a
          href="https://github.com/bluespore/slop.exe"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Contribute here
        </a>
        .
      </p>
    </main>
  );
}
