import { Server, type Connection, type WSMessage } from "partyserver";

import type {
  ClientMessage,
  PublicPlayer,
  PublicRoom,
  PublicShot,
  RoomPhase,
  ServerMessage,
} from "../lib/game/types";

const COUNTDOWN_MS = 5_000;
const NAME_MAX = 20;
const ARENA_WIDTH = 18;
const ARENA_HEIGHT = 12;
const TICK_MS = 100;
const MOVE_COOLDOWN_MS = 150;
const SHOT_COOLDOWN_MS = 450;
const SHOT_VISIBLE_MS = 160;

interface PlayerState {
  id: string;
  name: string;
  connId: string | null;
  ready: boolean;
  x: number | null;
  y: number | null;
  aimX: number;
  aimY: number;
  moveX: number;
  moveY: number;
  alive: boolean;
  lastMoveAt: number;
  lastShotAt: number;
}

interface ConnState {
  playerId: string;
}
interface ShotState extends PublicShot {
  expiresAt: number;
}

function sanitizeName(raw: unknown): string {
  const name = String(raw ?? "")
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .trim()
    .slice(0, NAME_MAX);
  return name || "PLAYER";
}

function direction(rawX: unknown, rawY: unknown) {
  const x = Number(rawX);
  const y = Number(rawY);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {
    x: Math.max(-1, Math.min(1, Math.round(x))),
    y: Math.max(-1, Math.min(1, Math.round(y))),
  };
}

/** A tiny simultaneous-movement laser arena. The Durable Object resolves every move and hit. */
export default class ButtonRoom extends Server {
  phase: RoomPhase = "lobby";
  players = new Map<string, PlayerState>();
  countdownEndsAt: number | null = null;
  winnerId: string | null = null;
  shots: ShotState[] = [];
  private countdownTimer: ReturnType<typeof setTimeout> | null = null;
  private tickTimer: ReturnType<typeof setInterval> | null = null;

  onClose(conn: Connection<ConnState>) {
    const player = this.playerFor(conn);
    if (!player || player.connId !== conn.id) return;
    player.connId = null;
    if (this.phase === "live" && player.alive) {
      player.alive = false;
      this.checkWinner();
    }
    this.broadcastRoom();
  }

