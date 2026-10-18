"""Denomination hierarchy TEMPLATES.

These are internal provisioning templates, NOT a public menu. When a church is
onboarded it picks one to seed its level ladder, then customizes freely. Each entry
is an ordered list of (key, label_en, label_sw); depth and parent_key are derived
from the order.
"""
from collections.abc import Iterator

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import HierarchyLevelType

# Sourced from the v1.3 prototype's per-denomination structures.
TEMPLATES: dict[str, list[tuple[str, str, str]]] = {
    "anglican": [
        ("province", "Province", "Jimbo"),
        ("diocese", "Diocese", "Dayosisi"),
        ("archdeaconry", "Archdeaconry", "Archdeaconry"),
        ("deanery", "Deanery", "Deanery"),
        ("parish", "Parish", "Parokia"),
        ("congregation", "Church", "Kanisa"),
        ("community", "Community", "Jumuiya"),
    ],
    "catholic": [
        ("archdiocese", "Archdiocese", "Jimbo Kuu"),
        ("diocese", "Diocese", "Dayosisi"),
        ("deanery", "Deanery", "Dekania"),
        ("parish", "Parish", "Parokia"),
        ("outstation", "Outstation", "Kigango"),
        ("small_community", "Small Christian Community", "Jumuiya Ndogo"),
    ],
    "lutheran": [
        ("diocese", "Diocese", "Dayosisi"),
        ("usharika", "Parish / Usharika", "Usharika"),
        ("kanda", "Zone / Kanda", "Kanda"),
        ("jumuiya", "Community / Jumuiya", "Jumuiya"),
    ],
    "blank": [
        ("church", "Church", "Kanisa"),
        ("group", "Group", "Kikundi"),
    ],
}


def iter_levels(template_key: str) -> Iterator[tuple[str, str, str, int, str | None]]:
    """Yield (key, label_en, label_sw, depth, parent_key) for a template."""
    levels = TEMPLATES[template_key]
    prev_key: str | None = None
    for depth, (key, en, sw) in enumerate(levels):
        yield key, en, sw, depth, prev_key
        prev_key = key


async def seed_levels(session: AsyncSession, tenant_id: str, template_key: str) -> None:
    """Create the HierarchyLevelType rows for a tenant from a template. Requires the
    tenant GUC to already be set on `session` (levels are RLS-protected)."""
    for key, en, sw, depth, parent_key in iter_levels(template_key):
        session.add(
            HierarchyLevelType(
                tenant_id=tenant_id,
                key=key,
                label_en=en,
                label_sw=sw,
                depth=depth,
                parent_key=parent_key,
            )
        )
    await session.flush()
