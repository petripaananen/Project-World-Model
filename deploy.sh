#!/usr/bin/env bash
# ==============================================================================
# Google Cloud Run Deployment Script for Project World Model
# ==============================================================================
# Sets up GCP environment variables, triggers Google Cloud Build, and deploys
# the containerized dashboard service to Cloud Run.
# ==============================================================================

# Exit immediately if a command exits with a non-zero status
set -e

# --- GCP Configuration ---
GCP_PROJECT_ID="project-world-model"
GCP_REGION="us-central1"
SERVICE_NAME="project-world-model"
REPOSITORY_NAME="pwm-containers"

echo "=== 1. Setting up GCP Project context ==="
gcloud config set project "${GCP_PROJECT_ID}" || echo "Warning: Could not set project. Ensure you run gcloud login first."

echo "=== 2. Enabling GCP Services ==="
gcloud services enable \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    aiplatform.googleapis.com \
    firestore.googleapis.com

echo "=== 3. Creating Artifact Registry Repository ==="
gcloud artifacts repositories create "${REPOSITORY_NAME}" \
    --repository-format=docker \
    --location="${GCP_REGION}" \
    --description="Docker repository for Project World Model" \
    || echo "Repository already exists, skipping."

IMAGE_TAG="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${REPOSITORY_NAME}/${SERVICE_NAME}:latest"

echo "=== 4. Building container via Google Cloud Build ==="
gcloud builds submit --tag "${IMAGE_TAG}" .

echo "=== 5. Deploying to Google Cloud Run ==="
gcloud run deploy "${SERVICE_NAME}" \
    --image="${IMAGE_TAG}" \
    --region="${GCP_REGION}" \
    --platform=managed \
    --allow-unauthenticated \
    --set-env-vars="GCP_PROJECT_ID=${GCP_PROJECT_ID},GCP_LOCATION=${GCP_REGION}" \
    --description="Project World Model (PWM) Dashboard & Orchestrator"

# Note on Service Accounts:
# Cloud Run automatically binds the default compute Service Account.
# You will need to grant this service account the 'Vertex AI User' role.

echo "=============================================================================="
echo "🎉 Deployment complete!"
echo "Service is running on Google Cloud Run."
echo "Verify Vertex AI access permissions in your GCP console."
echo "=============================================================================="
