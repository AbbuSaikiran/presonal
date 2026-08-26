"""
Alerts router — list, detail, and status-update endpoints.
"""

import math

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import Alert, User
from app.schemas import AlertListResponse, AlertRead, AlertStatusUpdate
from app.websocket_manager import manager

router = APIRouter(prefix="/api/alerts", tags=["alerts"])

VALID_STATUSES = {"OPEN", "INVESTIGATING", "MITIGATED", "RESOLVED", "FALSE_POSITIVE"}
VALID_RISK_LEVELS = {"CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"}
SORTABLE_COLS = {"id", "timestamp", "source", "risk_level", "status", "type"}


@router.get("", response_model=AlertListResponse)
async def list_alerts(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    risk: str = Query("ALL"),
    status_filter: str = Query("ALL", alias="status"),
    q: str = Query(""),
    sort: str = Query("timestamp"),
    dir: str = Query("desc"),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    stmt = select(Alert)

    # Filters
    if risk != "ALL" and risk in VALID_RISK_LEVELS:
        stmt = stmt.where(Alert.risk_level == risk)
    if status_filter != "ALL" and status_filter in VALID_STATUSES:
        stmt = stmt.where(Alert.status == status_filter)
    if q.strip():
        pattern = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Alert.id.ilike(pattern),
                Alert.source.ilike(pattern),
                Alert.type.ilike(pattern),
                Alert.destination.ilike(pattern),
                Alert.country_of_origin.ilike(pattern),
            )
        )

    # Total count (before pagination)
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total: int = (await db.execute(count_stmt)).scalar_one()

    # Sorting — only allow known column names to avoid injection
    sort_key = sort if sort in SORTABLE_COLS else "timestamp"
    sort_col = getattr(Alert, sort_key)
    stmt = stmt.order_by(sort_col.desc() if dir == "desc" else sort_col.asc())

    # Pagination
    stmt = stmt.offset((page - 1) * limit).limit(limit)
    rows = (await db.execute(stmt)).scalars().all()

    return AlertListResponse(
        alerts=[AlertRead.model_validate(r) for r in rows],
        total=total,
        page=page,
        limit=limit,
        total_pages=math.ceil(total / limit) if total else 1,
    )


@router.get("/{alert_id}", response_model=AlertRead)
async def get_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found")
    return AlertRead.model_validate(alert)


@router.patch("/{alert_id}/status", response_model=AlertRead)
async def update_alert_status(
    alert_id: str,
    body: AlertStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Viewers (read-only) cannot update status
    if "write" not in (current_user.permissions or []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update alert status",
        )

    # Verify the alert exists first
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found")

    # Perform the update
    await db.execute(
        update(Alert).where(Alert.id == alert_id).values(status=body.status)
    )
    await db.commit()

    # Re-fetch the updated row (avoids stale-cache issue with asyncpg)
    result2 = await db.execute(select(Alert).where(Alert.id == alert_id))
    updated = result2.scalar_one()

    # Broadcast the status change over WebSocket
    await manager.broadcast({
        "event": "status_updated",
        "data": {"id": alert_id, "status": body.status},
    })

    return AlertRead.model_validate(updated)
