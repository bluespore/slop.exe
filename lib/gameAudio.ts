"use client";

export type AudioGroup = "master" | "sfx" | "music";

const ASSETS: Record<string, string> = {
  "scream-01": "/audio/sfx/scream-01.mp3",
  "scream-02": "/audio/sfx/scream-02.mp3",
  "scream-03": "/audio/sfx/scream-03.mp3",
  "scream-04": "/audio/sfx/scream-04.mp3",
  dubstep: "/audio/music/dubstep-arena-loop.mp3",
};

const SCREAMS = ["scream-01", "scream-02", "scream-03", "scream-04"] as const;

export class GameAudio {
  private ctx: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private raw = new Map<string, ArrayBuffer>();
  private gains = new Map<AudioGroup, GainNode>();
  private musicSource: AudioBufferSourceNode | null = null;
  private fetchPromise: Promise<void> | null = null;
  private wantMusic = false;
  private muted = false;
  private lastScream = -1;
  private seenShots = new Set<string>();

  preload(): Promise<void> {
    if (this.fetchPromise) return this.fetchPromise;
    this.fetchPromise = Promise.all(
      Object.entries(ASSETS).map(async ([id, url]) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to load ${url}`);
        this.raw.set(id, await response.arrayBuffer());
      }),
    ).then(() => undefined);
    return this.fetchPromise;
  }

  async unlock(): Promise<void> {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    if (!this.ctx) {
      this.ctx = new Ctor();
      const master = this.ctx.createGain();
      master.connect(this.ctx.destination);
      this.gains.set("master", master);
      for (const group of ["sfx", "music"] as const) {
        const gain = this.ctx.createGain();
        gain.connect(master);
        this.gains.set(group, gain);
      }
      this.gains.get("music")!.gain.value = 0.32;
      this.gains.get("sfx")!.gain.value = 0.9;
      master.gain.value = this.muted ? 0 : 1;
    }
    if (this.ctx.state !== "running") await this.ctx.resume();
    await this.preload();
    await this.decodeAll();
    if (this.wantMusic) this.startMusic();
  }

  playScream(): void {
    if (!this.ctx || this.ctx.state !== "running") return;
    let index = Math.floor(Math.random() * SCREAMS.length);
    if (index === this.lastScream) index = (index + 1) % SCREAMS.length;
    this.lastScream = index;
    this.play(SCREAMS[index], "sfx");
  }

  startMusic(): void {
    this.wantMusic = true;
    if (!this.ctx || this.ctx.state !== "running") return;
    if (this.musicSource) return;
    const buffer = this.buffers.get("dubstep");
    const music = this.gains.get("music");
    if (!buffer || !music) return;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(music);
    source.start();
    this.musicSource = source;
  }

  stopMusic(): void {
    this.wantMusic = false;
    try {
      this.musicSource?.stop();
    } catch {
      /* already stopped */
    }
    this.musicSource = null;
  }

  syncLive(live: boolean, shotIds: string[]): void {
    if (!live) {
      this.seenShots.clear();
      this.stopMusic();
      return;
    }
    this.startMusic();
    for (const id of shotIds) {
      if (this.seenShots.has(id)) continue;
      this.seenShots.add(id);
      this.playScream();
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    const master = this.gains.get("master");
    if (master) master.gain.value = muted ? 0 : 1;
  }

  suspend(): void {
    void this.ctx?.suspend();
  }

  resume(): void {
    if (!this.ctx) return;
    void this.ctx.resume();
  }

  private async decodeAll(): Promise<void> {
    if (!this.ctx) return;
    for (const [id, data] of this.raw) {
      if (this.buffers.has(id)) continue;
      this.buffers.set(id, await this.ctx.decodeAudioData(data.slice(0)));
    }
  }

  private play(id: string, group: AudioGroup): void {
    if (!this.ctx) return;
    const buffer = this.buffers.get(id);
    const dest = this.gains.get(group);
    if (!buffer || !dest) return;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(dest);
    source.start();
  }
}

let instance: GameAudio | null = null;

export function getGameAudio(): GameAudio {
  if (!instance) instance = new GameAudio();
  return instance;
}
