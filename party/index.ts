import { Server, type Connection, type WSMessage } from "partyserver";

import type {
  ClientMessage,
  PublicPlayer,
  PublicRoom,
  RoomPhase,
  ServerMessage,
} from "../lib/game/types";

const COUNTDOWN_MS = 10_000;
const NAME_MAX = 20;
/** Keeps the button fully on-screen regardless of viewport size. */
const POS_MIN = 5;
const POS_RANGE = 85;

interface PlayerState {
  id: string;
  name: string;
  connId: string | null;
  ready: boolean;
}

interface ConnState {
  playerId: string;
}

function sanitizeName(raw: unknown): string {
  const name = String(raw ?? "")
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .trim()
    .slice(0, NAME_MAX);
  return name || "PLAYER";
}

/**
 * One Durable Object per room code. Owns the whole game as an in-memory
 * state machine: lobby (ready up) -> countdown (10s, fixed once everyone's
 * ready) -> live (button appears at a random spot, first click wins) ->
 * results -> back to lobby on "play again".
 */
export default class ButtonRoom extends Server {
  phase: RoomPhase = "lobby";
  players = new Map<string, PlayerState>();
  countdownEndsAt: number | null = null;
  buttonPos: { x: number; y: number } | null = null;
  winnerId: string | null = null;

  private countdownTimer: ReturnType<typeof setTimeout> | null = null;

  onClose(conn: Connection<ConnState>) {
    const playerId = conn.state?.playerId;
    if (!playerId) return;
    const player = this.players.get(playerId);
    if (!player || player.connId !== conn.id) return;
    player.connId = null;
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
      case "click":
        return this.handleClick(sender);
      case "playAgain":
        return this.handlePlayAgain(sender);
    }
  }

  private handleJoin(
    conn: Connection<ConnState>,
    msg: { name: string; token: string },
  ) {
    const token = String(msg.token || "").slice(0, 64);
    if (!token) {
      return this.send(conn, { type: "error", message: "missing_token" });
    }
    const name = sanitizeName(msg.name);

    const existing = this.players.get(token);
    if (existing) {
      // Reconnect: rebind the connection, keep whatever state they had.
      existing.connId = conn.id;
      existing.name = name;
      conn.setState({ playerId: existing.id });
      this.send(conn, { type: "welcome", playerId: existing.id });
      this.broadcastRoom();
      return;
    }

    this.players.set(token, {
      id: token,
      name,
      connId: conn.id,
      ready: false,
    });
    conn.setState({ playerId: token });
    this.send(conn, { type: "welcome", playerId: token });
    this.broadcastRoom();
  }

  private handleReady(sender: Connection<ConnState>, ready: boolean) {
    const p = this.playerFor(sender);
    if (!p || this.phase !== "lobby") return;
    p.ready = ready;
    this.broadcastRoom();
    this.maybeStartCountdown();
  }

  /** Every connected player ready (at least one) starts the countdown. */
  private maybeStartCountdown() {
    if (this.phase !== "lobby") return;
    const connected = [...this.players.values()].filter((p) => p.connId);
    if (connected.length === 0 || !connected.every((p) => p.ready)) return;

    this.phase = "countdown";
    this.countdownEndsAt = Date.now() + COUNTDOWN_MS;
    this.broadcastRoom();
    this.countdownTimer = setTimeout(() => this.goLive(), COUNTDOWN_MS);
  }

  private goLive() {
    this.countdownTimer = null;
    if (this.phase !== "countdown") return;
    this.phase = "live";
    this.countdownEndsAt = null;
    this.buttonPos = {
      x: POS_MIN + Math.random() * POS_RANGE,
      y: POS_MIN + Math.random() * POS_RANGE,
    };
    this.broadcastRoom();
  }

  private handleClick(sender: Connection<ConnState>) {
    const p = this.playerFor(sender);
    if (!p || this.phase !== "live") return;
    // First message wins; every later click this tick is a no-op because
    // phase is no longer "live".
    this.phase = "results";
    this.winnerId = p.id;
    this.buttonPos = null;
    this.broadcastRoom();
  }

  private handlePlayAgain(sender: Connection<ConnState>) {
    const p = this.playerFor(sender);
    if (!p || this.phase !== "results") return;
    this.phase = "lobby";
    this.winnerId = null;
    this.buttonPos = null;
    this.countdownEndsAt = null;
    for (const player of this.players.values()) player.ready = false;
    this.broadcastRoom();
  }

  private playerFor(conn: Connection<ConnState>): PlayerState | null {
    const id = conn.state?.playerId;
    return id ? (this.players.get(id) ?? null) : null;
  }

  private publicPlayers(): PublicPlayer[] {
    return [...this.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      connected: p.connId !== null,
      ready: p.ready,
    }));
  }

  private buildRoom(): PublicRoom {
    return {
      phase: this.phase,
      players: this.publicPlayers(),
      countdownEndsAt: this.countdownEndsAt,
      buttonPos: this.buttonPos,
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
