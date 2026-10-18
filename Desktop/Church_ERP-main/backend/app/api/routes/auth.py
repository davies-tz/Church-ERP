import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.api.deps import get_scoped_session, get_tenant
from app.core.db import SessionLocal, set_tenant
from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.domain.members import create_member
from app.models import Member, OrgUnit, Tenant, User
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    MeResponse,
    RegisterRequest,
    TokenResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, tenant: Tenant = Depends(get_tenant)):
    # Scope the lookup to this tenant so you can only ever sign into your own church.
    async with SessionLocal() as session:
        async with session.begin():
            await set_tenant(session, str(tenant.id))
            user = (
                await session.execute(
                    select(User).where(User.email == body.email.lower())
                )
            ).scalar_one_or_none()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")

    token = create_access_token(
        user_id=str(user.id), tenant_id=str(tenant.id), role=user.role
    )
    return TokenResponse(access_token=token)


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: RegisterRequest, tenant: Tenant = Depends(get_tenant)):
    """Public member self-registration: creates a linked User + Member (unverified)
    in the resolved tenant, and logs them in."""
    async with SessionLocal() as session:
        async with session.begin():
            await set_tenant(session, str(tenant.id))
            email = body.email.strip().lower()
            existing = (
                await session.execute(select(User).where(User.email == email))
            ).scalar_one_or_none()
            if existing:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email already registered")
            try:
                unit = await session.get(OrgUnit, uuid.UUID(body.org_unit_id))
            except ValueError:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid church")
            if unit is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Church not found")

            user = User(
                tenant_id=str(tenant.id), email=email,
                password_hash=hash_password(body.password), name=body.full_name,
                role="member",
            )
            session.add(user)
            await session.flush()
            await create_member(
                session, tenant_id=str(tenant.id), full_name=body.full_name,
                email=email, phone=body.phone, gender=body.gender, dob=body.dob,
                region=body.region, district=body.district, org_unit_id=unit.id,
                user_id=user.id, verification_status="unverified",
            )
            uid = str(user.id)

    token = create_access_token(user_id=uid, tenant_id=str(tenant.id), role="member")
    return TokenResponse(access_token=token)


@router.post("/change-password", status_code=204)
async def change_password(
    body: ChangePasswordRequest, ctx: tuple = Depends(get_scoped_session)
):
    session, user = ctx
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Current password is incorrect")
    user.password_hash = hash_password(body.new_password)
    await session.flush()


@router.get("/me", response_model=MeResponse)
async def me(
    ctx: tuple = Depends(get_scoped_session),
    tenant: Tenant = Depends(get_tenant),
):
    session, user = ctx
    member = (
        await session.execute(select(Member).where(Member.user_id == user.id))
    ).scalar_one_or_none()
    return MeResponse(
        id=str(user.id),
        email=user.email,
        name=user.name,
        role=user.role,
        tenant_slug=tenant.slug,
        member_id=str(member.id) if member else None,
        verification_status=member.verification_status if member else None,
    )
