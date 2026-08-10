"""
Worker Task Foundation Tests
Verifies task module imports and ping_task execution.
"""

import sys
from pathlib import Path

# Add worker directory to path for test execution
worker_dir = Path(__file__).parent.parent / "worker"
if str(worker_dir) not in sys.path:
    sys.path.insert(0, str(worker_dir))

from tasks.example_task import ping_task  # noqa: E402


def test_worker_ping_task():
    """Verify ping_task returns expected response."""
    result = ping_task()
    assert result == "pong"
