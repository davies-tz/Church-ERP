"""Hierarchy engine: configurable levels, materialized-path nesting, structural
validation, and (of course) tenant isolation of the tree."""
import pytest
from sqlalchemy import func, select

from app.core.db import tenant_session
from app.domain.structure import StructureError, create_org_unit, import_units
from app.domain.templates import seed_levels
from app.models import HierarchyLevelType, OrgUnit

pytestmark = pytest.mark.asyncio


async def _build_catholic(tenant_id: str):
    """Seed catholic levels and a 3-deep tree; return (archdiocese, diocese, parish?)."""
    async with tenant_session(tenant_id) as s:
        await seed_levels(s, tenant_id, "catholic")
        arch = await create_org_unit(
            s, tenant_id=tenant_id, level_key="archdiocese", name="Arch"
        )
        dio = await create_org_unit(
            s, tenant_id=tenant_id, level_key="diocese", name="Dio",
            parent_id=str(arch.id),
        )
        return str(arch.id), str(dio.id), arch.path, dio.path


async def test_levels_seeded_from_template(two_tenants):
    tenant_a, _ = two_tenants
    async with tenant_session(tenant_a) as s:
        await seed_levels(s, tenant_a, "lutheran")
    async with tenant_session(tenant_a) as s:
        rows = (
            await s.execute(
                select(HierarchyLevelType).order_by(HierarchyLevelType.depth)
            )
        ).scalars().all()
        keys = [r.key for r in rows]
        assert keys == ["diocese", "usharika", "kanda", "jumuiya"]
        assert rows[0].parent_key is None
        assert rows[1].parent_key == "diocese"


async def test_materialized_path_nesting(two_tenants):
    tenant_a, _ = two_tenants
    arch_id, dio_id, arch_path, dio_path = await _build_catholic(tenant_a)
    # child path extends parent path
    assert dio_path.startswith(arch_path)
    assert dio_path == f"{arch_path}{dio_id}/"

    # subtree query: everything under the archdiocese (via indexed LIKE)
    async with tenant_session(tenant_a) as s:
        descendants = (
            await s.execute(
                select(func.count(OrgUnit.id)).where(OrgUnit.path.like(f"{arch_path}%"))
            )
        ).scalar_one()
        assert descendants == 2  # archdiocese itself + diocese


async def test_structural_validation(two_tenants):
    tenant_a, _ = two_tenants
    async with tenant_session(tenant_a) as s:
        await seed_levels(s, tenant_a, "catholic")
        # a diocese cannot be a root (its level requires a parent)
        with pytest.raises(StructureError):
            await create_org_unit(s, tenant_id=tenant_a, level_key="diocese", name="X")

    async with tenant_session(tenant_a) as s:
        arch = await create_org_unit(
            s, tenant_id=tenant_a, level_key="archdiocese", name="Arch"
        )
        # a parish cannot nest directly under an archdiocese
        with pytest.raises(StructureError):
            await create_org_unit(
                s, tenant_id=tenant_a, level_key="parish", name="P",
                parent_id=str(arch.id),
            )


async def test_batch_import_resolves_parents_by_code(two_tenants):
    tenant_a, _ = two_tenants
    async with tenant_session(tenant_a) as s:
        await seed_levels(s, tenant_a, "catholic")
        # deliberately out of order: parish row before its parents
        rows = [
            {"level_key": "parish", "name": "St. Anne", "code": "P1",
             "parent_code": "DEA1", "region": "Kilimanjaro", "district": "Moshi"},
            {"level_key": "archdiocese", "name": "Arch DSM", "code": "A1",
             "parent_code": "", "region": "Dar", "district": "Ilala"},
            {"level_key": "diocese", "name": "Dio Moshi", "code": "D1",
             "parent_code": "A1"},
            {"level_key": "deanery", "name": "Moshi Deanery", "code": "DEA1",
             "parent_code": "D1"},
        ]
        result = await import_units(s, tenant_id=tenant_a, rows=rows)
        assert result["created"] == 4
        assert result["errors"] == []

    async with tenant_session(tenant_a) as s:
        units = {
            u.code: u
            for u in (await s.execute(select(OrgUnit))).scalars()
            if u.code
        }
        # parish nested correctly under the deanery, region captured
        parish = units["P1"]
        assert parish.region == "Kilimanjaro"
        assert parish.path.startswith(units["A1"].path)
        assert units["D1"].path.startswith(units["A1"].path)


async def test_import_reports_missing_parent(two_tenants):
    tenant_a, _ = two_tenants
    async with tenant_session(tenant_a) as s:
        await seed_levels(s, tenant_a, "catholic")
        rows = [{"level_key": "diocese", "name": "Orphan", "code": "D9",
                 "parent_code": "NOPE"}]
        result = await import_units(s, tenant_id=tenant_a, rows=rows)
        assert result["created"] == 0
        assert any("not found" in e for e in result["errors"])


async def test_tree_is_tenant_isolated(two_tenants):
    tenant_a, tenant_b = two_tenants
    await _build_catholic(tenant_a)
    # tenant B has no units and cannot see A's
    async with tenant_session(tenant_b) as s:
        count = (await s.execute(select(func.count(OrgUnit.id)))).scalar_one()
        assert count == 0
