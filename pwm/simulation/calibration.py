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
PWM Calibration Engine — Layer 2 Self-Supervised Grounding
===========================================================

Quantifies prediction drift by calculating the L2 Euclidean distance
(Grounding Error) between a simulated prediction from run t-1 and the actual
observed state at run t. Adjusts a local projection factor to align
latent space dynamics.
"""

from __future__ import annotations

import json
import math
from datetime import datetime
from pathlib import Path
from typing import Optional, Any, Dict, List
import numpy as np

from pydantic import BaseModel, Field
from pwm.config import PWMConfig
from pwm.simulation.jepa_core import OrthogonalPredictiveFactorizer


class SystemIdentificationVector(BaseModel):
    """
    Continuous 4D System Identification Vector z_env in R^4.
    Inferred directly from trajectory dynamics and hypergraph events.
    
    Dimensions:
      1. gamma_rev in [0, 1]: Reversibility Index
      2. kappa_coupling in [0, 1]: Coupling Rigidity
      3. tau_latency in R^+: Action-to-State Observation Lag
      4. sigma_exo in [0, 1]: Exogenous Stochasticity
    """
    reversibility: float = Field(
        default=1.0, ge=0.0, le=1.0,
        description="gamma_rev: Ratio of reversible vs. irreversible state transitions [0, 1].",
    )
    coupling: float = Field(
        default=0.2, ge=0.0, le=1.0,
        description="kappa_coupling: Average downstream cascade depth / dependency density [0, 1].",
    )
    latency: float = Field(
        default=1.0, ge=0.0,
        description="tau_latency: Normalized action-to-state observation lag >= 0.",
    )
    stochasticity: float = Field(
        default=0.1, ge=0.0, le=1.0,
        description="sigma_exo: Residual transition variance not explained by internal actions [0, 1].",
    )

    def to_list(self) -> List[float]:
        return [self.reversibility, self.coupling, self.latency, self.stochasticity]

    def to_dict(self) -> Dict[str, float]:
        return {
            "reversibility": round(self.reversibility, 4),
            "coupling": round(self.coupling, 4),
            "latency": round(self.latency, 4),
            "stochasticity": round(self.stochasticity, 4),
        }


class TimeWarpedClock:
    """
    Intrinsic Information-Entropy Event Clock.
    Steps the world model based on state flux and anomaly stagnation
    rather than rigid wall-clock ticks:
        Delta tau_k = 1 <==> ||s_t - s_{t-1}||_2 >= theta_flux OR TimeSinceLastStep > tau_max
    """
    def __init__(self, theta_flux: float = 0.15, tau_max: float = 3600.0):
        self.theta_flux = theta_flux
        self.tau_max = tau_max
        self.last_state: Optional[List[float]] = None
        self.last_step_time: float = datetime.now().timestamp()
        self.step_count: int = 0

    def step(self, current_state: List[float], current_time: Optional[float] = None) -> bool:
        """
        Evaluates whether a clock step is triggered.
        Returns True if triggered (flux burst or stagnation anomaly), False otherwise.
        """
        now = current_time if current_time is not None else datetime.now().timestamp()
        time_since = now - self.last_step_time

        if self.last_state is None:
            self.last_state = list(current_state)
            self.last_step_time = now
            self.step_count += 1
            return True

        # Calculate state flux ||s_t - s_{t-1}||_2
        flux = math.sqrt(sum((c - l) ** 2 for c, l in zip(current_state, self.last_state)))
        triggered = (flux >= self.theta_flux) or (time_since > self.tau_max)

        if triggered:
            self.last_state = list(current_state)
            self.last_step_time = now
            self.step_count += 1

        return triggered


class WorldModelCalibrator:
    """
    PWM Calibration Engine — Layer 2 Self-Supervised Grounding (with RSI-Anything OPF Trajectory Buffer).
    
    Tracks prediction errors across 4 orthogonal factor subspaces (topology, velocity,
    coordination, architecture), infers continuous 4D system identification z_env,
    and adapts projection weights to prevent drift in simulated world model projections.
    """

    def __init__(self, config: PWMConfig, state_path: Optional[Path] = None):
        self.config = config
        self.state_path = state_path or (config.output_dir / "calibration_state.json")
        self.calibration_factor: float = 1.0
        self.factor_weights: Dict[str, float] = {
            "topology": 1.0,
            "velocity": 1.0,
            "coordination": 1.0,
            "architecture": 1.0,
        }
        self.z_env: SystemIdentificationVector = SystemIdentificationVector()
        self.clock: TimeWarpedClock = TimeWarpedClock()
        self.last_predicted_latent_state: Optional[list[float]] = None
        self.history: list[dict[str, Any]] = []
        self.trajectory_buffer: list[dict[str, Any]] = []
        self.factorizer = OrthogonalPredictiveFactorizer(latent_dim=64, num_factors=4, factor_dim=16)

    def load_state(self) -> None:
        """Load calibration state, factor weights, and z_env from disk."""
        if not self.state_path.exists():
            return
        try:
            with open(self.state_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.calibration_factor = data.get("calibration_factor", 1.0)
                self.factor_weights = data.get("factor_weights", self.factor_weights)
                self.last_predicted_latent_state = data.get("last_predicted_latent_state")
                self.history = data.get("history", [])
                self.trajectory_buffer = data.get("trajectory_buffer", [])
                z_data = data.get("z_env")
                if z_data:
                    self.z_env = SystemIdentificationVector(**z_data)
        except Exception as e:
            if self.config.verbose:
                print(f"🌲 [Calibrator] Error loading calibration state: {e}")

    def save_state(self) -> None:
        """Save calibration state, factor weights, trajectory buffer, and z_env to disk."""
        try:
            self.state_path.parent.mkdir(parents=True, exist_ok=True)
            data = {
                "calibration_factor": self.calibration_factor,
                "factor_weights": self.factor_weights,
                "z_env": self.z_env.to_dict(),
                "last_predicted_latent_state": self.last_predicted_latent_state,
                "history": self.history,
                "trajectory_buffer": self.trajectory_buffer,
            }
            with open(self.state_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            if self.config.verbose:
                print(f"🌲 [Calibrator] Error saving calibration state: {e}")

    def calculate_grounding_error(
        self, predicted: list[float], actual: list[float]
    ) -> float:
        """
        Calculate the L2 Euclidean distance (Grounding Error) between
        the predicted next latent state and the actual observed latent state.
        
        Args:
            predicted: Predicted 64d latent vector from previous run
            actual: Actual 64d latent vector from current run
            
        Returns:
            Euclidean distance. Returns 0.0 if either list is empty/None or of mismatched size.
        """
        if not predicted or not actual:
            return 0.0
        if len(predicted) != len(actual):
            if self.config.verbose:
                print(
                    f"🌲 [Calibrator] Warning: State vector dimension mismatch: "
                    f"{len(predicted)} vs {len(actual)}"
                )
            min_len = min(len(predicted), len(actual))
            predicted = predicted[:min_len]
            actual = actual[:min_len]

        total_sq = sum((p - a) ** 2 for p, a in zip(predicted, actual))
        return math.sqrt(total_sq)

    def update_calibration_factor(self, error: float) -> float:
        """
        Adapt the calibration factor using an online learning rate update.
        
        Formula:
            calibration_factor = calibration_factor * (1.0 - learning_rate * (error - target_error))
            Bound within [0.01, 10.0] to prevent runaway or division by zero.
        """
        learning_rate = 0.05
        target_error = 0.05
        delta = error - target_error

        self.calibration_factor = max(
            0.01,
            min(10.0, self.calibration_factor * (1.0 - learning_rate * delta)),
        )

        # Log history
        self.history.append({
            "timestamp": datetime.now().isoformat(),
            "error": error,
            "calibration_factor": self.calibration_factor,
        })
        
        # Limit history size
        if len(self.history) > 100:
            self.history = self.history[-100:]

        return self.calibration_factor

    def calculate_factorized_grounding_error(
        self, predicted: list[float], actual: list[float]
    ) -> Dict[str, float]:
        """
        RSI-Anything / JEPA-Anything Factorized Grounding:
        Calculates L2 Euclidean distance across the 4 orthogonal factor subspaces
        (topology, velocity, coordination, architecture) between predicted
        latent state and observed actual state.

        Args:
            predicted: Predicted 64d latent state vector
            actual: Actual observed 64d latent state vector

        Returns:
            Dictionary mapping each factor subspace name to its grounding error.
        """
        if not predicted or not actual:
            return {fname: 0.0 for fname in self.factorizer.FACTOR_NAMES}

        pred_coords = self.factorizer.decompose(predicted)
        act_coords = self.factorizer.decompose(actual)

        factor_errors: Dict[str, float] = {}
        for idx, fname in enumerate(self.factorizer.FACTOR_NAMES):
            diff = pred_coords[idx] - act_coords[idx]
            dist = float(np.linalg.norm(diff))
            factor_errors[fname] = round(dist, 4)

        return factor_errors

    def update_factor_weights(self, factor_errors: Dict[str, float]) -> Dict[str, float]:
        """
        Adapts per-factor projection weights based on observed factor grounding errors
        using an online learning rate update.
        Formula:
            w_k = w_k * (1.0 - learning_rate * (error_k - target_error))
        Bound within [0.01, 10.0].
        """
        learning_rate = 0.05
        target_error = 0.05
        for fname, err in factor_errors.items():
            if fname in self.factor_weights:
                delta = err - target_error
                new_weight = self.factor_weights[fname] * (1.0 - learning_rate * delta)
                self.factor_weights[fname] = round(max(0.01, min(10.0, new_weight)), 4)

        return self.factor_weights

    def record_trajectory_experience(
        self,
        action_name: str,
        predicted_risk: float,
        actual_state: Optional[list[float]] = None,
        outcome_verdict: str = "approved",
    ) -> None:
        """
        RSI-Anything Multi-Generation Experience Replay Buffer:
        Records action interventions, predicted risk, observed outcome, and timestamp
        into an experience buffer (up to 100 entries).
        """
        record = {
            "timestamp": datetime.now().isoformat(),
            "action_name": action_name,
            "predicted_risk": round(predicted_risk, 4),
            "outcome_verdict": outcome_verdict,
            "has_actual_state": actual_state is not None,
        }
        self.trajectory_buffer.append(record)
        if len(self.trajectory_buffer) > 100:
            self.trajectory_buffer = self.trajectory_buffer[-100:]

    def infer_system_identification(
        self,
        trajectory_buffer: Optional[List[Dict[str, Any]]] = None,
        event_tuples: Optional[List[Any]] = None,
    ) -> SystemIdentificationVector:
        """
        Infers the continuous 4D latent environment vector z_env in R^4
        from observed trajectory experience and/or Layer 1 universal hypergraph tuples:
          - gamma_rev: Reversibility index [0, 1]
          - kappa_coupling: Coupling rigidity [0, 1]
          - tau_latency: Action-to-state observation lag >= 0
          - sigma_exo: Exogenous stochasticity / residual variance [0, 1]
        """
        buf = trajectory_buffer if trajectory_buffer is not None else self.trajectory_buffer

        # 1. Base inference from event tuples if available
        if event_tuples and len(event_tuples) > 0:
            rev_weights = []
            deps_count = 0
            timestamps = []
            external_actors = 0

            for tup in event_tuples:
                artifact = getattr(tup, "artifact", None)
                operation = getattr(tup, "operation", None)
                op_val = getattr(operation, "value", str(operation)).lower()

                # Base artifact reversibility
                w = getattr(artifact, "reversibility_weight", 1.0) if artifact else 1.0
                if op_val in ["commit_resource", "create"] and w < 0.5:
                    w = w * 0.5  # Heavy capital/physical irreversible commitment
                elif op_val == "revert":
                    w = min(1.0, w + 0.1)
                rev_weights.append(w)

                deps = getattr(tup, "dependencies", [])
                deps_count += len(deps)

                ts = getattr(tup, "timestamp", None)
                if ts:
                    timestamps.append(ts)

                actor = getattr(tup, "actor", None)
                actor_type = getattr(getattr(actor, "actor_type", None), "value", "")
                if "contractor" in actor_type or "external" in actor_type:
                    external_actors += 1

            n = max(len(event_tuples), 1)
            gamma_rev = float(np.mean(rev_weights)) if rev_weights else 1.0
            kappa_coupling = min(0.95, max(0.05, deps_count / (n * 2.0)))

            if len(timestamps) >= 2:
                diffs = [abs(timestamps[i] - timestamps[i-1]) for i in range(1, len(timestamps))]
                mean_diff = float(np.mean(diffs))
                tau_latency = max(0.1, min(10.0, mean_diff / 3600.0 if mean_diff > 0 else 1.0))
            else:
                tau_latency = 1.0

            sigma_exo = min(0.95, max(0.05, external_actors / n))
        else:
            # 2. Trajectory buffer statistical inference
            if buf and len(buf) > 0:
                non_revert = [rec for rec in buf if "revert" not in rec.get("action_name", "").lower()]
                gamma_rev = 0.95 if len(non_revert) == len(buf) else 0.65

                risks = [rec.get("predicted_risk", 0.3) for rec in buf]
                kappa_coupling = min(0.95, max(0.05, float(np.std(risks)) * 2.0 + 0.2))
                tau_latency = 1.0

                if len(self.history) >= 2:
                    errors = [h.get("error", 0.05) for h in self.history[-20:]]
                    sigma_exo = min(0.95, max(0.05, float(np.std(errors)) * 1.5))
                else:
                    sigma_exo = 0.10
            else:
                gamma_rev = 1.0
                kappa_coupling = 0.20
                tau_latency = 1.0
                sigma_exo = 0.10

        self.z_env = SystemIdentificationVector(
            reversibility=round(max(0.0, min(1.0, gamma_rev)), 4),
            coupling=round(max(0.0, min(1.0, kappa_coupling)), 4),
            latency=round(max(0.0, tau_latency), 4),
            stochasticity=round(max(0.0, min(1.0, sigma_exo)), 4),
        )
        return self.z_env

