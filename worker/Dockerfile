# InternMatch AI — Python RQ Worker Dockerfile
FROM python:3.13-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY worker/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY worker/worker.py /app/worker.py
COPY worker/config.py /app/config.py
COPY worker/tasks /app/tasks
COPY backend/app /app/app

CMD ["python", "worker.py"]
