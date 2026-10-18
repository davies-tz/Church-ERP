from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select

from app.api.deps import get_scoped_session
from app.domain import authz
from app.models import User

router = APIRouter(prefix="/users", tags=["users"])


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str


@router.get("", response_model=list[UserResponse])
async def list_users(ctx: tuple = Depends(get_scoped_session)):
    """List this tenant's users (for the appoint screen). Gated by `appoint`."""
    session, user = ctx
    grants = await authz.load_grants(session, user.id)
    if not authz.can(grants, authz.APPOINT):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Missing capability: appoint")
    rows = (await session.execute(select(User).order_by(User.name))).scalars().all()
    return [
        UserResponse(id=str(u.id), name=u.name, email=u.email, role=u.role)
        for u in rows
    ]
