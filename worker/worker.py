"""
InternMatch AI — Background RQ Worker Entrypoint
Authors: Mohammad & Selen (AISS Club — Üsküdar University)
"""

import logging
import sys

from app.core.config import settings, validate_production_config
from config import worker_settings
from redis import Redis
from rq import Queue, Worker

logging.basicConfig(
    level=getattr(logging, worker_settings.LOG_LEVEL.upper(), logging.INFO),
    format="[%(asctime)s] [%(levelname)s] [internmatch_worker]: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("internmatch_worker")

REDIS_URL = worker_settings.REDIS_URL
QUEUES = worker_settings.queue_list


def run_worker():
    """Initialize Redis connection and start RQ worker loop."""
    logger.info("Initializing Python RQ worker foundation...")
    # Validate production configuration before attempting network operations
    validate_production_config(settings)

    try:
        redis_conn = Redis.from_url(REDIS_URL)
        redis_conn.ping()
        logger.info("Successfully connected to Redis instance.")
    except Exception:
        logger.error("Failed to connect to Redis.")
        sys.exit(1)

    queues = [Queue(name, connection=redis_conn) for name in QUEUES]
    worker = Worker(queues, connection=redis_conn)
    logger.info(f"Worker active listening on queues: {QUEUES}")
    worker.work()


if __name__ == "__main__":
    run_worker()
