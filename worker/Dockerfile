# InternMatch AI — Python RQ Worker Dockerfile
FROM python:3.13-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY worker/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create dedicated unprivileged application group and user
RUN groupadd -r appgroup && useradd -r -g appgroup -s /sbin/nologin appuser

# Copy worker application source code with non-root ownership
COPY --chown=appuser:appgroup worker/worker.py /app/worker.py
COPY --chown=appuser:appgroup worker/config.py /app/config.py
COPY --chown=appuser:appgroup worker/tasks /app/tasks
COPY --chown=appuser:appgroup backend/app /app/app

# Switch to non-root runtime user
USER appuser

# Run custom worker entrypoint
CMD ["python", "worker.py"]
