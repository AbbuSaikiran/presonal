"""
WebSocket connection manager — fan-out broadcaster for live alerts.
"""

import asyncio
import json
import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages all active WebSocket connections and broadcasts messages."""

    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._connections.add(ws)
        logger.info("WS connected — active: %d", len(self._connections))

    async def disconnect(self, ws: WebSocket) -> None:
        async with self._lock:
            self._connections.discard(ws)
        logger.info("WS disconnected — active: %d", len(self._connections))

    async def broadcast(self, message: dict[str, Any]) -> None:
        """Send a JSON message to every connected client."""
        payload = json.dumps(message, default=str)
        dead: list[WebSocket] = []
        async with self._lock:
            targets = list(self._connections)

        for ws in targets:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)

        if dead:
            async with self._lock:
                for ws in dead:
                    self._connections.discard(ws)
            logger.warning("Removed %d dead WS connections", len(dead))

    async def broadcast_new_alert(self, alert_dict: dict[str, Any]) -> None:
        """Wrap alert in the standard event envelope and broadcast."""
        await self.broadcast({"event": "new_alert", "data": alert_dict})

    @property
    def connection_count(self) -> int:
        return len(self._connections)


# Singleton used by the FastAPI app
manager = ConnectionManager()
