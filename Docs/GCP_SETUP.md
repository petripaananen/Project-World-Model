# 🌍 Google Cloud Platform Setup & Deployment Guide

This guide details the configurations, permission policies (IAM), and infrastructure steps to transition **Project World Model (PWM)** from local development to a 24-hour orchestration cycle running on Google Cloud Run and Vertex AI.

---

## 1. GCP Services Enablement

Run the following command to enable the required APIs in your GCP project:

```bash
gcloud services enable \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    aiplatform.googleapis.com \
    firestore.googleapis.com
```

- **Cloud Run API**: Serves the FastAPI web dashboard.
- **Artifact Registry API**: Hosts the container image.
- **Vertex AI API**: Powers the Worker and Critic agents via the Gemini API.
- **Firestore API**: Manages serverless log audit storage.

---

## 2. IAM Service Account Permissions

Cloud Run services execute using the identity of a Google Service Account. By default, Cloud Run uses the **Default Compute Service Account** (`PROJECT_NUMBER-compute@developer.gserviceaccount.com`). 

For production security (SAIF compliance), we recommend creating a dedicated service account with **Least-Privilege** bindings:

```bash
# 1. Create a dedicated service account
gcloud iam service-accounts create pwm-orchestrator-sa \
    --description="Service account for Project World Model Orchestrator and Dashboard" \
    --display-name="PWM Orchestrator Service Account"

# 2. Bind Vertex AI User role (read-only model invocation)
gcloud projects add-iam-policy-binding YOUR_GCP_PROJECT_ID \
    --member="serviceAccount:pwm-orchestrator-sa@YOUR_GCP_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"

# 3. Bind Cloud Datastore User role (for Firestore audit logs write/read access)
gcloud projects add-iam-policy-binding YOUR_GCP_PROJECT_ID \
    --member="serviceAccount:pwm-orchestrator-sa@YOUR_GCP_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/datastore.user"
```

---

## 3. Storage Audit Logs: Firestore vs. AlloyDB

For 24-hour orchestration and compliance logs, we evaluate two database options:

| Criteria | Google Cloud Firestore (Recommended) | Google Cloud AlloyDB |
|----------|-------------------------------------|----------------------|
| **Architecture** | Serverless NoSQL Document Store | Managed Relational PostgreSQL-compatible DB |
| **Ops Overhead** | **Zero Ops**: No VPC config, instance sizing, or pooling needed. | **High Ops**: Requires VPC Peering, Serverless VPC Access Connector, connection pooling. |
| **Cost** | **Incredibly Cheap**: Free tier of 50K reads/writes daily; then $0.18 per 100K. | **Expensive**: Starts at $100+/month for standard database instances. |
| **Connection** | Direct via `google-cloud-firestore` SDK. | Needs SQLAlchemy + async pg driver + VPC proxy. |
| **Recommendation** | **Ideal for XPRIZE Demo & Sandbox**: Provides instant JSON storage with zero VPC overhead. | **Ideal for Enterprise Scale**: Fits large SQL analytics workloads. |

### Firestore Implementation Outline

To migrate `EventLogger` from local JSON Lines to Firestore, add the `google-cloud-firestore` package and update `pwm/logging/event_logger.py`:

```python
from google.cloud import firestore

class FirestoreEventLogger:
    def __init__(self, project_id: str):
        self.db = firestore.Client(project=project_id)
        self.collection_name = "pwm_audit_events"

    async def log(self, event: PWMEvent) -> None:
        # Save structured document directly
        doc_ref = self.db.collection(self.collection_name).document(event.event_id)
        doc_ref.set(event.model_dump())

    def get_events(self, run_id: Optional[str] = None, limit: int = 100) -> List[PWMEvent]:
        query = self.db.collection(self.collection_name)
        if run_id:
            query = query.where("run_id", "==", run_id)
        # Order by timestamp descending and fetch
        docs = query.order_by("timestamp", direction=firestore.Query.DESCENDING).limit(limit).stream()
        return [PWMEvent(**doc.to_dict()) for doc in docs]
```

---

## 4. Deploying to Cloud Run

1. Log in to the Google Cloud SDK:
   ```bash
   gcloud auth login
   ```
2. Set execute permissions on the deployment script:
   ```bash
   chmod +x deploy.sh
   ```
3. Edit `deploy.sh` to update `YOUR_GCP_PROJECT_ID_PLACEHOLDER` with your actual project ID.
4. Execute:
   ```bash
   ./deploy.sh
   ```
5. Note the output Service URL. The dashboard is now publicly hosted and secure, calling the production Vertex AI API endpoints under the hood.
