const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function randomRoomCode(length = 4): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

/** Client-only helpers — call from effects/handlers, never during SSR. */
export function getStoredName(): string {
  return window.localStorage.getItem("slop:name") ?? "";
}

export function storeName(name: string) {
  window.localStorage.setItem("slop:name", name);
}

export function getOrCreateToken(): string {
  let token = window.localStorage.getItem("slop:token");
  if (!token) {
    token = window.crypto.randomUUID();
    window.localStorage.setItem("slop:token", token);
  }
  return token;
}
