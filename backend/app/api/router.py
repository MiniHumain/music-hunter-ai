from fastapi import APIRouter

from app.api.routes.prospects import router as prospects_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(prospects_router)