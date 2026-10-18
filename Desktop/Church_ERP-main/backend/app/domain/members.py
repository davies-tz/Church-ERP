"""Member domain helpers: creation with per-tenant member numbering."""
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Member


async def next_member_no(session: AsyncSession) -> str:
    count = (await session.execute(select(func.count(Member.id)))).scalar_one()
    return f"MEM-{count + 1:04d}"


async def create_member(session: AsyncSession, *, tenant_id: str, **fields) -> Member:
    """Create a member. `fields` are the writable columns (full_name, org_unit_id,
    contact/address/personal/family). member_no is generated per tenant."""
    member = Member(
        tenant_id=tenant_id,
        member_no=await next_member_no(session),
        **fields,
    )
    session.add(member)
    await session.flush()
    return member
