from collections import defaultdict

from fastapi import WebSocket


class RealtimeConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, channel: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections[channel].add(websocket)

    def disconnect(self, channel: str, websocket: WebSocket) -> None:
        self._connections[channel].discard(websocket)
        if not self._connections[channel]:
            self._connections.pop(channel, None)

    async def broadcast_json(self, channel: str, payload: dict) -> None:
        dead_connections: list[WebSocket] = []
        for websocket in self._connections.get(channel, set()).copy():
            try:
                await websocket.send_json(payload)
            except RuntimeError:
                dead_connections.append(websocket)

        for websocket in dead_connections:
            self.disconnect(channel, websocket)


realtime_manager = RealtimeConnectionManager()
