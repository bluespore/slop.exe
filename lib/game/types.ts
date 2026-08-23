export type RoomPhase = "lobby" | "countdown" | "live" | "results";

export interface PublicPlayer {
  id: string;
  name: string;
  connected: boolean;
  ready: boolean;
}

export interface PublicRoom {
  phase: RoomPhase;
  players: PublicPlayer[];
  countdownEndsAt: number | null;
  buttonPos: { x: number; y: number } | null;
  winnerId: string | null;
  winnerName: string | null;
}

export type ClientMessage =
  | { type: "join"; name: string; token: string }
  | { type: "ready"; ready: boolean }
  | { type: "click" }
  | { type: "playAgain" };

export type ServerMessage =
  | { type: "welcome"; playerId: string }
  | { type: "room"; room: PublicRoom }
  | { type: "error"; message: string };
