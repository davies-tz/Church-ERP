from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    announcements,
    assets,
    assignments,
    auth,
    finance,
    members,
    notifications,
    platform,
    reports,
    sacraments,
    service_requests,
    structure,
    tenant,
    transfers,
    users,
    verification,
)
from app.core.config import settings

app = FastAPI(title="Church ERP API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"http://[a-z0-9-]+\.localhost:5173",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(tenant.router)
app.include_router(structure.router)
app.include_router(members.router)
app.include_router(assignments.router)
app.include_router(users.router)
app.include_router(sacraments.router)
app.include_router(service_requests.router)
app.include_router(finance.router)
app.include_router(assets.router)
app.include_router(reports.router)
app.include_router(notifications.router)
app.include_router(verification.router)
app.include_router(transfers.router)
app.include_router(announcements.router)
app.include_router(platform.router)


@app.get("/health", tags=["meta"])
async def health():
    return {"status": "ok"}
