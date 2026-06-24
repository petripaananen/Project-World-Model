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
PWM CRR Engine — Layer 2: Compute-to-Rework Ratio
====================================================

The CRR metric is the economic heart of the PWM framework. It answers
the CFO's question: "Is AI actually saving us money?"

Formula:
    CRR = Cost_of_AI_Inference / Value_of_Human_Rework_Saved

Interpretation:
    CRR < 0.01  → Exceptional (AI costs are negligible vs. rework)
    CRR < 0.10  → Excellent (AI is 10x+ cheaper)
    CRR < 0.50  → Good (AI is significantly cheaper)
    CRR < 1.00  → Acceptable (AI is cheaper, margins thin)
    CRR ≥ 1.00  → Warning (AI costs exceed rework value)

This metric directly addresses compute efficiency — as AI becomes
cheaper, teams may use more of it. CRR ensures the compute budget
stays proportional to actual value generated.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pwm.config import PWMConfig
from pwm.ingestion.models import CRRResult, IntegrationDebtReport


class CRREngine:
    """
    Compute-to-Rework Ratio calculation engine.

    Tracks cumulative token usage across all agent invocations and
    compares against estimated human rework costs from the debt report.
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
    ) -> CRRResult:
        """
        Calculate the CRR for the current session.

        Now includes GPU and electricity costs in the numerator (Thesis §5.8.2)
        and compute runaway alert detection (Thesis §5.8.1).

        Args:
            debt_report: The integration debt report (provides rework hours)
            input_tokens: Override session input tokens (if tracking externally)
            output_tokens: Override session output tokens

        Returns:
            CRRResult with the computed ratio, GPU costs, and compute runaway alert
        """
        in_tokens = input_tokens if input_tokens is not None else self._session_input_tokens
        out_tokens = output_tokens if output_tokens is not None else self._session_output_tokens

        result = CRRResult()

        # Compute GPU and electricity costs (Thesis §5.8.2 — "tokens per watt")
        gpu_cost = self.config.crr.gpu_hours_per_run * self.config.crr.gpu_hourly_rate
        electricity_kwh = (
            self.config.crr.gpu_power_watts
            * self.config.crr.gpu_hours_per_run
            / 1000.0  # W → kW
        )
        electricity_cost = electricity_kwh * self.config.crr.electricity_rate_kwh

        result.compute(
            input_tokens=in_tokens,
            output_tokens=out_tokens,
            rework_hours=debt_report.total_estimated_rework_hours,
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
