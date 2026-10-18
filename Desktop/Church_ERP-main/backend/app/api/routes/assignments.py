import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.api.deps import get_scoped_session
from app.core.security import hash_password
from app.domain import authz
from app.models import Assignment, Member, OrgUnit, User
from app.schemas.authz import (
    AssignmentCreate,
    AssignmentResponse,
    GrantResponse,
    PermissionsResponse,
    RoleInfo,
)

router = APIRouter(tags=["access"])


@router.get("/me/permissions", response_model=PermissionsResponse)
async def my_permissions(ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    grants = await authz.load_grants(session, user.id)
    return PermissionsResponse(
        user_id=str(user.id),
        capabilities=sorted(authz.aggregate_capabilities(grants)),
        grants=[
            GrantResponse(
                role_key=g.role_key,
                scope_path=g.scope_path,
                capabilities=sorted(g.capabilities),
            )
            for g in grants
        ],
    )


@router.get("/roles", response_model=list[RoleInfo])
async def list_roles(_ctx: tuple = Depends(get_scoped_session)):
    """The role catalog (function -> capabilities) available when appointing people."""
    return [
        RoleInfo(
            key=key,
            label_en=authz.ROLE_LABELS[key][0],
            label_sw=authz.ROLE_LABELS[key][1],
            capabilities=sorted(caps),
        )
        for key, caps in authz.ROLE_CAPS.items()
    ]


@router.get("/assignments", response_model=list[AssignmentResponse])
async def list_assignments(ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    grants = await authz.load_grants(session, user.id)
    if not authz.can(grants, authz.APPOINT):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Missing capability: appoint")

    rows = (
        await session.execute(
            select(Assignment, User.name, OrgUnit.name)
            .join(User, User.id == Assignment.user_id)
            .outerjoin(OrgUnit, OrgUnit.id == Assignment.org_unit_id)
            .order_by(Assignment.scope_path)
        )
    ).all()
    return [
        AssignmentResponse(
            id=str(a.id),
            user_id=str(a.user_id),
            user_name=user_name,
            role_key=a.role_key,
            role_label_en=authz.ROLE_LABELS.get(a.role_key, (a.role_key, a.role_key))[0],
            role_label_sw=authz.ROLE_LABELS.get(a.role_key, (a.role_key, a.role_key))[1],
            org_unit_id=str(a.org_unit_id) if a.org_unit_id else None,
            org_unit_name=unit_name,
            scope_path=a.scope_path,
            active=a.active,
        )
        for (a, user_name, unit_name) in rows
    ]


@router.post("/assignments", response_model=AssignmentResponse, status_code=201)
async def create_assignment(body: AssignmentCreate, ctx: tuple = Depends(get_scoped_session)):
    """Appoint a MEMBER to a role at a unit. Enforces 'a leader must be a member of
    that church first', and provisions a login for the member if they don't have one."""
    session, user = ctx
    grants = await authz.load_grants(session, user.id)

    # Resolve the target unit (and its scope) the appointment applies to.
    target_unit: OrgUnit | None = None
    target_path = "/"
    if body.org_unit_id:
        try:
            target_unit = await session.get(OrgUnit, uuid.UUID(body.org_unit_id))
        except ValueError:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid org_unit_id")
        if target_unit is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Org unit not found")
        target_path = target_unit.path

    if not authz.can(grants, authz.APPOINT, target_path):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You cannot appoint within this scope")

    # The appointee must be a member (RLS scopes lookup to this tenant).
    try:
        member = await session.get(Member, uuid.UUID(body.member_id))
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid member_id")
    if member is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")

    # "A leader must be a member of that church first": the member's unit must be the
    # target unit or one beneath it (for a tenant-wide role, just be a member somewhere).
    if member.org_unit_id is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "This person must belong to a church before being appointed a leader",
        )
    if target_unit is not None:
        member_unit = await session.get(OrgUnit, member.org_unit_id)
        if member_unit is None or not member_unit.path.startswith(target_unit.path):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "This person must be a member of this church (or one beneath it) first",
            )

    # Provision or fetch the member's login account.
    temp_password: str | None = None
    if member.user_id is None:
        temp_password = secrets.token_urlsafe(6)
        email = (member.email or f"{member.member_no.lower()}@member.local").strip().lower()
        target_user = User(
            tenant_id=str(user.tenant_id), email=email,
            password_hash=hash_password(temp_password),
            name=member.full_name, role=body.role_key,
        )
        session.add(target_user)
        await session.flush()
        member.user_id = target_user.id
    else:
        target_user = await session.get(User, member.user_id)

    try:
        assignment = await authz.create_assignment(
            session, tenant_id=str(user.tenant_id), user_id=str(target_user.id),
            role_key=body.role_key, org_unit=target_unit,
        )
    except authz.AuthzError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))

    return AssignmentResponse(
        id=str(assignment.id),
        user_id=str(target_user.id),
        user_name=target_user.name,
        role_key=assignment.role_key,
        role_label_en=authz.ROLE_LABELS.get(assignment.role_key, (assignment.role_key, ""))[0],
        role_label_sw=authz.ROLE_LABELS.get(assignment.role_key, ("", assignment.role_key))[1],
        org_unit_id=str(target_unit.id) if target_unit else None,
        org_unit_name=target_unit.name if target_unit else None,
        scope_path=assignment.scope_path,
        active=assignment.active,
        temp_password=temp_password,
    )
