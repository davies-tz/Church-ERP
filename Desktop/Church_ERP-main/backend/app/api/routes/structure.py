import csv
import io
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select

from app.api.deps import get_scoped_session
from app.domain import authz
from app.domain.structure import StructureError, create_org_unit, import_units
from app.models import Assignment, HierarchyLevelType, OrgUnit, User
from app.schemas.structure import (
    ImportResult,
    LeaderInfo,
    LevelResponse,
    OrgUnitCreate,
    OrgUnitResponse,
)

router = APIRouter(prefix="/structure", tags=["structure"])


def _depth_from_path(path: str) -> int:
    return max(path.count("/") - 2, 0)


async def _leaders_by_unit(session) -> dict:
    """Map org_unit_id -> [LeaderInfo] for active, unit-scoped assignments."""
    rows = (
        await session.execute(
            select(Assignment, User.name)
            .join(User, User.id == Assignment.user_id)
            .where(Assignment.active.is_(True), Assignment.org_unit_id.isnot(None))
        )
    ).all()
    out: dict = {}
    for a, user_name in rows:
        en, sw = authz.ROLE_LABELS.get(a.role_key, (a.role_key, a.role_key))
        out.setdefault(a.org_unit_id, []).append(
            LeaderInfo(role_key=a.role_key, role_label_en=en, role_label_sw=sw,
                      user_name=user_name)
        )
    return out


def _to_unit_response(u: OrgUnit, leaders: list) -> OrgUnitResponse:
    return OrgUnitResponse(
        id=str(u.id), level_key=u.level_key, name=u.name, code=u.code,
        region=u.region, district=u.district,
        parent_id=str(u.parent_id) if u.parent_id else None,
        path=u.path, depth=_depth_from_path(u.path), leaders=leaders,
    )


@router.get("/levels", response_model=list[LevelResponse])
async def list_levels(ctx: tuple = Depends(get_scoped_session)):
    session, _ = ctx
    rows = (
        await session.execute(
            select(HierarchyLevelType).order_by(HierarchyLevelType.depth)
        )
    ).scalars().all()
    return [
        LevelResponse(key=r.key, label_en=r.label_en, label_sw=r.label_sw,
                      depth=r.depth, parent_key=r.parent_key)
        for r in rows
    ]


@router.get("/units", response_model=list[OrgUnitResponse])
async def list_units(level: str | None = None, ctx: tuple = Depends(get_scoped_session)):
    """This tenant's units (path order). Optional ?level= filter; each unit carries
    its leader(s)."""
    session, _ = ctx
    stmt = select(OrgUnit).order_by(OrgUnit.path)
    if level:
        stmt = stmt.where(OrgUnit.level_key == level)
    rows = (await session.execute(stmt)).scalars().all()
    leaders = await _leaders_by_unit(session)
    return [_to_unit_response(u, leaders.get(u.id, [])) for u in rows]


@router.post("/units", response_model=OrgUnitResponse, status_code=201)
async def create_unit(body: OrgUnitCreate, ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    grants = await authz.load_grants(session, user.id)
    target_path = "/"
    if body.parent_id:
        try:
            parent = await session.get(OrgUnit, uuid.UUID(body.parent_id))
        except ValueError:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid parent_id")
        if parent is not None:
            target_path = parent.path
    if not authz.can(grants, authz.MANAGE_STRUCTURE, target_path):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "You cannot manage structure in this scope"
        )
    try:
        unit = await create_org_unit(
            session, tenant_id=str(user.tenant_id), level_key=body.level_key,
            name=body.name, parent_id=body.parent_id, code=body.code,
            region=body.region, district=body.district,
        )
    except StructureError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    return _to_unit_response(unit, [])


@router.post("/import", response_model=ImportResult)
async def import_structure(
    file: UploadFile = File(...), ctx: tuple = Depends(get_scoped_session)
):
    """Batch-register churches from a CSV (columns: level_key, name, code, parent_code,
    region, district). Needs tenant-wide manage_structure (the super admin)."""
    session, user = ctx
    grants = await authz.load_grants(session, user.id)
    if not authz.can(grants, authz.MANAGE_STRUCTURE, "/"):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Only a tenant-wide admin may import the structure"
        )
    raw = (await file.read()).decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(raw))
    rows = [ {(k or "").strip(): v for k, v in r.items()} for r in reader ]
    result = await import_units(session, tenant_id=str(user.tenant_id), rows=rows)
    return ImportResult(**result)
