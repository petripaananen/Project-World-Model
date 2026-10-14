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

"""
JEPA-WMs Serving Microservice
=============================
Layer 2 Action-Conditioned JEPA World Model Service (facebookresearch/jepa-wms, eb_jepa).

Evaluates counterfactual interventions in continuous latent state space:
    s_{t+1} = Predictor(s_t, action)
    Energy E(s, a) = || s_{t+1} - s_t ||_2
without generating pixels or running brittle CI builds.

Default Port: 8006
Endpoint: POST /simulate-actions
"""

from __future__ import annotations

import math
import os
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import numpy as np

from pwm.simulation.jepa_core import OrthogonalPredictiveFactorizer

# Optional PyTorch acceleration
try:
    import torch  # type: ignore
    HAS_TORCH = True
    DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
except ImportError:
    HAS_TORCH = False
    DEVICE = "cpu"


class RolloutItem(BaseModel):
    action: str
    action_type: str
    predicted_risk: float
    latent_energy: float
    counterfactual_verdict: str
    predicted_state: Optional[List[float]] = None
    factor_attributions: Optional[Dict[str, float]] = None
    factor_energies: Optional[Dict[str, float]] = None


class SimulationRequest(BaseModel):
    base_state: List[float] = Field(..., description="Current latent state vector s_t")
    actions: List[Dict[str, Any]] = Field(..., description="List of candidate intervention actions")
    latent_dim: int = Field(default=64, description="Latent state dimension")


class SimulationResponse(BaseModel):
    status: str
    model: str = "jepa-wm-v1-opf"
    device: str
    rollouts: List[RolloutItem]


def _simulate_rollouts(
    base_state: List[float],
    actions: List[Dict[str, Any]],
    latent_dim: int = 64,
) -> List[RolloutItem]:
    """
    Computes action-conditioned latent transitions, energy scores, and
    Orthogonal Predictive Factorization (OPF) attributions.
    """
    num_factors = 4 if latent_dim % 4 == 0 else 1
    factor_dim = latent_dim // num_factors
    factorizer = OrthogonalPredictiveFactorizer(
        latent_dim=latent_dim,
        num_factors=num_factors,
        factor_dim=factor_dim,
    )

    rollouts: List[RolloutItem] = []

    for act in actions:
        action_name = act.get("name", "unnamed_action")
        action_type = act.get("type", "merge")
        risk_modifier = float(act.get("risk_modifier", 0.0))

        sim = factorizer.simulate_factor_action(
            base_state=base_state,
            action_name=action_name,
            action_type=action_type,
            risk_modifier=risk_modifier,
        )

        rollouts.append(RolloutItem(
            action=sim["action"],
            action_type=sim["action_type"],
            predicted_risk=sim["predicted_risk"],
            latent_energy=sim["latent_energy"],
            counterfactual_verdict=sim["counterfactual_verdict"],
            predicted_state=sim["predicted_state"],
            factor_attributions=sim.get("factor_attributions"),
            factor_energies=sim.get("factor_energies"),
        ))

    return rollouts


def create_jepa_wm_app() -> FastAPI:
    """FastAPI application factory for JEPA-WMs service."""
    app = FastAPI(
        title="JEPA-WMs Action-Conditioned World Model Service (OPF Enabled)",
        description="Predicts counterfactual action rollouts in orthogonal factorized latent space",
        version="1.1.0",
    )

    @app.get("/health")
    async def health_check():
        return {
            "status": "healthy",
            "model": "jepa-wm-v1-opf",
            "device": DEVICE,
            "torch_available": HAS_TORCH,
            "opf_enabled": True,
        }

    @app.get("/audit-geometry")
    async def audit_geometry(latent_dim: int = 64):
        num_factors = 4 if latent_dim % 4 == 0 else 1
        factorizer = OrthogonalPredictiveFactorizer(
            latent_dim=latent_dim,
            num_factors=num_factors,
            factor_dim=latent_dim // num_factors,
        )
        return factorizer.audit_geometry()

    @app.post("/simulate-actions", response_model=SimulationResponse)
    async def simulate_actions(payload: SimulationRequest):
        try:
            rollouts = _simulate_rollouts(
                base_state=payload.base_state,
                actions=payload.actions,
                latent_dim=payload.latent_dim,
            )
            return SimulationResponse(
                status="rollouts_simulated",
                model="jepa-wm-v1",
                device=DEVICE,
                rollouts=rollouts,
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"JEPA-WM rollout failed: {str(e)}")

    return app


app = create_jepa_wm_app()

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PWM_JEPA_WM_PORT", "8006"))
    host = os.getenv("PWM_JEPA_WM_HOST", "0.0.0.0")
    print(f"🚀 Launching JEPA-WMs Service on {host}:{port} (Device: {DEVICE})...")
    uvicorn.run(app, host=host, port=port)
