"""
Health & Operational Readiness Router
Provides endpoints to verify system process liveness and component readiness.
"""

from datetime import datetime, timezone
from typing import Optional

from app.core.config import settings
from app.db.session import get_db
from fastapi import APIRouter, Depends, Response, status
from pydantic import BaseModel
from redis import Redis
from rq import Queue, Worker
from sqlalchemy import text
from sqlalchemy.orm import Session


class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str
    timestamp: str


class ReadinessResponse(BaseModel):
    status: str
    version: str
    environment: str
    timestamp: str
    database: str
    redis: str
    worker: str


router = APIRouter()


def get_liveness() -> HealthResponse:
    """
    Process Liveness Probe.
    Dependency-independent endpoint returning 200 when API server process is alive.
    Zero DB, Redis, or RQ operations.
    """
    return HealthResponse(
        status="healthy",
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@router.get(
    "/health",
    response_model=ReadinessResponse,
    responses={
        200: {
            "model": ReadinessResponse,
            "description": "All components healthy",
        },
        503: {
            "model": ReadinessResponse,
            "description": "One or more components unavailable",
        },
    },
    summary="Versioned Operational Readiness Check",
    description=(
        "Probes PostgreSQL database connectivity, Redis connectivity, "
        "and RQ worker presence."
    ),
)
def get_readiness(
    response: Response,
    db: Session = Depends(get_db),
) -> ReadinessResponse:
    """
    Operational Readiness Probe.
    Probes PostgreSQL, Redis, and RQ default queue worker readiness.
    Returns HTTP 200 if all three are ready; HTTP 503 if any component is unavailable.
    Guarantees structured JSON without leaking credentials or exception details.
    """
    # 1. Probe Database
    database_status = "unavailable"
    try:
        db.execute(text("SELECT 1"))
        database_status = "connected"
    except Exception:
        database_status = "unavailable"
        try:
            db.rollback()
        except Exception:
            pass

    # 2 & 3. Probe Redis and RQ Worker
    redis_status = "unavailable"
    worker_status = "unavailable"
    redis_conn: Optional[Redis] = None

    try:
        redis_conn = Redis.from_url(
            settings.REDIS_URL,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        redis_conn.ping()
        redis_status = "connected"

        try:
            queue = Queue(connection=redis_conn)
            worker_count = Worker.count(queue=queue)
            if worker_count >= 1:
                worker_status = "ready"
            else:
                worker_status = "unavailable"
        except Exception:
            worker_status = "unavailable"
    except Exception:
        redis_status = "unavailable"
        worker_status = "unavailable"
    finally:
        if redis_conn is not None:
            try:
                redis_conn.close()
            except Exception:
                pass

    # Determine overall status and HTTP status code
    is_healthy = (
        database_status == "connected"
        and redis_status == "connected"
        and worker_status == "ready"
    )

    if is_healthy:
        response.status_code = status.HTTP_200_OK
        overall_status = "healthy"
    else:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        overall_status = "unhealthy"

    return ReadinessResponse(
        status=overall_status,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        timestamp=datetime.now(timezone.utc).isoformat(),
        database=database_status,
        redis=redis_status,
        worker=worker_status,
    )
