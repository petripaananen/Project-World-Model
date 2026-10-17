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
PWM CRR Engine — Layer 2 & 3: Compute-to-Rework Ratio, Quasimetric Energy & CVaR
==============================================================================

The CRR metric is the economic heart of the PWM framework. It answers
the CFO's question: "Is AI actually saving us money?"

Formula:
    CRR = Cost_of_AI_Inference / Value_of_Human_Rework_Saved

Upgrades:
1. Asymmetric Quasimetric Latent Energy:
       E(s -> s' | z_env) = sqrt((s' - s)^T G(z_env) (s' - s))
                          + lambda_irrev * (1 - gamma_rev) * sum_i max(0, lock_in(s'_i) - lock_in(s_i))
2. Generalized CRR & Distributional CVaR_0.95 tail-risk estimation.
"""

from __future__ import annotations

import math
from datetime import datetime
from typing import Any, List, Optional, Union
import numpy as np

from pwm.config import PWMConfig
from pwm.ingestion.models import CRRResult, IntegrationDebtReport


def quasimetric_latent_energy(
    s: Union[List[float], np.ndarray],
    s_next: Union[List[float], np.ndarray],
    z_env: Optional[Any] = None,
    lambda_irrev: float = 1.0,
) -> float:
    """
    Context-Conditioned Asymmetric Quasimetric Latent Energy (Layer 3).

    E(s -> s' | z_env) = sqrt((s' - s)^T G(z_env) (s' - s))
                       + lambda_irrev * (1 - gamma_rev) * sum_i max(0, lock_in(s'_i) - lock_in(s_i))

    Properties:
      - When gamma_rev == 1.0 (pure software/agile): recovers exact Euclidean distance
        ||s' - s||_2 with error < 10^-6.
      - When gamma_rev < 1.0 (physical construction, irreversible capital commitments):
        penalizes irreversible lock-in transitions where unwinding costs exceed creation costs.
    """
    s_arr = np.array(s, dtype=np.float64).flatten()
    sp_arr = np.array(s_next, dtype=np.float64).flatten()

    d = min(len(s_arr), len(sp_arr))
    if d == 0:
        return 0.0
    s_arr = s_arr[:d]
    sp_arr = sp_arr[:d]

    # Extract gamma_rev from z_env
    gamma_rev = float(
        getattr(z_env, "reversibility", z_env.get("reversibility", 1.0) if isinstance(z_env, dict) else 1.0)
    )
    gamma_rev = max(0.0, min(1.0, gamma_rev))

    diff = sp_arr - s_arr

    # When gamma_rev == 1.0, G(z_env) = I and the asymmetric penalty vanishes identically
    if gamma_rev >= 0.999999:
        return float(np.linalg.norm(diff))

    # G(z_env) diagonal tensor scaling topology (0..15) and architecture (48..63 if d>=64)
    g_diag = np.ones(d, dtype=np.float64)
    for i in range(d):
        if i < 16 or (d >= 64 and i >= 48):
            g_diag[i] = 1.0 + (1.0 - gamma_rev) * 0.5
    quad_term = float(np.dot(diff * g_diag, diff))

    # Irreversible resource lock-in delta: lock_in(x) = max(0, x)
    lock_diff = np.maximum(0.0, sp_arr) - np.maximum(0.0, s_arr)
    pos_lock_delta = float(np.sum(np.maximum(0.0, lock_diff)))
    second_term = lambda_irrev * (1.0 - gamma_rev) * pos_lock_delta

    energy = math.sqrt(max(0.0, quad_term)) + second_term
    return float(energy)


def compute_cvar_95(
    predicted_risk: float,
    sigma_exo: float = 0.10,
    n_samples: int = 100,
) -> float:
    """
    Conditional Value at Risk (CVaR_0.95) estimation over predictive risk ensemble.
    Penalizes heavy-tailed failure risks even when mean predicted risk is moderate.
    CVaR_0.95 = E[R | R >= VaR_0.95]
    """
    if sigma_exo <= 1e-4:
        return float(predicted_risk)

    quantiles = np.linspace(0.01, 0.99, n_samples)
    z_scores = np.sqrt(2.0) * np.vectorize(math.erf)(quantiles * 2.0 - 1.0)
    ensemble = np.clip(predicted_risk + sigma_exo * z_scores, 0.0, 1.0)

    var_95 = float(np.percentile(ensemble, 95))
    tail = ensemble[ensemble >= var_95]
    cvar = float(np.mean(tail)) if len(tail) > 0 else var_95
    return round(cvar, 4)


class CRREngine:
    """
    Compute-to-Rework Ratio calculation engine.

    Tracks cumulative token usage across all agent invocations and
    compares against estimated human rework costs from the debt report.
    Supports generalized irreversible rework penalties, Quasimetric Energy,
    and CVaR_0.95 tail risk.
    """

    def __init__(self, config: PWMConfig):
        self.config = config
        self._session_input_tokens = 0
        self._session_output_tokens = 0
        self._history: list[CRRResult] = []

    def record_tokens(self, input_tokens: int, output_tokens: int) -> None:
        """
        Record token usage from an agent invocation.

        Call this after each Gemini API call to maintain accurate CRR tracking.
        """
        self._session_input_tokens += input_tokens
        self._session_output_tokens += output_tokens

    def calculate(
        self,
        debt_report: IntegrationDebtReport,
        input_tokens: Optional[int] = None,
        output_tokens: Optional[int] = None,
        z_env: Optional[Any] = None,
        quasimetric_energy: Optional[float] = None,
        cvar_95: Optional[float] = None,
    ) -> CRRResult:
        """
        Calculate the CRR for the current session.

        Now includes GPU, electricity, and irreversible rework costs (Thesis §5.8.2)
        and compute runaway alert detection (Thesis §5.8.1).
        """
        in_tokens = input_tokens if input_tokens is not None else self._session_input_tokens
        out_tokens = output_tokens if output_tokens is not None else self._session_output_tokens

        result = CRRResult()
        result.quasimetric_energy = quasimetric_energy
        result.cvar_95 = cvar_95

        # Compute GPU and electricity costs (Thesis §5.8.2 — "tokens per watt")
        gpu_cost = self.config.crr.gpu_hours_per_run * self.config.crr.gpu_hourly_rate
        electricity_kwh = (
            self.config.crr.gpu_power_watts
            * self.config.crr.gpu_hours_per_run
            / 1000.0  # W → kW
        )
        electricity_cost = electricity_kwh * self.config.crr.electricity_rate_kwh

        rework_hours = debt_report.total_estimated_rework_hours

        # In irreversible systems (gamma_rev < 1.0), scale rework hours by quasimetric friction
        if z_env is not None and quasimetric_energy is not None:
            gamma_rev = float(
                getattr(z_env, "reversibility", z_env.get("reversibility", 1.0) if isinstance(z_env, dict) else 1.0)
            )
            if gamma_rev < 1.0:
                irreversible_hours = (1.0 - gamma_rev) * quasimetric_energy * 2.0
                rework_hours += irreversible_hours
                result.irreversible_rework_cost_usd = irreversible_hours * self.config.crr.developer_hourly_rate

        result.compute(
            input_tokens=in_tokens,
            output_tokens=out_tokens,
            rework_hours=rework_hours,
            token_cost_input_per_m=self.config.crr.token_cost_per_million_input,
            token_cost_output_per_m=self.config.crr.token_cost_per_million_output,
            developer_hourly_rate=self.config.crr.developer_hourly_rate,
            gpu_cost_usd=gpu_cost,
            electricity_cost_usd=electricity_cost,
        )

        # Compute runaway warning detection (Thesis §5.8.1)
        if result.crr >= self.config.crr.jevons_paradox_threshold:
            result.jevons_paradox_alert = True
            result.jevons_paradox_message = (
                f"⚠️ Compute Runaway Warning: CRR={result.crr:.4f} "
                f"exceeds efficiency threshold {self.config.crr.jevons_paradox_threshold:.2f}. "
                f"AI costs are approaching human rework value. "
                f"The Scenario Strategist should enforce token budget ceilings."
            )

        self._history.append(result)
        return result

    def get_session_summary(self) -> dict:
        """Get a summary of the current session's CRR tracking."""
        return {
            "session_input_tokens": self._session_input_tokens,
            "session_output_tokens": self._session_output_tokens,
            "estimated_session_cost_usd": (
                (self._session_input_tokens / 1_000_000)
                * self.config.crr.token_cost_per_million_input
                + (self._session_output_tokens / 1_000_000)
                * self.config.crr.token_cost_per_million_output
            ),
            "total_calculations": len(self._history),
        }

    def reset_session(self) -> None:
        """Reset session token counters (keeps history)."""
        self._session_input_tokens = 0
        self._session_output_tokens = 0
