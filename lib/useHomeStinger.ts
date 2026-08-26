"use client";

import { useEffect } from "react";

const SRC = "/audio/voice/oh-yeah-slop-it-up.mp3";

let shared: HTMLAudioElement | null = null;

/** Plays the homepage shout once per page load. Autoplay if allowed, otherwise first click/key. */
export function useHomeStinger() {
  useEffect(() => {
    if (!shared) {
      shared = new Audio(SRC);
      shared.preload = "auto";
      shared.volume = 0.9;
    }
    const audio = shared;

    const teardownUnlock = () => {
      window.removeEventListener("pointerdown", play);
      window.removeEventListener("keydown", play);
    };

    const play = () => {
      if (!audio.paused) {
        teardownUnlock();
        return;
      }
      void audio
        .play()
        .then(() => {
          teardownUnlock();
        })
        .catch(() => {
          /* browsers block autoplay until a gesture */
        });
    };

    window.addEventListener("pointerdown", play);
    window.addEventListener("keydown", play);
    play();

    return teardownUnlock;
  }, []);
}
