"""Authorization: capabilities, the role catalog, and scope-aware permission checks.

Design: a role is a *function* (what you can do), an org unit is the *scope* (where).
The same "admin" role means diocese-admin when assigned at a diocese and parish-admin
when assigned at a parish — no per-denomination role explosion. Authorization =
"does any active assignment grant the capability with a scope covering the target?"
"""
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Assignment, OrgUnit

# --- Capabilities -----------------------------------------------------------
MANAGE_STRUCTURE = "manage_structure"
MANAGE_MEMBERS = "manage_members"
MANAGE_SACRAMENTS = "manage_sacraments"
MANAGE_ASSETS = "manage_assets"
RECORD_FINANCE = "record_finance"
VIEW_FINANCE = "view_finance"
VIEW_REPORTS = "view_reports"
APPROVE = "approve"
APPOINT = "appoint"

ALL_CAPABILITIES = frozenset(
    {MANAGE_STRUCTURE, MANAGE_MEMBERS, MANAGE_SACRAMENTS, MANAGE_ASSETS,
     RECORD_FINANCE, VIEW_FINANCE, VIEW_REPORTS, APPROVE, APPOINT}
)

# --- Role catalog (function -> capabilities) --------------------------------
# Kept in code for now; can move to a per-tenant table later without touching the
# Assignment schema (role_key stays a string).
ROLE_CAPS: dict[str, frozenset[str]] = {
    "tenant_admin": frozenset(
        {APPOINT, MANAGE_STRUCTURE, MANAGE_MEMBERS, MANAGE_SACRAMENTS,
         MANAGE_ASSETS, VIEW_FINANCE, VIEW_REPORTS, APPROVE}
    ),
    "admin": frozenset(
        {APPOINT, MANAGE_STRUCTURE, MANAGE_MEMBERS, MANAGE_SACRAMENTS,
         MANAGE_ASSETS, VIEW_FINANCE, VIEW_REPORTS, APPROVE}
    ),
    # Sacraments are pastoral acts: clergy record them.
    "pastor": frozenset({MANAGE_MEMBERS, MANAGE_SACRAMENTS, APPROVE}),
    "secretary": frozenset({MANAGE_MEMBERS}),
    "treasurer": frozenset({RECORD_FINANCE, VIEW_FINANCE}),
    "member": frozenset(),
}

ROLE_LABELS: dict[str, tuple[str, str]] = {  # (en, sw)
    "tenant_admin": ("Institution Admin", "Admin wa Taasisi"),
    "admin": ("Administrator", "Msimamizi"),
    "pastor": ("Pastor / Priest", "Mchungaji / Padri"),
    "secretary": ("Secretary", "Katibu"),
    "treasurer": ("Treasurer", "Mhasibu"),
    "member": ("Member", "Muumini"),
}


class AuthzError(ValueError):
    """Raised for invalid role keys or forbidden appointments."""


def role_capabilities(role_key: str) -> frozenset[str]:
    return ROLE_CAPS.get(role_key, frozenset())


@dataclass(frozen=True)
class Grant:
    role_key: str
    scope_path: str
    capabilities: frozenset[str]


async def load_grants(session: AsyncSession, user_id) -> list[Grant]:
    rows = (
        await session.execute(
            select(Assignment).where(
                Assignment.user_id == user_id, Assignment.active.is_(True)
            )
        )
    ).scalars().all()
    return [
        Grant(a.role_key, a.scope_path, role_capabilities(a.role_key)) for a in rows
    ]


def _covers(scope_path: str, target_path: str) -> bool:
    # A scope governs a target if the target is at or below the scope in the tree.
    # Tenant-wide scope "/" is a prefix of every unit path, so it covers everything.
    return target_path.startswith(scope_path)


def can(grants: list[Grant], capability: str, target_path: str | None = None) -> bool:
    """True if any grant provides `capability`. If `target_path` is given, the grant's
    scope must also cover that path (scoped check); if None, any scope qualifies."""
    for g in grants:
        if capability in g.capabilities and (
            target_path is None or _covers(g.scope_path, target_path)
        ):
            return True
    return False


def aggregate_capabilities(grants: list[Grant]) -> set[str]:
    caps: set[str] = set()
    for g in grants:
        caps |= g.capabilities
    return caps


async def create_assignment(
    session: AsyncSession,
    *,
    tenant_id: str,
    user_id: str,
    role_key: str,
    org_unit: OrgUnit | None = None,
) -> Assignment:
    """Grant a user a role at a unit (or tenant-wide when org_unit is None). The
    scope_path is derived from the unit so authorization stays a simple prefix test."""
    if role_key not in ROLE_CAPS:
        raise AuthzError(f"Unknown role '{role_key}'")
    assignment = Assignment(
        tenant_id=tenant_id,
        user_id=user_id,
        role_key=role_key,
        org_unit_id=org_unit.id if org_unit else None,
        scope_path=org_unit.path if org_unit else "/",
        active=True,
    )
    session.add(assignment)
    await session.flush()
    return assignment
