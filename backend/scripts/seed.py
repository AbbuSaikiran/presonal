"""
Sybrai seed script — populates the database with demo users, alerts, and devices.

Usage (run from the backend/ directory):
    python scripts/seed.py

Requires DATABASE_URL in backend/.env or the environment.
Idempotent: existing rows are skipped (ON CONFLICT DO NOTHING).
"""

from __future__ import annotations

import asyncio
import json
import random
import sys
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Make sure `app.*` is importable when run as a script.
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.auth import hash_password
from app.config import settings

# ---------------------------------------------------------------------------
# Seed data mirrors src/data/mockData.js exactly so the UI looks the same
# ---------------------------------------------------------------------------

RISK_LEVELS = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]
STATUSES = ["OPEN", "INVESTIGATING", "MITIGATED", "RESOLVED", "FALSE_POSITIVE"]
SOURCES = [
    "192.168.1.104", "10.0.5.231", "172.16.8.42", "185.220.101.57",
    "45.142.212.100", "89.248.167.131", "103.21.244.0", "198.51.100.14",
    "203.0.113.8", "91.108.4.5", "192.99.168.50", "77.88.21.3",
]
ATTACK_TYPES = [
    "SQL Injection Attempt", "Brute Force Attack", "Port Scan Detected",
    "DDoS Traffic Spike", "Malware C2 Beacon", "Privilege Escalation",
    "Data Exfiltration", "Phishing Link Clicked", "Zero-Day Exploit Attempt",
    "Credential Stuffing", "XSS Payload Injected", "Ransomware Signature Detected",
    "Lateral Movement", "Insider Threat Behavior", "DNS Tunneling",
]
PROTOCOLS = ["HTTP", "HTTPS", "SSH", "FTP", "SMTP", "DNS", "RDP", "SMB"]
DESTINATIONS = [
    "db-server-01", "web-proxy-02", "auth-service", "api-gateway",
    "file-server-03", "mail-relay", "vpn-endpoint", "k8s-master",
]
COUNTRIES = ["Russia", "China", "North Korea", "Iran", "Unknown", "USA", "Netherlands", "Germany"]
MITRE_TACTICS = [
    "Initial Access", "Execution", "Persistence", "Privilege Escalation",
    "Defense Evasion", "Credential Access", "Discovery", "Lateral Movement",
    "Collection", "Exfiltration", "Impact",
]


def _rand(arr: list):
    return random.choice(arr)


def _gen_ts(days_ago: int, hours_ago: int) -> datetime:
    d = datetime.now(timezone.utc)
    d -= timedelta(days=days_ago, hours=hours_ago)
    d = d.replace(minute=random.randint(0, 59), second=random.randint(0, 59), microsecond=0)
    return d


