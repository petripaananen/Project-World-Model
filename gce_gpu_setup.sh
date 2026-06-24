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
# PWM GCE GPU Setup & Serving Script
# ==============================================================================
# Sets up CUDA, Docker, NVIDIA Container Toolkit, and launches lightweight
# serving endpoints for V-JEPA 2.1, LeWorldModel (LeWM), LMMs-Engine, and NemoClaw.
#
# Target OS: Ubuntu 22.04 LTS (with NVIDIA L4 or T4 GPU)
# ==============================================================================

set -euo pipefail

echo "🚀 Starting GCE GPU setup for Project World Model..."

# 1. Update system packages
echo "📦 Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y curl git build-essential python3-pip python3-venv

# 2. Install NVIDIA CUDA Drivers
echo "🔌 Installing NVIDIA CUDA Drivers..."
if ! command -v nvidia-smi &> /dev/null; then
    sudo apt-get install -y linux-headers-$(uname -r)
    # Install driver using standard Ubuntu repository
    sudo apt-get install -y nvidia-driver-535 nvidia-utils-535
    echo "⚠️ System reboot may be required for CUDA drivers to load."
else
    echo "✅ NVIDIA Drivers already installed."
    nvidia-smi
fi

# 3. Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
else
    echo "✅ Docker already installed."
fi

# 4. Install NVIDIA Container Toolkit
echo "🛠️ Installing NVIDIA Container Toolkit..."
if ! dpkg -l | grep -q nvidia-container-toolkit; then
    curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
    curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
      sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
      sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
    sudo apt-get update
    sudo apt-get install -y nvidia-container-toolkit
    sudo nvidia-ctk runtime configure --runtime=docker
    sudo systemctl restart docker
else
    echo "✅ NVIDIA Container Toolkit already installed."
fi

# 5. Build/Run Serving Containers
# In a real environment, we would pull pre-built containers or spin up lightweight FastAPI wrappers.
# Here we setup the mock directories and Dockerfiles for the model services.

echo "📂 Configuring Model Serving directory..."
mkdir -p ~/pwm-models/vjepa ~/pwm-models/lewm ~/pwm-models/lmms ~/pwm-models/nemoclaw

# --- 5a. Layer 1: V-JEPA Service ---
echo "📝 Creating V-JEPA server mock..."
cat << 'EOF' > ~/pwm-models/vjepa/app.py
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="V-JEPA 2.1 Telemetry Encoder API")

class TelemetryPayload(BaseModel):
    data: dict

@app.post("/encode")
async def encode_telemetry(payload: TelemetryPayload):
    # Simulate V-JEPA dense feature representation
    # (L1: representational straightening of Git/Jira logs)
    data = payload.data
    return {
        "status": "encoded",
        "model": "v-jepa-2.1-dense",
        "embeddings": [0.0125 * len(str(data))] * 64,
        "features_straightened": True
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
EOF

# --- 5b. Layer 2: LeWorldModel (LeWM) Service ---
echo "📝 Creating LeWM server mock..."
cat << 'EOF' > ~/pwm-models/lewm/app.py
from fastapi import FastAPI
from pydantic import BaseModel
import random

app = FastAPI(title="LeWorldModel (LeWM) Latent Simulator API")

class SimulationPayload(BaseModel):
    action: str
    state_vector: list

@app.post("/simulate")
async def simulate_action(payload: SimulationPayload):
    # L2 action-conditioned latent-space counterfactual simulation
    action = payload.action
    base_risk = random.uniform(0.1, 0.4)
    if "reallocate" in action.lower():
        risk_adjustment = -0.15
    elif "force" in action.lower():
        risk_adjustment = 0.30
    else:
        risk_adjustment = 0.0

    simulated_risk = max(0.01, min(0.99, base_risk + risk_adjustment))

    return {
        "status": "success",
        "model": "lewm-action-conditioned-v2",
        "next_state_prediction": [val * 0.95 for val in payload.state_vector],
        "causal_risk": simulated_risk,
        "confidence": 0.85
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
EOF

# --- 5c. Layer 3: LMMs-Engine (Orchestrator Visuals) Service ---
echo "📝 Creating LMMs-Engine server mock..."
cat << 'EOF' > ~/pwm-models/lmms/app.py
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="LMMs-Engine API")

class LayoutPayload(BaseModel):
    image_base64: str

@app.post("/parse-layout")
async def parse_layout(payload: LayoutPayload):
    # L3: Visual Gantt/dependency parsing
    return {
        "status": "parsed",
        "model": "lmms-engine-visual-v1",
        "detected_milestones": ["Sprint 3 Completion", "Integration Freeze"],
        "critical_path_conflicts": ["Asset import collision in LFS"],
        "estimated_rework_hours": 12.5
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
EOF

# --- 5d. Layer 4: NVIDIA NemoClaw (Validation Sandbox) Service ---
echo "📝 Creating NemoClaw server mock..."
cat << 'EOF' > ~/pwm-models/nemoclaw/app.py
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="NVIDIA NemoClaw Secure Sandbox API")

class CodeProposalPayload(BaseModel):
    code_proposal: str

@app.post("/audit")
async def audit_code(payload: CodeProposalPayload):
    # L4: Secure sandbox validation for Strategic Dishonesty and compliance
    code = payload.code_proposal
    flagged = []
    
    # Simple heuristics for sandbox audit
    suspicious_keywords = ["bypass", "chmod 777", "disable_security", "rm -rf /", "curl http://"]
    for kw in suspicious_keywords:
        if kw in code.lower():
            flagged.append(kw)
            
    is_safe = len(flagged) == 0
    verdict = "APPROVED" if is_safe else "REJECTED"
    
    return {
        "verdict": verdict,
        "model": "nemoclaw-secure-sandbox-v1",
        "sandbox_exit_code": 0 if is_safe else 1,
        "flagged_issues": flagged,
        "details": "Audited proposal code within isolated open-shell sandbox."
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
EOF

# 6. Compose file or run script
echo "📝 Creating Docker Compose configuration..."
cat << 'EOF' > ~/pwm-models/docker-compose.yml
version: '3.8'

services:
  vjepa:
    build:
      context: ./vjepa
      dockerfile: Dockerfile
    ports:
      - "8001:8001"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]

  lewm:
    build:
      context: ./lewm
      dockerfile: Dockerfile
    ports:
      - "8002:8002"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]

  lmms:
    build:
      context: ./lmms
      dockerfile: Dockerfile
    ports:
      - "8003:8003"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]

  nemoclaw:
    build:
      context: ./nemoclaw
      dockerfile: Dockerfile
    ports:
      - "8004:8004"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
EOF

# Create Dockerfiles for all models
for model in vjepa lewm lmms nemoclaw; do
  cat << EOF > ~/pwm-models/$model/Dockerfile
FROM pytorch/pytorch:2.1.2-cuda12.1-cudnn8-runtime

WORKDIR /app
RUN pip install fastapi uvicorn pydantic

COPY app.py .

CMD ["python", "app.py"]
EOF
done

echo "✅ GCE GPU Setup configuration complete."
echo "💡 To run all services with docker-compose: cd ~/pwm-models && docker compose up --build -d"
