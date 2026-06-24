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
from typing import Optional, Any

from pwm.config import PWMConfig


class WorldModelCalibrator:
    """
    PWM Calibration Engine — Layer 2 Self-Supervised Grounding.
    
    Tracks prediction errors and calibrates projection weights to prevent
    drift in simulated world model projections.
    """

    def __init__(self, config: PWMConfig, state_path: Optional[Path] = None):
        self.config = config
        self.state_path = state_path or (config.output_dir / "calibration_state.json")
        self.calibration_factor: float = 1.0
        self.last_predicted_latent_state: Optional[list[float]] = None
        self.history: list[dict[str, Any]] = []

    def load_state(self) -> None:
        """Load calibration state and factor from disk."""
        if not self.state_path.exists():
            return
        try:
            with open(self.state_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.calibration_factor = data.get("calibration_factor", 1.0)
                self.last_predicted_latent_state = data.get("last_predicted_latent_state")
                self.history = data.get("history", [])
        except Exception as e:
            if self.config.verbose:
                print(f"🌲 [Calibrator] Error loading calibration state: {e}")

    def save_state(self) -> None:
        """Save calibration state and factor to disk."""
        try:
            self.state_path.parent.mkdir(parents=True, exist_ok=True)
            data = {
                "calibration_factor": self.calibration_factor,
                "last_predicted_latent_state": self.last_predicted_latent_state,
                "history": self.history,
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
