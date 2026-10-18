"""Org-unit domain logic: create nodes with structural validation and a materialized
path. Shared by the API and the seeder so the rules live in exactly one place."""
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import HierarchyLevelType, OrgUnit


class StructureError(ValueError):
    """Raised when a requested unit would violate the tenant's hierarchy rules."""


async def _get_level(session: AsyncSession, level_key: str) -> HierarchyLevelType:
    level = (
        await session.execute(
            select(HierarchyLevelType).where(HierarchyLevelType.key == level_key)
        )
    ).scalar_one_or_none()
    if level is None:
        raise StructureError(f"Unknown level '{level_key}' for this tenant")
    return level


async def create_org_unit(
    session: AsyncSession,
    *,
    tenant_id: str,
    level_key: str,
    name: str,
    parent_id: str | None = None,
    code: str | None = None,
    region: str | None = None,
    district: str | None = None,
) -> OrgUnit:
    """Create a unit, enforcing that its level nests correctly under its parent.
    Assumes the tenant GUC is already set on `session` (RLS scopes every lookup)."""
    level = await _get_level(session, level_key)

    parent: OrgUnit | None = None
    parent_id_clean = (parent_id or "").strip()
    if parent_id_clean:
        try:
            parent_uuid = uuid.UUID(parent_id_clean)
        except ValueError:
            raise StructureError("Invalid parent_id")
        parent = await session.get(OrgUnit, parent_uuid)
        if parent is None:  # RLS also makes cross-tenant parents invisible here
            raise StructureError("Parent unit not found")
        if level.parent_key != parent.level_key:
            raise StructureError(
                f"A '{level_key}' cannot be placed under a '{parent.level_key}'"
            )
    elif level.parent_key is not None:
        raise StructureError(f"Level '{level_key}' requires a parent unit")

    unit = OrgUnit(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        level_key=level_key,
        name=name,
        code=code,
        region=region,
        district=district,
        parent_id=parent.id if parent else None,
    )
    base = parent.path if parent else "/"
    unit.path = f"{base}{unit.id}/"
    session.add(unit)
    await session.flush()
    return unit


async def import_units(
    session: AsyncSession, *, tenant_id: str, rows: list[dict]
) -> dict:
    """Batch-register churches. Each row: level_key, name, code, parent_code, region,
    district. Parents are resolved by `code` (existing units or earlier rows). Rows are
    resolved iteratively so ordering within the file doesn't matter, as long as the
    parent exists somewhere. Returns {created, errors}."""
    # start with all existing units that have a code
    by_code: dict[str, OrgUnit] = {}
    for u in (await session.execute(select(OrgUnit).where(OrgUnit.code.isnot(None)))).scalars():
        if u.code:
            by_code[u.code] = u

    pending = list(rows)
    created = 0
    errors: list[str] = []

    progress = True
    while pending and progress:
        progress = False
        still: list[dict] = []
        for row in pending:
            level_key = (row.get("level_key") or "").strip()
            name = (row.get("name") or "").strip()
            code = (row.get("code") or "").strip() or None
            parent_code = (row.get("parent_code") or "").strip() or None
            if not level_key or not name:
                errors.append(f"Row missing level_key/name: {row}")
                continue

            parent_id = None
            if parent_code:
                parent = by_code.get(parent_code)
                if parent is None:
                    still.append(row)  # parent not created yet — retry next pass
                    continue
                parent_id = str(parent.id)

            try:
                unit = await create_org_unit(
                    session, tenant_id=tenant_id, level_key=level_key, name=name,
                    parent_id=parent_id, code=code,
                    region=(row.get("region") or "").strip() or None,
                    district=(row.get("district") or "").strip() or None,
                )
            except StructureError as e:
                errors.append(f"{name}: {e}")
                continue
            created += 1
            progress = True
            if code:
                by_code[code] = unit
        pending = still

    for row in pending:  # anything left has an unresolved parent
        errors.append(f"{row.get('name')}: parent '{row.get('parent_code')}' not found")

    return {"created": created, "errors": errors}
