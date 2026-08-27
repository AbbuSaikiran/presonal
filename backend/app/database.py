import os
import sys
import json
import logging
from datetime import datetime, timezone, timedelta
import random

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import select, text

from app.config import settings

logger = logging.getLogger("sybrai.db")


class Base(DeclarativeBase):
    pass


# Database engine state
_engine = None
_AsyncSessionLocal = None


def get_engine():
    global _engine
    if _engine is None:
        db_url = settings.DATABASE_URL
        # If postgres URL specified, test or fallback
        try:
            if "postgresql" in db_url:
                _engine = create_async_engine(
                    db_url,
                    echo=False,
                    pool_pre_ping=True,
                )
            else:
                _engine = create_async_engine(
                    db_url,
                    echo=False,
                )
        except Exception as e:
            logger.warning(f"Error creating primary engine with {db_url}: {e}. Falling back to SQLite.")
            _engine = create_sqlite_engine()
    return _engine


def create_sqlite_engine():
    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sybrai.db")
    sqlite_url = f"sqlite+aiosqlite:///{db_path}"
    logger.info(f"Using local SQLite database: {sqlite_url}")
    return create_async_engine(sqlite_url, echo=False)


def get_sessionmaker():
    global _AsyncSessionLocal
    if _AsyncSessionLocal is None:
        _AsyncSessionLocal = async_sessionmaker(
            bind=get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _AsyncSessionLocal


# Module-level alias for existing imports
engine = get_engine()
AsyncSessionLocal = get_sessionmaker()


async def init_db():
    """Initializes tables and seeds initial data if needed."""
    global _engine, _AsyncSessionLocal, engine, AsyncSessionLocal

    # Ensure models are loaded into Base.metadata
    import app.models  # noqa: F401

    # Test connection to primary engine
    try:
        async with _engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            logger.info("Database schema initialized.")
    except Exception as e:
        logger.warning(f"PostgreSQL connection failed ({e}). Switching to local SQLite database.")
        _engine = create_sqlite_engine()
        _AsyncSessionLocal = async_sessionmaker(
            bind=_engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
        engine = _engine
        AsyncSessionLocal = _AsyncSessionLocal

        async with _engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            logger.info("SQLite database schema initialized.")

    # Seed default users and sample data if database is empty
    await _seed_initial_data()


async def _seed_initial_data():
    """Seeds default accounts if user table is empty."""
    from app.models import User, Device, Alert
    from app.auth import hash_password

    async with AsyncSessionLocal() as session:
        try:
            res = await session.execute(select(User))
            existing_user = res.scalars().first()
            if existing_user:
                return  # already seeded

            logger.info("Seeding initial administrator & analyst accounts...")
            users = [
                User(
                    id="usr-001",
                    email="admin@sybrai.io",
                    name="Sarah Connor (Admin)",
                    hashed_password=hash_password("Admin@1234"),
                    role="ADMIN",
                    avatar="SC",
                    permissions=["read", "write", "admin:full", "alerts:manage"],
                    mfa_enabled=True,
                    is_active=True,
                    created_at=datetime.now(timezone.utc),
                    last_login=datetime.now(timezone.utc),
                ),
                User(
                    id="usr-002",
                    email="analyst@sybrai.io",
                    name="Marcus Vance",
                    hashed_password=hash_password("Analyst@1234"),
                    role="ANALYST",
                    avatar="MV",
                    permissions=["read", "write", "alerts:manage"],
                    mfa_enabled=True,
                    is_active=True,
                    created_at=datetime.now(timezone.utc),
                    last_login=datetime.now(timezone.utc),
                ),
                User(
                    id="usr-003",
                    email="hunter@sybrai.io",
                    name="Elena Rostova",
                    hashed_password=hash_password("Hunter@1234"),
                    role="OPERATOR",
                    avatar="ER",
                    permissions=["read", "write"],
                    mfa_enabled=False,
                    is_active=True,
                    created_at=datetime.now(timezone.utc),
                    last_login=datetime.now(timezone.utc),
                ),
            ]
            session.add_all(users)

            # Seed devices
            devices = [
                Device(id="dev-001", hostname="db-server-01", ip_address="10.0.1.10", os="Ubuntu 22.04 LTS", status="online", endpoints_count=45, risk_level="HIGH"),
                Device(id="dev-002", hostname="web-proxy-02", ip_address="10.0.1.20", os="CentOS 7", status="online", endpoints_count=62, risk_level="MEDIUM"),
                Device(id="dev-003", hostname="auth-service", ip_address="10.0.1.30", os="Debian 11", status="online", endpoints_count=28, risk_level="CRITICAL"),
                Device(id="dev-004", hostname="api-gateway", ip_address="10.0.1.40", os="Ubuntu 20.04 LTS", status="online", endpoints_count=80, risk_level="HIGH"),
            ]
            session.add_all(devices)

            # Seed initial alerts
            alerts = [
                Alert(
                    id="ALT-9042",
                    timestamp=datetime.now(timezone.utc) - timedelta(minutes=15),
                    source="185.220.101.57",
                    destination="db-server-01",
                    source_port=51234,
                    destination_port=5432,
                    protocol="TCP",
                    country_of_origin="Russia",
                    risk_level="CRITICAL",
                    status="OPEN",
                    type="SQL Injection Attempt",
                    mitre_tactic="Initial Access",
                    confidence_score=94,
                    false_positive_rate=0.02,
                    cve_id="CVE-2024-3094",
                    user_affected="svc_database",
                    assigned_to="admin@sybrai.io",
                    packets_transferred=25000,
                    bytes_transferred=18500000,
                    attempt_count=320,
                    description="SQL Injection and unauthorized data extraction attempt detected against PostgreSQL cluster.",
                    timeline=[{"time": datetime.now(timezone.utc).isoformat(), "event": "Signature trigger on port 5432", "actor": "IDS"}],
                    tags=["TCP", "critical", "database"],
                ),
                Alert(
                    id="ALT-9041",
                    timestamp=datetime.now(timezone.utc) - timedelta(minutes=45),
                    source="45.154.255.89",
                    destination="auth-service",
                    source_port=48120,
                    destination_port=22,
                    protocol="SSH",
                    country_of_origin="North Korea",
                    risk_level="HIGH",
                    status="INVESTIGATING",
                    type="SSH Brute Force",
                    mitre_tactic="Credential Access",
                    confidence_score=88,
                    false_positive_rate=0.04,
                    cve_id=None,
                    user_affected="root",
                    assigned_to="analyst@sybrai.io",
                    packets_transferred=8500,
                    bytes_transferred=340000,
                    attempt_count=180,
                    description="Repeated automated dictionary attacks on bastion SSH listener.",
                    timeline=[{"time": datetime.now(timezone.utc).isoformat(), "event": "Rate limit exceeded", "actor": "Auth Guard"}],
                    tags=["SSH", "brute-force"],
                ),
            ]
            session.add_all(alerts)

            await session.commit()
            logger.info("Default seed data successfully populated.")
        except Exception as e:
            logger.error(f"Error seeding initial data: {e}")
            await session.rollback()


async def get_db() -> AsyncSession:  # type: ignore[return]
    """FastAPI dependency — yields a DB session per request."""
    session_factory = get_sessionmaker()
    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
