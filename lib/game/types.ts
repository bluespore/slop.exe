export type RoomPhase = "lobby" | "countdown" | "live" | "results";

export interface PublicPlayer {
  id: string;
  name: string;
  connected: boolean;
  ready: boolean;
  x: number | null;
  y: number | null;
  aimX: number;
  aimY: number;
  alive: boolean;
}

export interface PublicShot {
  id: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
}

export interface PublicRoom {
  phase: RoomPhase;
  players: PublicPlayer[];
  countdownEndsAt: number | null;
  width: number;
  height: number;
  shots: PublicShot[];
  winnerId: string | null;
  winnerName: string | null;
}

export type ClientMessage =
  | { type: "join"; name: string; token: string }
  | { type: "ready"; ready: boolean }
  | { type: "move"; x: number; y: number }
  | { type: "aim"; x: number; y: number }
  | { type: "shoot" }
  | { type: "playAgain" };

export type ServerMessage =
  | { type: "welcome"; playerId: string }
  | { type: "room"; room: PublicRoom }
  | { type: "error"; message: string };