  onMessage(sender: Connection<ConnState>, raw: WSMessage) {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(
        typeof raw === "string"
          ? raw
          : new TextDecoder().decode(raw as ArrayBufferView),
      );
    } catch {
      return;
    }
    switch (msg.type) {
      case "join":
        return this.handleJoin(sender, msg);
      case "ready":
        return this.handleReady(sender, msg.ready);
      case "move":
        return this.handleMove(sender, msg.x, msg.y);
      case "aim":
        return this.handleAim(sender, msg.x, msg.y);
      case "shoot":
        return this.handleShoot(sender);
      case "playAgain":
        return this.handlePlayAgain(sender);
    }
  }

  private handleJoin(
    conn: Connection<ConnState>,
    msg: { name: string; token: string },
  ) {
    const token = String(msg.token || "").slice(0, 64);
    if (!token)
      return this.send(conn, { type: "error", message: "missing_token" });
    const existing = this.players.get(token);
    if (existing) {
      existing.connId = conn.id;
      existing.name = sanitizeName(msg.name);
      conn.setState({ playerId: token });
      this.send(conn, { type: "welcome", playerId: token });
      this.broadcastRoom();
      return;
    }
    this.players.set(token, {
      id: token,
      name: sanitizeName(msg.name),
      connId: conn.id,
      ready: false,
      x: null,
      y: null,
      aimX: 1,
      aimY: 0,
      moveX: 0,
      moveY: 0,
      alive: false,
      lastMoveAt: 0,
      lastShotAt: 0,
    });
    conn.setState({ playerId: token });
    this.send(conn, { type: "welcome", playerId: token });
    this.broadcastRoom();
  }

  private handleReady(conn: Connection<ConnState>, ready: boolean) {
    const player = this.playerFor(conn);
    if (!player || this.phase !== "lobby") return;
    player.ready = Boolean(ready);
    this.broadcastRoom();
    this.maybeStartCountdown();
  }

  private handleMove(conn: Connection<ConnState>, x: unknown, y: unknown) {
    const player = this.playerFor(conn);
    const move = direction(x, y);
    if (!player || !move || this.phase !== "live" || !player.alive) return;
    player.moveX = move.x;
    player.moveY = move.y;
  }

  private handleAim(conn: Connection<ConnState>, x: unknown, y: unknown) {
    const player = this.playerFor(conn);
    const aim = direction(x, y);
    if (
      !player ||
      !aim ||
      (aim.x === 0 && aim.y === 0) ||
      this.phase !== "live"
    )
      return;
    player.aimX = aim.x;
    player.aimY = aim.y;
  }

  private handleShoot(conn: Connection<ConnState>) {
    const player = this.playerFor(conn);
    const now = Date.now();
    if (
      !player ||
      this.phase !== "live" ||
      !player.alive ||
      now - player.lastShotAt < SHOT_COOLDOWN_MS
    )
      return;
    player.lastShotAt = now;
    this.shots.push({
      id: `${player.id}-${now}`,
      x: player.x ?? 0,
      y: player.y ?? 0,
      dx: player.aimX,
      dy: player.aimY,
      expiresAt: now + SHOT_VISIBLE_MS,
    });
    let x = (player.x ?? 0) + player.aimX;
    let y = (player.y ?? 0) + player.aimY;
    while (x >= 0 && x < ARENA_WIDTH && y >= 0 && y < ARENA_HEIGHT) {
      const target = [...this.players.values()].find(
        (p) => p.id !== player.id && p.alive && p.x === x && p.y === y,
      );
      if (target) {
        target.alive = false;
        target.moveX = 0;
        target.moveY = 0;
        break;
      }
      x += player.aimX;
      y += player.aimY;
    }
    this.checkWinner();
    this.broadcastRoom();
  }

  private maybeStartCountdown() {
    const connected = [...this.players.values()].filter((p) => p.connId);
    if (
      this.phase !== "lobby" ||
      connected.length === 0 ||
      !connected.every((p) => p.ready)
    )
      return;
    this.phase = "countdown";
    this.countdownEndsAt = Date.now() + COUNTDOWN_MS;
    this.broadcastRoom();
    this.countdownTimer = setTimeout(() => this.goLive(), COUNTDOWN_MS);
  }

  private goLive() {
    if (this.phase !== "countdown") return;
    this.countdownTimer = null;
    this.phase = "live";
    this.countdownEndsAt = null;
    this.winnerId = null;
    this.shots = [];
    const occupied = new Set<string>();
    for (const player of this.players.values()) {
      if (!player.connId) continue;
      let x = 0;
      let y = 0;
      do {
        x = Math.floor(Math.random() * ARENA_WIDTH);
        y = Math.floor(Math.random() * ARENA_HEIGHT);
      } while (occupied.has(`${x},${y}`));
      occupied.add(`${x},${y}`);
      Object.assign(player, {
        x,
        y,
        alive: true,
        moveX: 0,
        moveY: 0,
        aimX: 1,
        aimY: 0,
        lastMoveAt: 0,
        lastShotAt: 0,
      });
    }
    this.checkWinner();
    if (this.phase === "live")
      this.tickTimer = setInterval(() => this.tick(), TICK_MS);
    this.broadcastRoom();
  }

  private tick() {
    if (this.phase !== "live") return;
    const now = Date.now();
    this.shots = this.shots.filter((shot) => shot.expiresAt > now);
    for (const player of this.players.values()) {
      if (
        !player.alive ||
        now - player.lastMoveAt < MOVE_COOLDOWN_MS ||
        (player.moveX === 0 && player.moveY === 0)
      )
        continue;
      const x = Math.max(
        0,
        Math.min(ARENA_WIDTH - 1, (player.x ?? 0) + player.moveX),
      );
      const y = Math.max(
        0,
        Math.min(ARENA_HEIGHT - 1, (player.y ?? 0) + player.moveY),
      );
      if (
        ![...this.players.values()].some(
          (other) =>
            other.id !== player.id &&
            other.alive &&
            other.x === x &&
            other.y === y,
        )
      ) {
        player.x = x;
        player.y = y;
      }
      player.lastMoveAt = now;
    }
    this.broadcastRoom();
  }

  private checkWinner() {
    const alive = [...this.players.values()].filter((p) => p.alive);
    if (alive.length > 1) return;
    this.winnerId = alive[0]?.id ?? null;
    this.phase = "results";
    this.stopTicking();
  }

  private handlePlayAgain(conn: Connection<ConnState>) {
    if (!this.playerFor(conn) || this.phase !== "results") return;
    this.stopTicking();
    this.phase = "lobby";
    this.winnerId = null;
    this.countdownEndsAt = null;
    this.shots = [];
    for (const player of this.players.values())
      Object.assign(player, {
        ready: false,
        x: null,
        y: null,
        alive: false,
        moveX: 0,
        moveY: 0,
      });
    this.broadcastRoom();
  }

  private stopTicking() {
    if (this.tickTimer) clearInterval(this.tickTimer);
    this.tickTimer = null;
  }
  private playerFor(conn: Connection<ConnState>) {
    const id = conn.state?.playerId;
    return id ? (this.players.get(id) ?? null) : null;
  }
  private publicPlayers(): PublicPlayer[] {
    return [...this.players.values()].map(
      ({ id, name, connId, ready, x, y, aimX, aimY, alive }) => ({
        id,
        name,
        connected: connId !== null,
        ready,
        x,
        y,
        aimX,
        aimY,
        alive,
      }),
    );
  }
  private buildRoom(): PublicRoom {
    return {
      phase: this.phase,
      players: this.publicPlayers(),
      countdownEndsAt: this.countdownEndsAt,
      width: ARENA_WIDTH,
      height: ARENA_HEIGHT,
      shots: this.shots.map(({ id, x, y, dx, dy }) => ({ id, x, y, dx, dy })),
      winnerId: this.winnerId,
      winnerName: this.winnerId
        ? (this.players.get(this.winnerId)?.name ?? null)
        : null,
    };
  }
  private broadcastRoom() {
    this.broadcast(
      JSON.stringify({
        type: "room",
        room: this.buildRoom(),
      } satisfies ServerMessage),
    );
  }
  private send(conn: Connection, msg: ServerMessage) {
    conn.send(JSON.stringify(msg));
  }
}
