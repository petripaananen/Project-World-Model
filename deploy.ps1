# ==============================================================================
# Google Cloud Run Deployment Script for Project World Model (PowerShell)
# ==============================================================================
# Sets up GCP project context, triggers Google Cloud Build, and deploys
# the containerized dashboard service to Cloud Run.
# ==============================================================================

$ErrorActionPreference = "Stop"

# --- GCP Configuration ---
$GCP_PROJECT_ID = "project-world-model"
$GCP_REGION = "us-central1"
$SERVICE_NAME = "project-world-model"
$REPOSITORY_NAME = "pwm-containers"

Write-Host "=== 1. Setting up GCP Project context ==="
gcloud config set project $GCP_PROJECT_ID

Write-Host "=== 2. Enabling GCP Services ==="
gcloud services enable `
    run.googleapis.com `
    artifactregistry.googleapis.com `
    aiplatform.googleapis.com `
    firestore.googleapis.com `
    secretmanager.googleapis.com

Write-Host "=== 3. Creating Artifact Registry Repository ==="
try {
    gcloud artifacts repositories create $REPOSITORY_NAME `
        --repository-format=docker `
        --location=$GCP_REGION `
        --description="Docker repository for Project World Model" `
        --quiet
} catch {
    Write-Host "Repository already exists or error, skipping."
}

$IMAGE_TAG = "${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${REPOSITORY_NAME}/${SERVICE_NAME}:latest"

Write-Host "=== 4. Building container via Google Cloud Build ==="
gcloud builds submit --tag $IMAGE_TAG .

Write-Host "=== 5. Deploying to Google Cloud Run ==="

# Build the mounted secrets list dynamically
$secrets = @()

$active_secrets = @(gcloud secrets list --format="value(name)")

function Add-SecretIfExists($env_var, $secret_name) {
    if ($active_secrets -contains $secret_name) {
        Write-Host "  • Secret '$secret_name' found. Mounting as '$env_var'."
        return "${env_var}=${secret_name}:latest"
    } else {
        Write-Host "  • Secret '$secret_name' not found. Skipping."
        return $null
    }
}

$s1 = Add-SecretIfExists "JIRA_USER_EMAIL" "jira-user-email"
if ($s1) { $secrets += $s1 }
$s2 = Add-SecretIfExists "JIRA_API_TOKEN" "jira-api-token"
if ($s2) { $secrets += $s2 }
$s3 = Add-SecretIfExists "GOOGLE_API_KEY" "google-api-key"
if ($s3) { $secrets += $s3 }
$s4 = Add-SecretIfExists "LINEAR_API_KEY" "linear-api-key"
if ($s4) { $secrets += $s4 }

$secrets_str = $secrets -join ","

$deploy_args = @(
    "run", "deploy", $SERVICE_NAME,
    "--image=$IMAGE_TAG",
    "--region=$GCP_REGION",
    "--platform=managed",
    "--allow-unauthenticated",
    "--set-env-vars=GCP_PROJECT_ID=${GCP_PROJECT_ID},GCP_LOCATION=${GCP_REGION},PWM_ISSUE_TRACKER=jira,PWM_JIRA_PROJECT_KEY=PROJ,PWM_JIRA_CLOUD_ID=project-world-model.atlassian.net",
    "--description=Project World Model (PWM) Dashboard & Orchestrator"
)

if ($secrets_str) {
    $deploy_args += "--set-secrets=$secrets_str"
}

# Run deployment
gcloud @deploy_args

Write-Host "=============================================================================="
Write-Host "🎉 Deployment complete!"
Write-Host "Service is running on Google Cloud Run."
Write-Host "Verify Vertex AI access permissions in your GCP console."
Write-Host "=============================================================================="
