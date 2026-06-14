# 🌍 Project World Model (PWM) Framework

Eradicating integration debt via **Causal Digital Twins** and an asynchronous **Agent Verification Engine**.

> **Stop reacting, start predicting.** Evolving enterprise engineering management from association-level tracking (Agile/Scrum) to causal simulation.

---

## 📖 Theoretical Foundation
The **Project World Model (PWM)** framework addresses the **"Paradox of Agility" (Ketteryyden paradoksi)**: the phenomenon where exponential asset generation by L1 AI models creates massive "integration debt" that completely overwhelms linear, human-driven Agile/Scrum pipelines. 

PWM solves this by acting as a **Causal Digital Twin (CDT)**. It orchestrates an asynchronous **Agent Verification Engine** using specialized Worker and Critic agents to simulate, detect, and resolve integration debt before it hits production. 

The framework is conceptually validated by Petri Paananen's Master's Thesis: *"Itseohjautuvat työnkulut videopeliteollisuudessa: tekoälyn maailmanmallit tuotannon johtamisen viitekehyksenä"* (JAMK, 2026), published at URN: [URN:NBN:fi:amk-2026052919003](https://urn.fi/URN:NBN:fi:amk-2026052919003).

---

## 🚀 Gemini XPRIZE Hackathon Submission
This project is entered in the **Build with Gemini XPRIZE Hackathon** under the **Small Business Services** and **Entrepreneurship & Job Creation** categories.
*   **The Mission**: Empower software development teams by automating complex code integration, QA verification, and risk simulation.
*   **GCP & Gemini Stack**: Deployed on Google Cloud (Cloud Run, Firestore, Compute Engine) and powered by the **Gemini API (via Vertex AI)** for multi-agent reasoning, latent-space causal simulation, and secure critiques.
*   **Economics**: Guided by the **Compute-to-Rework Ratio (CRR)** to mathematically justify cloud and token costs against developer hourly rates.

---

## 🎨 System Architecture

The framework is organized into 5 functional layers matching the thesis specification:

![PWM Architecture Diagram](Docs/pwm_architecture_diagram.png)

1. **Layer 1: Observation & Ingestion** (`pwm/layers/layer1_observation.py`): Ingests version control, task tracking, and Slack exports, storing them in a cryptographically chained, immutable JSON Lines event log.
2. **Layer 2: Latent Simulation Core** (`pwm/layers/layer2_simulation.py`): Predicts conflict propagation in latent space, calculating causal risk probabilities and tracking CRR budgets.
3. **Layer 3: Agentic Orchestration** (`pwm/layers/layer3_orchestration.py`): Decomposes integration debt into parallel task streams routed to specialized Worker agents (QA, Build, Art Integration).
4. **Layer 4: Validation / Auditor Firewall** (`pwm/layers/layer4_validation.py`): Audits code proposals via sandboxed validation, filtering out strategic dishonesty or insecure commands.
5. **Layer 5: Scenario Strategist Interface** (`pwm/dashboard/`): Displays real-time conflict propagation, CRR gauges, debate logs, and day/night cycle schedules with human-in-the-loop veto capability.

---

## 🛠️ Codebase Structure

```
Project World Model/
├── Dockerfile                   # Cloud Run container configuration
├── deploy.sh                    # Automated Cloud Run deployment script
├── gce_gpu_setup.sh             # Setup script for CUDA, Docker & model containers on GCE
├── run_gpu_pipeline.py          # Script orchestrating GCE VM startup/shutdown lifecycle
├── Docs/                        # Architecture & setup guides
│   ├── Grand_Plan.md            # Technical blueprint
│   ├── Grand_Plan_Review.md     # Phase checklist & gap analysis
│   └── GCP_SETUP.md             # IAM, API, and Firestore setup guide
├── pwm/                         # Active package
│   ├── main.py                  # Pipeline execution CLI & loop orchestration
│   ├── config.py                # Pydantic configuration and CRR parameters
│   ├── agents/                  # Gemini-powered Worker & Critic agents
│   ├── layers/                  # Layer 1-4 REST connectors and semantic fallbacks
│   ├── ingestion/               # MCP and API adapters (GitHub, Linear, Slack)
│   ├── logging/                 # Merkle-chained event logger and Firestore backoffs
│   ├── simulation/              # CRR calculator and local debt detector
│   └── dashboard/               # FastAPI WebSocket web server & CLI dashboard
└── tests/                       # Complete pytest suite
```

---

## 💻 Quick Start & Local Execution

### 1. Installation
Clone the repository and install dependencies in a virtual environment:
```bash
python -m venv venv
source venv/Scripts/activate  # On Windows
pip install -r pwm/requirements.txt
```

### 2. Configuration
Create a `.env` file in the root directory:
```env
GOOGLE_API_KEY=your_gemini_api_key
GCP_PROJECT_ID=project-world-model
GCP_LOCATION=us-central1
```

### 3. Run Commands

* **Run CLI Demo Mode** (no API keys required):
  ```bash
  python -m pwm.main --mode demo
  ```

* **Run CLI Analyze Mode** (invokes Gemini agents):
  ```bash
  python -m pwm.main --mode analyze
  ```

* **Run Interactive Web Dashboard**:
  ```bash
  python -m pwm.main --web --port 8765
  ```
  Open `http://localhost:8765` in your browser.

* **Run continuous async loop mode**:
  ```bash
  python -m pwm.main --loop --web
  ```

* **Execute Specific Scenarios**:
  * Scenario 1 (Causal Simulation): `python -m pwm.main --scenario 1`
  * Scenario 2 (NemoClaw Sandbox Veto): `python -m pwm.main --scenario 2`
  * Scenario 3 (CRR Budget Alert): `python -m pwm.main --scenario 3`

---

## 📡 Google Cloud Platform (GCP) Deployment

The project runs in a production environment using a **hybrid serverless + on-demand GPU VM** architecture:

### 1. Web Dashboard & Orchestration (Cloud Run)
Deploys to serverless Google Cloud Run using the deployment shell script:
```bash
chmod +x deploy.sh
./deploy.sh
```
The Cloud Run instance connects serverlessly to **Vertex AI** for agent execution and **Firestore** for audit logs.

### 2. On-Demand GPU Models (Compute Engine)
Deep local models (V-JEPA 2.1, LeWorldModel, LMMs-Engine, and NVIDIA NemoClaw) run in Docker containers on a Compute Engine GPU instance:
* Use `gce_gpu_setup.sh` on the GPU VM (Ubuntu 22.04 LTS with T4/L4 GPUs) to install NVIDIA drivers and pull mock/serving endpoints.
* Run the lifecycle script locally or from Cloud Run to execute a cost-optimized pipeline:
  ```bash
  python run_gpu_pipeline.py --project your-project-id --instance pwm-gpu-host --zone us-central1-a
  ```
  This automatically starts the VM, waits for SSH connectivity, runs tests, and shuts down the instance immediately in a `finally` block to prevent unexpected billing.
* **Vertex AI Semantic Fallbacks**: If the GPU VM is offline, Layer 1-4 connectors gracefully fall back to Vertex AI (Gemini Pro/Flash) semantic calculations.

---

## 🧪 Testing

Run the automated test suite using `pytest`:
```bash
pytest tests/
```
The test suite covers:
* `test_budget_and_loop.py`: Validates token budgets, cost limits, and Critic agent feedback iteration loops.
* `test_gcp_config.py`: Verifies configuration environment loading, GCE setup scripts, and Layer REST connectors.
* `test_security_adversarial.py`: Asserts SAIF security posture, input sanitizers, and malicious code rejection.