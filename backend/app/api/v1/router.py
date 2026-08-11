"""
API v1 Router Aggregator
Includes all sub-routers for version 1 of the REST API.
"""

from app.api.v1.endpoints import auth, health, internships, jobs, profile
from fastapi import APIRouter

api_v1_router = APIRouter()

# Register operational health router
api_v1_router.include_router(health.router, tags=["Health Operations"])

# Register authentication router
api_v1_router.include_router(auth.router, prefix="/auth", tags=["Authentication Operations"])

# Register protected candidate profile router
api_v1_router.include_router(profile.router, prefix="/profile", tags=["Profile Operations"])

# Register public internship catalog router
api_v1_router.include_router(internships.router, prefix="/internships", tags=["Internship Catalog"])

# Register processing job status tracking router
api_v1_router.include_router(jobs.router, prefix="/jobs", tags=["Job Tracking"])
