"""
Backend Match Calculation Enqueue Service
Provides small Redis/RQ enqueue boundary for dispatching match calculation jobs.
"""

from typing import Any
from uuid import UUID

from redis import Redis
from rq import Queue

from app.core.config import settings


def enqueue_match_calculation(
    job_id: UUID,
    user_id: UUID,
    candidate_limit: int = 50,
) -> Any:
    """
    Enqueue match calculation task to default RQ queue.
    Validates candidate_limit > 0 before connecting to Redis.
    Passes worker task positional arguments as durable strings and specifies RQ job_id keyword.
    """
    if candidate_limit <= 0:
        raise ValueError(f"Invalid candidate_limit {candidate_limit}. Limit must be > 0.")

    redis_conn = Redis.from_url(settings.REDIS_URL)
    queue = Queue(connection=redis_conn)

    task_path = "tasks.match_calculation.run_match_calculation"
    rq_job = queue.enqueue(
        task_path,
        str(job_id),
        str(user_id),
        candidate_limit,
        job_id=str(job_id),
        job_timeout=180,
    )
    return rq_job
