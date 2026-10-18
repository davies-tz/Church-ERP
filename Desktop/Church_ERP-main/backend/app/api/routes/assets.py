import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.api.deps import get_scoped_session
from app.domain import authz
from app.domain.assets import (
    ASSET_TYPES,
    AssetError,
    add_maintenance,
    create_asset,
    create_inventory_item,
    summary,
)
from app.models import Asset, AssetMaintenance, InventoryItem, OrgUnit, User
from app.schemas.asset import (
    AssetCreate,
    AssetResponse,
    AssetSummary,
    AssetTypeInfo,
    InventoryCreate,
    InventoryResponse,
    MaintenanceCreate,
    MaintenanceResponse,
)

router = APIRouter(tags=["assets"])


async def _require(session, user):
    grants = await authz.load_grants(session, user.id)
    if not authz.can(grants, authz.MANAGE_ASSETS):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Missing capability: manage_assets")


async def _unit_names(session, ids: set) -> dict:
    ids = {i for i in ids if i}
    if not ids:
        return {}
    return {
        u.id: u.name
        for u in (await session.execute(select(OrgUnit).where(OrgUnit.id.in_(ids)))).scalars()
    }


def _asset_resp(a: Asset, unit_name: str | None) -> AssetResponse:
    return AssetResponse(
        id=str(a.id), type=a.type, name=a.name,
        org_unit_id=str(a.org_unit_id) if a.org_unit_id else None,
        org_unit_name=unit_name, code=a.code, acquisition_date=a.acquisition_date,
        value=float(a.value) if a.value is not None else None, currency=a.currency,
        condition=a.condition, reg_no=a.reg_no, custodian=a.custodian,
        status=a.status, notes=a.notes,
    )


@router.get("/asset-types", response_model=list[AssetTypeInfo])
async def asset_types(_ctx: tuple = Depends(get_scoped_session)):
    return [AssetTypeInfo(key=k, label_en=en, label_sw=sw) for k, (en, sw) in ASSET_TYPES.items()]


@router.get("/assets/summary", response_model=AssetSummary)
async def assets_summary(ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    await _require(session, user)
    return AssetSummary(**await summary(session))


@router.get("/assets", response_model=list[AssetResponse])
async def list_assets(ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    await _require(session, user)
    rows = (await session.execute(select(Asset).order_by(Asset.type, Asset.name))).scalars().all()
    names = await _unit_names(session, {a.org_unit_id for a in rows})
    return [_asset_resp(a, names.get(a.org_unit_id)) for a in rows]


@router.post("/assets", response_model=AssetResponse, status_code=201)
async def register_asset(body: AssetCreate, ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    await _require(session, user)
    try:
        asset = await create_asset(
            session, tenant_id=str(user.tenant_id), type=body.type, name=body.name,
            org_unit_id=body.org_unit_id, code=body.code,
            acquisition_date=body.acquisition_date, value=body.value,
            condition=body.condition, reg_no=body.reg_no, custodian=body.custodian,
            notes=body.notes,
        )
    except AssetError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    names = await _unit_names(session, {asset.org_unit_id})
    return _asset_resp(asset, names.get(asset.org_unit_id))


@router.get("/assets/{asset_id}/maintenance", response_model=list[MaintenanceResponse])
async def list_maintenance(asset_id: str, ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    await _require(session, user)
    try:
        aid = uuid.UUID(asset_id)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid asset id")
    rows = (
        await session.execute(
            select(AssetMaintenance)
            .where(AssetMaintenance.asset_id == aid)
            .order_by(AssetMaintenance.date.desc())
        )
    ).scalars().all()
    out = []
    for m in rows:
        rec = await session.get(User, m.recorded_by) if m.recorded_by else None
        out.append(MaintenanceResponse(
            id=str(m.id), date=m.date, action=m.action,
            cost=float(m.cost) if m.cost is not None else None,
            note=m.note, recorded_by_name=rec.name if rec else None,
        ))
    return out


@router.post("/assets/{asset_id}/maintenance", response_model=MaintenanceResponse, status_code=201)
async def record_maintenance(asset_id: str, body: MaintenanceCreate, ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    await _require(session, user)
    try:
        m = await add_maintenance(
            session, tenant_id=str(user.tenant_id), asset_id=asset_id,
            date=body.date, action=body.action, cost=body.cost, note=body.note,
            recorded_by=str(user.id),
        )
    except AssetError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    return MaintenanceResponse(
        id=str(m.id), date=m.date, action=m.action,
        cost=float(m.cost) if m.cost is not None else None,
        note=m.note, recorded_by_name=user.name,
    )


@router.get("/inventory", response_model=list[InventoryResponse])
async def list_inventory(ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    await _require(session, user)
    rows = (await session.execute(select(InventoryItem).order_by(InventoryItem.name))).scalars().all()
    names = await _unit_names(session, {i.org_unit_id for i in rows})
    out = []
    for i in rows:
        low = i.reorder_level is not None and i.quantity <= i.reorder_level
        out.append(InventoryResponse(
            id=str(i.id), name=i.name, quantity=float(i.quantity), unit=i.unit,
            reorder_level=float(i.reorder_level) if i.reorder_level is not None else None,
            low_stock=bool(low), org_unit_name=names.get(i.org_unit_id),
        ))
    return out


@router.post("/inventory", response_model=InventoryResponse, status_code=201)
async def add_inventory(body: InventoryCreate, ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    await _require(session, user)
    item = await create_inventory_item(
        session, tenant_id=str(user.tenant_id), name=body.name, quantity=body.quantity,
        unit=body.unit, reorder_level=body.reorder_level, org_unit_id=body.org_unit_id,
    )
    low = item.reorder_level is not None and item.quantity <= item.reorder_level
    names = await _unit_names(session, {item.org_unit_id})
    return InventoryResponse(
        id=str(item.id), name=item.name, quantity=float(item.quantity), unit=item.unit,
        reorder_level=float(item.reorder_level) if item.reorder_level is not None else None,
        low_stock=bool(low), org_unit_name=names.get(item.org_unit_id),
    )
