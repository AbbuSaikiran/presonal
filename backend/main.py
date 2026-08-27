"""
Sybrai — FastAPI application entry point.

Run with:
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import asyncio
import json
import logging
import random
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_optional_user
from app.config import settings
from app.database import get_db, init_db
from app.models import User
from app.routers import alerts, auth, detection, devices, stats, mcp_agent
from app.routers.detection import explain_anomaly, predict_event
from app.schemas import ExplainRequest, ExplainResponse, PredictRequest, PredictResponse
from app.websocket_manager import manager
from app.mcp_engine import mcp_manager

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("sybrai")


# ---------------------------------------------------------------------------
# Dev-mode live-alert simulator
# ---------------------------------------------------------------------------

_ATTACK_TYPES = [
    "SQL Injection Attempt", "Brute Force Attack", "Port Scan Detected",
    "DDoS Traffic Spike", "Malware C2 Beacon", "Privilege Escalation",
    "Data Exfiltration", "Phishing Link Clicked", "Zero-Day Exploit Attempt",
    "Credential Stuffing", "XSS Payload Injected", "Ransomware Signature Detected",
]
_SOURCES = [
    "192.168.1.104", "10.0.5.231", "185.220.101.57",
    "45.142.212.100", "89.248.167.131", "103.21.244.0",
]
_RISK_LEVELS = ["CRITICAL", "HIGH", "HIGH", "MEDIUM", "MEDIUM", "LOW"]
_COUNTRIES = ["Russia", "China", "North Korea", "Iran", "Unknown", "Netherlands"]
_DESTINATIONS = ["db-server-01", "web-proxy-02", "auth-service", "api-gateway"]
_PROTOCOLS = ["HTTP", "HTTPS", "SSH", "FTP", "DNS", "RDP"]
_MITRE = [
    "Initial Access", "Execution", "Persistence", "Privilege Escalation",
    "Defense Evasion", "Credential Access", "Lateral Movement", "Exfiltration",
]

_alert_counter = 9000  # start IDs beyond seed data


async def _live_alert_simulator() -> None:
    """Broadcast a live alert to all WS clients every 20–45 seconds."""
    global _alert_counter
    await asyncio.sleep(10)  # give the app a moment to start
    while True:
        try:
            delay = random.uniform(20, 45)
            await asyncio.sleep(delay)

            if manager.connection_count == 0:
                continue  # no point broadcasting to nobody

            _alert_counter += 1
            risk = random.choice(_RISK_LEVELS)
            attack = random.choice(_ATTACK_TYPES)
            source = random.choice(_SOURCES)
            dst = random.choice(_DESTINATIONS)
            proto = random.choice(_PROTOCOLS)
            country = random.choice(_COUNTRIES)
            dst_port = random.randint(20, 8443)
            attempt_count = random.randint(1, 500)

            alert_dict = {
                "id": f"ALT-{_alert_counter}",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "source": source,
                "destination": dst,
                "source_port": random.randint(1024, 65535),
                "destination_port": dst_port,
                "protocol": proto,
                "country_of_origin": country,
                "risk_level": risk,
                "status": "OPEN",
                "type": attack,
                "mitre_tactic": random.choice(_MITRE),
                "confidence_score": random.randint(60, 99),
                "false_positive_rate": round(random.uniform(0, 0.15), 3),
                "cve_id": None,
                "user_affected": None,
                "assigned_to": None,
                "packets_transferred": random.randint(100, 50000),
                "bytes_transferred": random.randint(1024, 5000000),
                "attempt_count": attempt_count,
                "description": (
                    f"{attack} detected from {source} targeting {dst} "
                    f"on port {dst_port} via {proto}. "
                    f"{attempt_count} attempt(s) recorded. "
                    f"Traffic originated from {country}."
                ),
                "timeline": [
                    {
                        "time": datetime.now(timezone.utc).isoformat(),
                        "event": "Alert triggered by IDS signature match",
                        "actor": "System",
                    }
                ],
                "tags": [proto, risk.lower(), "live-feed"],
            }

            await manager.broadcast_new_alert(alert_dict)
            logger.info("Simulated live alert broadcast: %s (%s)", alert_dict["id"], risk)

        except asyncio.CancelledError:
            break
        except Exception as exc:
            logger.warning("Live alert simulator error: %s", exc)


# ---------------------------------------------------------------------------
# Lifespan — startup / shutdown
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Sybrai API starting up (AI Detection + MCP Services + Isolation Forest enabled) …")
    try:
        await init_db()
    except Exception as e:
        logger.warning("Database init error: %s", e)
    try:
        await mcp_manager.initialize()
    except Exception as e:
        logger.warning("MCP Manager initialization notice: %s", e)
    simulator_task = asyncio.create_task(_live_alert_simulator())
    yield
    simulator_task.cancel()
    logger.info("Sybrai API shut down.")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Sybrai Cybersecurity API",
    description="REST + WebSocket API with AI Anomaly Detection, Local LLM & MCP Services.",
    version="1.2.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(alerts.router)
app.include_router(devices.router)
app.include_router(stats.router)
app.include_router(detection.router)
app.include_router(mcp_agent.router)


# ---------------------------------------------------------------------------
# Direct Root Endpoints (/predict & /explain) for quick access
# ---------------------------------------------------------------------------

@app.post("/predict", response_model=PredictResponse, tags=["ai-detection"], summary="Score event via Isolation Forest")
async def root_predict(
    body: PredictRequest,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    """Direct alias for /api/detection/predict."""
    return await predict_event(body=body, db=db, _user=user)


@app.post("/explain", response_model=ExplainResponse, tags=["ai-detection"], summary="Generate incident summary via Claude AI")
async def root_explain(
    body: ExplainRequest,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    """Direct alias for /api/detection/explain."""
    return await explain_anomaly(body=body, db=db, _user=user)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health", tags=["system"])
async def health():
    return {
        "status": "ok",
        "ws_connections": manager.connection_count,
        "ai_detection": "active",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# WebSocket — /ws/alerts
# ---------------------------------------------------------------------------

@app.websocket("/ws/alerts")
async def ws_alerts(
    websocket: WebSocket,
    token: str = Query(..., description="JWT access token"),
):
    """
    Live alert feed. Connect with:
        ws://localhost:8000/ws/alerts?token=<jwt>

    Messages from server:
        {"event": "new_alert",      "data": <AlertRead>}
        {"event": "status_updated", "data": {"id": "ALT-001", "status": "RESOLVED"}}
        {"event": "ping",           "data": {"ts": "<iso>"}}
    """
    # Authenticate before accepting
    from app.auth import decode_token
    from app.database import AsyncSessionLocal
    from app.models import User
    from sqlalchemy import select

    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001, reason="Invalid token")
            return
    except Exception:
        await websocket.close(code=4001, reason="Invalid token")
        return

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user or not user.is_active:
            await websocket.close(code=4003, reason="Unauthorized")
            return

    await manager.connect(websocket)
    logger.info("WS authenticated: %s (%s)", user.email, user.role)

    # Send a welcome ping immediately
    try:
        await websocket.send_text(json.dumps({
            "event": "ping",
            "data": {"ts": datetime.now(timezone.utc).isoformat(), "user": user.name},
        }))
    except Exception:
        pass

    # Keepalive + receive loop
    ping_task: asyncio.Task | None = None

    async def _keepalive():
        while True:
            await asyncio.sleep(30)
            try:
                await websocket.send_text(json.dumps({
                    "event": "ping",
                    "data": {"ts": datetime.now(timezone.utc).isoformat()},
                }))
            except Exception:
                break

    ping_task = asyncio.create_task(_keepalive())

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        logger.info("WS disconnected: %s", user.email)
    except Exception as exc:
        logger.warning("WS error for %s: %s", user.email, exc)
    finally:
        if ping_task:
            ping_task.cancel()
        await manager.disconnect(websocket)
