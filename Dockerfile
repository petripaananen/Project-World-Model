# Use official lightweight Python image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8765

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY pwm/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy active codebase
COPY pwm /app/pwm

# Create directory for local logs (if not using database)
RUN mkdir -p /app/output && chmod 777 /app/output

# Expose port
EXPOSE 8765

# Launch the orchestrator in mock loop mode with web dashboard
CMD python -m pwm.main --mode demo --ingestion mock --web --loop --port 8765