def build_alerts() -> list[dict]:
    alerts = []
    for i in range(38):
        risk = RISK_LEVELS[min(i % 6, 4)]
        attack = _rand(ATTACK_TYPES)
        src = _rand(SOURCES)
        dst = _rand(DESTINATIONS)
        proto = _rand(PROTOCOLS)
        country = _rand(COUNTRIES)
        port = random.randint(1024, 65535)
        dst_port = random.randint(20, 8443)
        packets = random.randint(100, 150000)
        bytez = random.randint(1024, 50_000_000)
        attempts = random.randint(1, 500)
        ts = _gen_ts(i // 6, i % 24)

        timeline = [
            {
                "time": ts.isoformat(),
                "event": "Alert triggered by IDS signature match",
                "actor": "System",
            },
            {
                "time": (ts + timedelta(minutes=5)).isoformat(),
                "event": "Automated threat correlation completed",
                "actor": "Threat Intelligence Engine",
            },
        ]
        if i % 3 == 0:
            timeline.append({
                "time": (ts + timedelta(minutes=12)).isoformat(),
                "event": "Assigned to security analyst for review",
                "actor": "SOC Automation",
            })

        tags = [proto]
        if country != "Unknown":
            tags.append("geo-flagged")
        if risk == "CRITICAL":
            tags.append("priority-1")

        alerts.append({
            "id": f"ALT-{2024 + i:04d}",
            "timestamp": ts,
            "source": src,
            "destination": dst,
            "source_port": port,
            "destination_port": dst_port,
            "protocol": proto,
            "country_of_origin": country,
            "risk_level": risk,
            "status": _rand(STATUSES),
            "type": attack,
            "mitre_tactic": _rand(MITRE_TACTICS),
            "confidence_score": random.randint(55, 99),
            "false_positive_rate": round(random.uniform(0, 0.15), 3),
            "cve_id": f"CVE-{random.randint(2020,2024)}-{random.randint(10000,99999)}" if i % 4 == 0 else None,
            "user_affected": f"user{random.randint(100,999)}@corp.internal" if i % 3 == 0 else None,
            "assigned_to": f"analyst{random.randint(1,5)}@sybrai.io" if i % 4 == 0 else None,
            "packets_transferred": packets,
            "bytes_transferred": bytez,
            "attempt_count": attempts,
            "description": (
                f"{attack} detected from {src} targeting {dst} on port {dst_port} via {proto}. "
                f"{attempts} attempt{'s' if attempts > 1 else ''} recorded. "
                f"Traffic originated from {country}."
            ),
            "timeline": timeline,
            "tags": tags,
        })

    alerts.sort(key=lambda a: a["timestamp"], reverse=True)
    return alerts


USERS = [
    {
        "id": "usr-001",
        "email": "admin@sybrai.io",
        "plain_password": "Admin@1234",
        "name": "Alex Mercer",
        "role": "Administrator",
        "avatar": "AM",
        "permissions": ["read", "write", "admin"],
        "mfa_enabled": True,
    },
    {
        "id": "usr-002",
        "email": "analyst@sybrai.io",
        "plain_password": "Analyst@1234",
        "name": "Jordan Lee",
        "role": "SOC Analyst",
        "avatar": "JL",
        "permissions": ["read", "write"],
        "mfa_enabled": True,
    },
    {
        "id": "usr-003",
        "email": "viewer@sybrai.io",
        "plain_password": "Viewer@1234",
        "name": "Sam Rivera",
        "role": "Read Only",
        "avatar": "SR",
        "permissions": ["read"],
        "mfa_enabled": False,
    },
]

DEVICES = [
    {"id": "dev-001", "hostname": "db-server-01",   "ip_address": "10.0.1.10",  "os": "Ubuntu 22.04 LTS",     "status": "online",  "endpoints_count": 45, "risk_level": "HIGH"},
    {"id": "dev-002", "hostname": "web-proxy-02",   "ip_address": "10.0.1.20",  "os": "CentOS 7",             "status": "online",  "endpoints_count": 62, "risk_level": "MEDIUM"},
    {"id": "dev-003", "hostname": "auth-service",   "ip_address": "10.0.1.30",  "os": "Debian 11",            "status": "online",  "endpoints_count": 28, "risk_level": "CRITICAL"},
    {"id": "dev-004", "hostname": "api-gateway",    "ip_address": "10.0.1.40",  "os": "Ubuntu 20.04 LTS",     "status": "online",  "endpoints_count": 80, "risk_level": "HIGH"},
    {"id": "dev-005", "hostname": "file-server-03", "ip_address": "10.0.1.50",  "os": "Windows Server 2022",  "status": "warning", "endpoints_count": 35, "risk_level": "MEDIUM"},
    {"id": "dev-006", "hostname": "mail-relay",     "ip_address": "10.0.1.60",  "os": "Ubuntu 22.04 LTS",     "status": "online",  "endpoints_count": 18, "risk_level": "LOW"},
    {"id": "dev-007", "hostname": "vpn-endpoint",   "ip_address": "10.0.1.70",  "os": "pfSense 2.7",          "status": "online",  "endpoints_count": 42, "risk_level": "LOW"},
    {"id": "dev-008", "hostname": "k8s-master",     "ip_address": "10.0.1.80",  "os": "Ubuntu 22.04 LTS",     "status": "online",  "endpoints_count": 32, "risk_level": "MEDIUM"},
]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

async def seed() -> None:
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with SessionLocal() as db:
        # --- Users ---
        print("Seeding users …")
        for u in USERS:
            await db.execute(
                text("""
                    INSERT INTO users (id, email, hashed_password, name, role, avatar, permissions, mfa_enabled, is_active, created_at)
                    VALUES (:id, :email, :hashed_password, :name, :role, :avatar, :permissions::json, :mfa_enabled, true, NOW())
                    ON CONFLICT (id) DO NOTHING
                """),
                {
                    "id": u["id"],
                    "email": u["email"],
                    "hashed_password": hash_password(u["plain_password"]),
                    "name": u["name"],
                    "role": u["role"],
                    "avatar": u["avatar"],
                    "permissions": json.dumps(u["permissions"]),
                    "mfa_enabled": u["mfa_enabled"],
                },
            )
        print(f"  ✓ {len(USERS)} users")

        # --- Alerts ---
        print("Seeding alerts …")
        alerts = build_alerts()
        for a in alerts:
            await db.execute(
                text("""
                    INSERT INTO alerts (
                        id, timestamp, source, destination, source_port, destination_port,
                        protocol, country_of_origin, risk_level, status, type,
                        mitre_tactic, confidence_score, false_positive_rate, cve_id,
                        user_affected, assigned_to, packets_transferred, bytes_transferred,
                        attempt_count, description, timeline, tags
                    ) VALUES (
                        :id, :timestamp, :source, :destination, :source_port, :destination_port,
                        :protocol, :country_of_origin, :risk_level, :status, :type,
                        :mitre_tactic, :confidence_score, :false_positive_rate, :cve_id,
                        :user_affected, :assigned_to, :packets_transferred, :bytes_transferred,
                        :attempt_count, :description, :timeline::json, :tags::json
                    )
                    ON CONFLICT (id) DO NOTHING
                """),
                {
                    **a,
                    "timeline": json.dumps(a["timeline"]),
                    "tags": json.dumps(a["tags"]),
                    "timestamp": a["timestamp"].isoformat(),
                },
            )
        print(f"  ✓ {len(alerts)} alerts")

        # --- Devices ---
        print("Seeding devices …")
        for d in DEVICES:
            await db.execute(
                text("""
                    INSERT INTO devices (id, hostname, ip_address, os, status, last_seen, endpoints_count, risk_level)
                    VALUES (:id, :hostname, :ip_address, :os, :status, NOW(), :endpoints_count, :risk_level)
                    ON CONFLICT (id) DO NOTHING
                """),
                d,
            )
        print(f"  ✓ {len(DEVICES)} devices")

        await db.commit()

    await engine.dispose()
    print("\n✅  Seed complete.")


if __name__ == "__main__":
    asyncio.run(seed())
