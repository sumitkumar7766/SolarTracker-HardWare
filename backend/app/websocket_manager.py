"""
WebSocket Client Manager
Broadcasts live real-time state (~2 times per second) to connected web dashboards
"""
import json
from typing import Set
from fastapi import WebSocket

class WebSocketManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        print(f"[WS] Client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        print(f"[WS] Client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Broadcasts JSON message to all active WebSocket clients."""
        if not self.active_connections:
            return

        dead_connections = set()
        data_text = json.dumps(message)
        for connection in self.active_connections:
            try:
                await connection.send_text(data_text)
            except Exception:
                dead_connections.add(connection)

        for dead in dead_connections:
            self.active_connections.discard(dead)

ws_manager = WebSocketManager()
