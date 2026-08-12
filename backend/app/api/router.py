from fastapi import APIRouter

from app.api.routes.outreach_messages import (
    router as outreach_messages_router,
)
from app.api.routes.prospects import (
    router as prospects_router,
)
from app.api.routes import campaigns

api_router = APIRouter(
    prefix="/api/v1",
)
api_router.include_router(
    campaigns.router
)

api_router.include_router(
    prospects_router
)

api_router.include_router(
    outreach_messages_router
)