# Stage 1: Build the React frontend
FROM node:22-slim AS frontend-builder
WORKDIR /app/visualizer
COPY visualizer/package.json visualizer/package-lock.json* ./
RUN npm install
COPY visualizer/ ./
RUN npm run build

# Stage 2: Build the Python backend
FROM python:3.12-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir uvicorn fastapi pytz starlette pydantic requests

# Copy active codebase
COPY pwm/ ./pwm/

# Copy the built frontend from Stage 1
COPY --from=frontend-builder /app/visualizer/dist ./visualizer/dist

# Expose port (Cloud Run sets PORT automatically, defaults to 8080)
ENV PORT=8080
EXPOSE 8080

# Launch the orchestrator in demo mode
CMD python -m pwm.main --mode demo --ingestion mock --web --loop --no-interactive
