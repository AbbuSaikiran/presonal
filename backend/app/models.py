"""
SQLAlchemy ORM models for Sybrai.

Tables:
  - users    — authentication & profile
  - alerts   — threat alert records
  - devices  — monitored endpoints
"""

from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[str] = mapped_column(String(60), nullable=False, default="Read Only")
    avatar: Mapped[str] = mapped_column(String(10), nullable=False, default="?")
    # Stored as JSON list e.g. ["read", "write", "admin"]
    permissions: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, nullable=False
    )


# ---------------------------------------------------------------------------
# Alert
# ---------------------------------------------------------------------------

class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[str] = mapped_column(String(20), primary_key=True)  # e.g. ALT-2024
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)

    # Network
    source: Mapped[str] = mapped_column(String(60), nullable=False)
    destination: Mapped[str] = mapped_column(String(120), nullable=False)
    source_port: Mapped[int] = mapped_column(Integer, nullable=False)
    destination_port: Mapped[int] = mapped_column(Integer, nullable=False)
    protocol: Mapped[str] = mapped_column(String(20), nullable=False)
    country_of_origin: Mapped[str] = mapped_column(String(60), nullable=False)

    # Classification
    risk_level: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, index=True, default="OPEN")
    type: Mapped[str] = mapped_column(String(120), nullable=False)

    # Threat intel
    mitre_tactic: Mapped[str | None] = mapped_column(String(80), nullable=True)
    confidence_score: Mapped[int] = mapped_column(Integer, default=50)
    false_positive_rate: Mapped[float] = mapped_column(Float, default=0.0)
    cve_id: Mapped[str | None] = mapped_column(String(30), nullable=True)
    user_affected: Mapped[str | None] = mapped_column(String(120), nullable=True)
    assigned_to: Mapped[str | None] = mapped_column(String(120), nullable=True)

    # Traffic
    packets_transferred: Mapped[int] = mapped_column(Integer, default=0)
    bytes_transferred: Mapped[int] = mapped_column(Integer, default=0)
    attempt_count: Mapped[int] = mapped_column(Integer, default=1)

    # Rich fields stored as JSON
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    timeline: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    tags: Mapped[list] = mapped_column(JSON, nullable=False, default=list)


# ---------------------------------------------------------------------------
# Device
# ---------------------------------------------------------------------------

class Device(Base):
    __tablename__ = "devices"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    hostname: Mapped[str] = mapped_column(String(120), nullable=False, unique=True)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False)
    os: Mapped[str] = mapped_column(String(80), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="online")
    last_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now)
    endpoints_count: Mapped[int] = mapped_column(Integer, default=1)
    risk_level: Mapped[str] = mapped_column(String(20), nullable=False, default="LOW")
