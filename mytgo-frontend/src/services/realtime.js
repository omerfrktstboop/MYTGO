const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL ?? "ws://localhost:8000";

export function createRealtimeSocket(path, token) {
  const url = new URL(path, WS_BASE_URL);
  if (token) {
    url.searchParams.set("token", token);
  }

  return new WebSocket(url);
}
