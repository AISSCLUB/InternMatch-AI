"""
Foundation Worker Task
Provides a basic execution task for testing RQ queue connectivity.
"""


def ping_task() -> str:
    """Simple verification task returning pong."""
    return "pong"
