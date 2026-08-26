"""
Pydantic v2 schemas for request/response validation.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str = Field(default="ANALYST", description="ADMIN | ANALYST | OPERATOR | VIEWER")
    department: str = Field(default="SOC Operations", max_length=100)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    reset_code: str
    new_password: str = Field(..., min_length=6)


class UserRead(BaseModel):
    id: str
    email: str
    name: str
    role: str
    avatar: str
    permissions: list[str]
    mfa_enabled: bool
    last_login: datetime | None

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


# ---------------------------------------------------------------------------
# Alert
# ---------------------------------------------------------------------------

class TimelineEvent(BaseModel):
    time: datetime
    event: str
    actor: str

    model_config = {"from_attributes": True}


class AlertRead(BaseModel):
    id: str
    timestamp: datetime
    source: str
    destination: str
    source_port: int
    destination_port: int
    protocol: str
    country_of_origin: str
    risk_level: str
    status: str
    type: str
    mitre_tactic: str | None
    confidence_score: int
    false_positive_rate: float
    cve_id: str | None
    user_affected: str | None
    assigned_to: str | None
    packets_transferred: int
    bytes_transferred: int
    attempt_count: int
    description: str | None
    timeline: list[dict[str, Any]]
    tags: list[str]

    model_config = {"from_attributes": True}


class AlertListResponse(BaseModel):
    alerts: list[AlertRead]
    total: int
    page: int
    limit: int
    total_pages: int


class AlertStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(OPEN|INVESTIGATING|MITIGATED|RESOLVED|FALSE_POSITIVE)$")


# ---------------------------------------------------------------------------
# Device
# ---------------------------------------------------------------------------

class DeviceRead(BaseModel):
    id: str
    hostname: str
    ip_address: str
    os: str
    status: str
    last_seen: datetime
    endpoints_count: int
    risk_level: str

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------

class StatsResponse(BaseModel):
    total_alerts_today: int
    critical_open: int
    mitigated_24h: int
    avg_response_time_minutes: int
    threats_blocked: int
    endpoints_monitored: int
    active_investigations: int
    false_positive_rate: str


class TrendPoint(BaseModel):
    time: str
    critical: int
    high: int
    medium: int
    low: int


class TopSource(BaseModel):
    ip: str
    country: str
    count: int
    risk: str


# ---------------------------------------------------------------------------
# AI Detection & Anomaly Model
# ---------------------------------------------------------------------------

class PredictRequest(BaseModel):
    source: str = Field(..., description="Source IP address", example="185.220.101.57")
    destination: str = Field(..., description="Target hostname or IP", example="db-server-01")
    source_port: int = Field(default=49152, ge=0, le=65535)
    destination_port: int = Field(default=5432, ge=0, le=65535)
    protocol: str = Field(default="TCP", example="TCP")
    country_of_origin: str = Field(default="Unknown", example="Russia")
    type: str = Field(default="Suspicious Inbound Connection", example="SQL Injection Attempt")
    packets_transferred: int = Field(default=1200, ge=0)
    bytes_transferred: int = Field(default=850000, ge=0)
    attempt_count: int = Field(default=35, ge=1)
    mitre_tactic: str | None = Field(default=None, example="Initial Access")
    cve_id: str | None = Field(default=None, example="CVE-2024-3094")
    user_affected: str | None = Field(default=None, example="svc_database")
    description: str | None = Field(default=None)
    tags: list[str] = Field(default_factory=list)
    auto_create_alert: bool = Field(
        default=True,
        description="If True, automatically saves an Alert in DB and broadcasts on /ws/alerts when score >= threshold",
    )


class PredictResponse(BaseModel):
    anomaly_score: float = Field(..., description="Normalized anomaly score between 0.0 (normal) and 1.0 (highly anomalous)")
    is_anomaly: bool = Field(..., description="True if anomaly_score >= threshold")
    risk_level: str = Field(..., description="CRITICAL | HIGH | MEDIUM | LOW")
    threshold: float
    confidence_score: int
    false_positive_rate: float
    anomaly_factors: list[str]
    mitre_tactic: str | None
    mitre_technique: str | None
    alert_created: bool
    alert_id: str | None = None
    alert: AlertRead | None = None


# ---------------------------------------------------------------------------
# AI Explainer (Claude Integration)
# ---------------------------------------------------------------------------

class ExplainRequest(BaseModel):
    alert_id: str | None = Field(default=None, description="Optional ID of existing alert in DB")
    event: dict[str, Any] | None = Field(default=None, description="Optional raw event or anomaly payload")


class ExplainResponse(BaseModel):
    incident_summary: str
    threat_assessment: str
    recommended_actions: list[str]
    suggested_status: str
    model_used: str
    raw_explanation: str
    alert_id: str | None = None


# ---------------------------------------------------------------------------
# WebSocket
# ---------------------------------------------------------------------------

class LiveAlertEvent(BaseModel):
    event: str = "new_alert"
    data: AlertRead
