"""
AI Detection & Explainer Router for Sybrai.

Endpoints:
  - POST /predict — Score incoming events with the Isolation Forest model; auto-create & push alerts on anomaly.
  - POST /explain — Generate incident response summaries and playbooks via Claude API.
  - GET /status   — Health and statistics of the AI detection pipeline.
"""

from __future__ import annotations

import logging
import random
import time
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_optional_user
from app.config import settings
from app.database import get_db
from app.ml.anomaly_detector import detector
from app.models import Alert, User
from app.schemas import (
    AlertRead,
    ExplainRequest,
    ExplainResponse,
    PredictRequest,
    PredictResponse,
)
from app.services.claude_explainer import explainer
from app.websocket_manager import manager

logger = logging.getLogger("sybrai.detection")

router = APIRouter(prefix="/api/detection", tags=["ai-detection"])


@router.get("/status")
async def get_detection_status():
    """Returns the operational status of the AI Detection and Explainer layers."""
    return {
        "status": "online",
        "model": "IsolationForest",
        "contamination": detector.contamination,
        "is_fitted": detector._is_fitted,
        "default_threshold": settings.ANOMALY_THRESHOLD,
        "claude_model": settings.CLAUDE_MODEL,
        "claude_api_configured": bool(settings.ANTHROPIC_API_KEY),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/predict", response_model=PredictResponse)
async def predict_event(
    body: PredictRequest,
    db: AsyncSession = Depends(get_db),
    _user: User | None = Depends(get_optional_user),
):
    """
    Score an incoming network or telemetry event using the Isolation Forest anomaly detector.

    If the anomaly score meets or exceeds the threshold (default 0.65) and `auto_create_alert`
    is True, an Alert record is created in the database and automatically broadcast
    over the `/ws/alerts` WebSocket to connected analyst dashboards.
    """
    event_dict = body.model_dump()

    # Score event with Isolation Forest model
    score_result = detector.score_event(event_dict, threshold=settings.ANOMALY_THRESHOLD)

    anomaly_score = score_result["anomaly_score"]
    is_anomaly = score_result["is_anomaly"]
    risk_level = score_result["risk_level"]
    factors = score_result["anomaly_factors"]
    mitre_tactic = score_result["mitre_tactic"]
    mitre_technique = score_result["mitre_technique"]
    confidence = score_result["confidence_score"]
    fp_rate = score_result["false_positive_rate"]

    alert_created = False
    alert_id: str | None = None
    alert_read: AlertRead | None = None

    # When anomaly exceeds threshold and auto_create_alert is True, record and broadcast
    if (is_anomaly or anomaly_score >= settings.ANOMALY_THRESHOLD) and body.auto_create_alert:
        # Generate clean alert ID e.g. ALT-9821
        rand_suffix = random.randint(1000, 9999)
        alert_id = f"ALT-{rand_suffix}"

        now = datetime.now(timezone.utc)
        desc = (
            body.description
            or f"AI-detected anomaly: {body.type} from {body.source} targeting {body.destination}:{body.destination_port}. "
               f"Anomaly Score: {anomaly_score:.2f}. Identified triggers: {'; '.join(factors)}."
        )

        timeline = [
            {
                "time": now.isoformat(),
                "event": "Isolation Forest anomaly detector flagged high-risk behavior",
                "actor": "Sybrai AI Engine",
            },
            {
                "time": now.isoformat(),
                "event": f"Anomaly score {anomaly_score:.2f} ({risk_level}) triggered auto-alert generation",
                "actor": "System",
            },
        ]

        tags = list(body.tags)
        if body.protocol not in tags:
            tags.append(body.protocol)
        tags.append("ai-flagged")
        tags.append(risk_level.lower())

        new_alert = Alert(
            id=alert_id,
            timestamp=now,
            source=body.source,
            destination=body.destination,
            source_port=body.source_port,
            destination_port=body.destination_port,
            protocol=body.protocol,
            country_of_origin=body.country_of_origin,
            risk_level=risk_level,
            status="OPEN",
            type=body.type,
            mitre_tactic=mitre_tactic,
            confidence_score=confidence,
            false_positive_rate=fp_rate,
            cve_id=body.cve_id,
            user_affected=body.user_affected,
            assigned_to=None,
            packets_transferred=body.packets_transferred,
            bytes_transferred=body.bytes_transferred,
            attempt_count=body.attempt_count,
            description=desc,
            timeline=timeline,
            tags=tags,
        )

        try:
            db.add(new_alert)
            await db.commit()
            await db.refresh(new_alert)
            alert_read = AlertRead.model_validate(new_alert)
            alert_created = True

            # Broadcast over WebSocket to all active dashboards
            alert_payload = alert_read.model_dump(mode="json")
            await manager.broadcast_new_alert(alert_payload)
            logger.info("AI Alert %s created & broadcast to %d client(s)", alert_id, manager.connection_count)

        except Exception as db_err:
            logger.warning("Could not persist alert to database (falling back to in-memory alert): %s", db_err)
            await db.rollback()
            # If DB is offline or table issue, still form the alert_read and broadcast
            alert_read = AlertRead(
                id=alert_id,
                timestamp=now,
                source=body.source,
                destination=body.destination,
                source_port=body.source_port,
                destination_port=body.destination_port,
                protocol=body.protocol,
                country_of_origin=body.country_of_origin,
                risk_level=risk_level,
                status="OPEN",
                type=body.type,
                mitre_tactic=mitre_tactic,
                confidence_score=confidence,
                false_positive_rate=fp_rate,
                cve_id=body.cve_id,
                user_affected=body.user_affected,
                assigned_to=None,
                packets_transferred=body.packets_transferred,
                bytes_transferred=body.bytes_transferred,
                attempt_count=body.attempt_count,
                description=desc,
                timeline=timeline,
                tags=tags,
            )
            alert_created = True
            await manager.broadcast_new_alert(alert_read.model_dump(mode="json"))

    return PredictResponse(
        anomaly_score=anomaly_score,
        is_anomaly=is_anomaly,
        risk_level=risk_level,
        threshold=settings.ANOMALY_THRESHOLD,
        confidence_score=confidence,
        false_positive_rate=fp_rate,
        anomaly_factors=factors,
        mitre_tactic=mitre_tactic,
        mitre_technique=mitre_technique,
        alert_created=alert_created,
        alert_id=alert_id,
        alert=alert_read,
    )


@router.post("/explain", response_model=ExplainResponse)
async def explain_anomaly(
    body: ExplainRequest,
    db: AsyncSession = Depends(get_db),
    _user: User | None = Depends(get_optional_user),
):
    """
    Generate a plain-language SOC incident summary and recommended action plan
    for a high-risk anomaly using Claude AI.

    Accepts either an `alert_id` (fetches existing alert from DB) or a custom
    `event` payload dictionary.
    """
    event_data: dict[str, Any] = {}

    if body.alert_id:
        result = await db.execute(select(Alert).where(Alert.id == body.alert_id))
        alert = result.scalar_one_or_none()
        if not alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Alert '{body.alert_id}' not found in database",
            )
        event_data = AlertRead.model_validate(alert).model_dump(mode="json")
        if body.event:
            event_data.update(body.event)
    elif body.event:
        event_data = dict(body.event)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either 'alert_id' or 'event' payload must be provided",
        )

    # Invoke Claude AI Explainer
    explanation = await explainer.explain_anomaly(event_data)

    return ExplainResponse(
        incident_summary=explanation["incident_summary"],
        threat_assessment=explanation["threat_assessment"],
        recommended_actions=explanation["recommended_actions"],
        suggested_status=explanation["suggested_status"],
        model_used=explanation["model_used"],
        raw_explanation=explanation["raw_explanation"],
        alert_id=body.alert_id or event_data.get("id"),
    )
