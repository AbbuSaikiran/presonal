"""
Stats router — dashboard KPIs, threat trend chart data, top sources.
"""

from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import Alert, Device, User
from app.schemas import StatsResponse, TopSource, TrendPoint

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("", response_model=StatsResponse)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    day_ago = now - timedelta(hours=24)

    # Total alerts today
    total_today = (
        await db.execute(
            select(func.count(Alert.id)).where(Alert.timestamp >= day_ago)
        )
    ).scalar_one()

    # Critical open
    critical_open = (
        await db.execute(
            select(func.count(Alert.id)).where(
                Alert.risk_level == "CRITICAL", Alert.status == "OPEN"
            )
        )
    ).scalar_one()

    # Mitigated in last 24h
    mitigated_24h = (
        await db.execute(
            select(func.count(Alert.id)).where(
                Alert.status.in_(["MITIGATED", "RESOLVED"]),
                Alert.timestamp >= day_ago,
            )
        )
    ).scalar_one()

    # Active investigations
    active_investigations = (
        await db.execute(
            select(func.count(Alert.id)).where(Alert.status == "INVESTIGATING")
        )
    ).scalar_one()

    # Endpoints monitored (from devices table)
    endpoints_monitored = (
        await db.execute(select(func.sum(Device.endpoints_count)))
    ).scalar_one() or 0

    # Threats blocked (MITIGATED + RESOLVED total)
    threats_blocked = (
        await db.execute(
            select(func.count(Alert.id)).where(
                Alert.status.in_(["MITIGATED", "RESOLVED"])
            )
        )
    ).scalar_one()

    # False positive rate
    total_all = (await db.execute(select(func.count(Alert.id)))).scalar_one()
    fp_count = (
        await db.execute(
            select(func.count(Alert.id)).where(Alert.status == "FALSE_POSITIVE")
        )
    ).scalar_one()
    fp_rate = f"{(fp_count / total_all * 100):.1f}%" if total_all else "0.0%"

    return StatsResponse(
        total_alerts_today=total_today,
        critical_open=critical_open,
        mitigated_24h=mitigated_24h,
        avg_response_time_minutes=12,  # static placeholder (needs event log to compute)
        threats_blocked=threats_blocked,
        endpoints_monitored=int(endpoints_monitored),
        active_investigations=active_investigations,
        false_positive_rate=fp_rate,
    )


@router.get("/trend", response_model=list[TrendPoint])
async def get_trend(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Return 2-hourly alert counts by risk level for the last 24 hours."""
    now = datetime.now(timezone.utc)
    day_ago = now - timedelta(hours=24)

    rows = (
        await db.execute(
            select(Alert.timestamp, Alert.risk_level).where(Alert.timestamp >= day_ago)
        )
    ).all()

    # Bucket into 2-hour slots
    buckets: dict[str, dict[str, int]] = {}
    for h in range(0, 24, 2):
        key = f"{h:02d}:00"
        buckets[key] = {"critical": 0, "high": 0, "medium": 0, "low": 0}

    for ts, risk in rows:
        # ts may be naive; normalize to UTC
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        slot_h = (ts.hour // 2) * 2
        key = f"{slot_h:02d}:00"
        rl = risk.lower()
        if rl in buckets.get(key, {}):
            buckets[key][rl] += 1

    return [
        TrendPoint(time=k, **v) for k, v in sorted(buckets.items())
    ]


@router.get("/top-sources", response_model=list[TopSource])
async def get_top_sources(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Return the top 5 source IPs by alert count."""
    rows = (
        await db.execute(
            select(Alert.source, Alert.country_of_origin, Alert.risk_level)
        )
    ).all()

    # Aggregate
    counts: Counter = Counter()
    risk_map: dict[str, str] = {}
    country_map: dict[str, str] = {}
    for src, country, risk in rows:
        counts[src] += 1
        risk_map[src] = risk
        country_map[src] = country

    top5 = counts.most_common(5)
    return [
        TopSource(ip=ip, country=country_map[ip], count=cnt, risk=risk_map[ip])
        for ip, cnt in top5
    ]
