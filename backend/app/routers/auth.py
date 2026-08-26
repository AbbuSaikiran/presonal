"""
Authentication router — login and current-user endpoints.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import create_access_token, get_current_user, verify_password, get_password_hash
from app.database import get_db
from app.models import User
from app.schemas import (
    LoginRequest,
    RegisterRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserRead,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user: User | None = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    # Update last_login
    user.last_login = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})

    return TokenResponse(
        access_token=token,
        user=UserRead.model_validate(user),
    )


@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    # Determine initials avatar
    parts = body.name.strip().split()
    avatar = "".join([p[0].upper() for p in parts[:2]]) if parts else "U"

    new_user = User(
        id=f"usr-{int(datetime.now(timezone.utc).timestamp())}",
        email=body.email,
        name=body.name,
        hashed_password=get_password_hash(body.password),
        role=body.role.upper(),
        avatar=avatar,
        permissions=["read", "write", "alerts:manage"] if body.role.upper() in ["ADMIN", "ANALYST"] else ["read"],
        mfa_enabled=False,
        is_active=True,
        created_at=datetime.now(timezone.utc),
        last_login=datetime.now(timezone.utc),
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    token = create_access_token({"sub": new_user.id, "email": new_user.email, "role": new_user.role})

    return TokenResponse(
        access_token=token,
        user=UserRead.model_validate(new_user),
    )


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    # For security, always return success message even if email doesn't exist
    return {
        "success": True,
        "message": f"Security recovery verification code sent to {body.email}. (Demo Code: 894201)",
        "demo_code": "894201",
    }


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    user.hashed_password = get_password_hash(body.new_password)
    await db.commit()

    return {
        "success": True,
        "message": "Password successfully reset. You may now log in with your new credentials.",
    }


@router.get("/me", response_model=UserRead)
async def me(current_user: User = Depends(get_current_user)):
    return UserRead.model_validate(current_user)
