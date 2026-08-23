"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import usePartySocket from "partysocket/react";

import { getOrCreateToken } from "./identity";
import type { ClientMessage, PublicRoom, ServerMessage } from "./game/types";

const PARTYKIT_HOST =
  process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "127.0.0.1:1999";

export function useRoomSocket(roomCode: string, name: string) {
  const [connected, setConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [room, setRoom] = useState<PublicRoom | null>(null);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<{ send: (data: string) => void } | null>(null);

  const send = useCallback((msg: ClientMessage) => {
    socketRef.current?.send(JSON.stringify(msg));
  }, []);

  const socket = usePartySocket({
    host: PARTYKIT_HOST,
    room: roomCode,
    onOpen() {
      setConnected(true);
      setError(null);
      send({ type: "join", name, token: getOrCreateToken() });
    },
    onClose() {
      setConnected(false);
    },
    onMessage(event) {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }
      switch (msg.type) {
        case "welcome":
          setPlayerId(msg.playerId);
          break;
        case "room":
          setRoom(msg.room);
          break;
        case "error":
          setError(msg.message);
          break;
      }
    },
  });

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  const actions = useMemo(
    () => ({
      setReady: (ready: boolean) => send({ type: "ready", ready }),
      click: () => send({ type: "click" }),
      playAgain: () => send({ type: "playAgain" }),
    }),
    [send],
  );

  return { connected, playerId, room, error, actions };
}
