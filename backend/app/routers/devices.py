"""
Devices router.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import Device, User
from app.schemas import DeviceRead

router = APIRouter(prefix="/api/devices", tags=["devices"])


@router.get("", response_model=list[DeviceRead])
async def list_devices(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    rows = (await db.execute(select(Device).order_by(Device.hostname))).scalars().all()
    return [DeviceRead.model_validate(r) for r in rows]
