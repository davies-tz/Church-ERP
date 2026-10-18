"""Assets & resources: creation, maintenance, roll-up valuation, low-stock, isolation."""
import datetime

import pytest
from sqlalchemy import func, select

from app.core.db import tenant_session
from app.domain import authz
from app.domain.assets import (
    AssetError,
    add_maintenance,
    create_asset,
    create_inventory_item,
    summary,
)
from app.models import Asset, AssetMaintenance

D = datetime.date


def test_manage_assets_capability():
    assert authz.MANAGE_ASSETS in authz.role_capabilities("tenant_admin")
    assert authz.MANAGE_ASSETS not in authz.role_capabilities("secretary")


async def test_unknown_type_rejected(two_tenants):
    tenant_a, _ = two_tenants
    async with tenant_session(tenant_a) as s:
        with pytest.raises(AssetError):
            await create_asset(s, tenant_id=tenant_a, type="spaceship", name="X")


async def test_summary_rolls_up_value_and_low_stock(two_tenants):
    tenant_a, _ = two_tenants
    async with tenant_session(tenant_a) as s:
        await create_asset(s, tenant_id=tenant_a, type="building", name="Church", value=100)
        await create_asset(s, tenant_id=tenant_a, type="vehicle", name="Van", value=40)
        await create_inventory_item(s, tenant_id=tenant_a, name="Chairs", quantity=100, reorder_level=20)
        await create_inventory_item(s, tenant_id=tenant_a, name="Wafers", quantity=5, reorder_level=10)  # low
    async with tenant_session(tenant_a) as s:
        result = await summary(s)
        assert result["total_value"] == 140.0
        assert result["total_count"] == 2
        assert result["by_type"]["building"]["value"] == 100.0
        assert result["low_stock"] == 1  # wafers below reorder level


async def test_maintenance_attaches_to_asset(two_tenants):
    tenant_a, _ = two_tenants
    async with tenant_session(tenant_a) as s:
        asset = await create_asset(s, tenant_id=tenant_a, type="vehicle", name="Van", value=40)
        await add_maintenance(
            s, tenant_id=tenant_a, asset_id=str(asset.id), date=D(2026, 5, 1),
            action="Service", cost=10,
        )
    async with tenant_session(tenant_a) as s:
        count = (
            await s.execute(
                select(func.count(AssetMaintenance.id)).where(
                    AssetMaintenance.asset_id == asset.id
                )
            )
        ).scalar_one()
        assert count == 1


async def test_assets_are_tenant_isolated(two_tenants):
    tenant_a, tenant_b = two_tenants
    async with tenant_session(tenant_a) as s:
        await create_asset(s, tenant_id=tenant_a, type="land", name="Plot", value=99)
    async with tenant_session(tenant_b) as s:
        count = (await s.execute(select(func.count(Asset.id)))).scalar_one()
        assert count == 0
