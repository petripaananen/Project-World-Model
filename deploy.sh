#!/usr/bin/env bash

# Copyright 2026 Petri Paananen
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

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
    firestore.googleapis.com \
    secretmanager.googleapis.com

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

# Build the mounted secrets list dynamically
SECRETS_MOUNT=""

# Helper to append secret if it exists in GCP Secret Manager
add_secret_if_exists() {
    local env_var="$1"
    local secret_name="$2"
    if gcloud secrets describe "${secret_name}" >/dev/null 2>&1; then
        echo "  • Secret '${secret_name}' found. Mounting as '${env_var}'."
        if [ -n "${SECRETS_MOUNT}" ]; then
            SECRETS_MOUNT="${SECRETS_MOUNT},"
        fi
        SECRETS_MOUNT="${SECRETS_MOUNT}${env_var}=${secret_name}:latest"
    else
        echo "  • Secret '${secret_name}' not found. Skipping."
    fi
}

echo "Resolving active Secret Manager keys..."
add_secret_if_exists "JIRA_USER_EMAIL" "jira-user-email"
add_secret_if_exists "JIRA_API_TOKEN" "jira-api-token"
add_secret_if_exists "GOOGLE_API_KEY" "google-api-key"
add_secret_if_exists "LINEAR_API_KEY" "linear-api-key"

DEPLOY_ARGS=(
    "${SERVICE_NAME}"
    --image="${IMAGE_TAG}"
    --region="${GCP_REGION}"
    --platform=managed
    --allow-unauthenticated
    --set-env-vars="GCP_PROJECT_ID=${GCP_PROJECT_ID},GCP_LOCATION=${GCP_REGION},PWM_ISSUE_TRACKER=jira,PWM_JIRA_PROJECT_KEY=PROJ,PWM_JIRA_CLOUD_ID=project-world-model.atlassian.net"
    --description="Project World Model (PWM) Dashboard & Orchestrator"
)

if [ -n "${SECRETS_MOUNT}" ]; then
    DEPLOY_ARGS+=(--set-secrets="${SECRETS_MOUNT}")
fi

gcloud run deploy "${DEPLOY_ARGS[@]}"

# Note on Service Accounts:
# Cloud Run automatically binds the default compute Service Account.
# You will need to grant this service account the 'Vertex AI User' role.

echo "=============================================================================="
echo "🎉 Deployment complete!"
echo "Service is running on Google Cloud Run."
echo "Verify Vertex AI access permissions in your GCP console."
echo "=============================================================================="
