FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application and ML models
COPY . /app/backend
WORKDIR /app/backend

# Seed database on build/startup if needed
ENV PYTHONPATH=/app
ENV PORT=8000

EXPOSE 8000

CMD python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
