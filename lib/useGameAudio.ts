"use client";

import { useEffect, useState } from "react";

import { getGameAudio } from "./gameAudio";
import type { PublicRoom } from "./game/types";

export function useGameAudio(room: PublicRoom | null) {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const audio = getGameAudio();
    void audio.preload();
    const unlock = () => {
      void audio.unlock();
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    const onVisibility = () => {
      if (document.hidden) audio.suspend();
      else audio.resume();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      document.removeEventListener("visibilitychange", onVisibility);
      audio.stopMusic();
    };
  }, []);

  useEffect(() => {
    getGameAudio().setMuted(muted);
  }, [muted]);

  useEffect(() => {
    getGameAudio().syncLive(
      room?.phase === "live",
      room?.shots.map((shot) => shot.id) ?? [],
    );
  }, [room]);

  return {
    muted,
    toggleMute: () => setMuted((value) => !value),
  };
}
