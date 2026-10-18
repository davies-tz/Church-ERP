from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response

from app.api.deps import get_scoped_session
from app.domain import authz, reports
from app.schemas.report import DashboardResponse

router = APIRouter(prefix="/reports", tags=["reports"])


async def _require(session, user):
    grants = await authz.load_grants(session, user.id)
    if not authz.can(grants, authz.VIEW_REPORTS):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Missing capability: view_reports")


@router.get("/dashboard", response_model=DashboardResponse)
async def dashboard(ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    await _require(session, user)
    return DashboardResponse(**await reports.dashboard(session))


def _csv_response(content: str, filename: str) -> Response:
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/members.csv")
async def members_csv(ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    await _require(session, user)
    return _csv_response(await reports.members_csv(session), "members.csv")


@router.get("/finance.csv")
async def finance_csv(ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    await _require(session, user)
    return _csv_response(await reports.finance_csv(session), "finance.csv")


@router.get("/sacraments.csv")
async def sacraments_csv(ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    await _require(session, user)
    return _csv_response(await reports.sacraments_csv(session), "sacraments.csv")
