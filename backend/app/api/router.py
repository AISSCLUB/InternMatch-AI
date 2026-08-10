"""
Main API Router Container
Mounts versioned API routers.
"""

from app.api.v1.router import api_v1_router
from fastapi import APIRouter

api_router = APIRouter()
api_router.include_router(api_v1_router, prefix="/v1")

