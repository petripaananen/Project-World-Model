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
PWM Cognitive Budget Guard — Layer 5: Intelligence Budget Governor
====================================================================

A non-LLM watchdog agent that monitors token consumption and inference
costs in real time. Instead of the binary hard-stop provided by
``PWMConfig.is_budget_exhausted()``, the Budget Guard implements a
**gradient response curve**:

    NOMINAL  →  WARN  →  DOWNGRADE  →  THROTTLE  →  HALT

This directly addresses the Jevons Paradox / Compute Runaway Warning
(Thesis §5.8.1): as inference costs drop, agents consume exponentially
more tokens unless actively governed.

Key capabilities:
  - Dynamic model tier selection (reasoning → fast) under budget pressure
  - Low-probability simulation branch pruning
  - Real-time budget utilization tracking
  - Immutable event log alerts at each threshold crossing
"""

from __future__ import annotations

from enum import Enum
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from pwm.config import PWMConfig
    from pwm.logging.event_logger import EventLogger


class BudgetAction(str, Enum):
    """Graduated budget response levels."""
    NOMINAL = "nominal"       # < 50% budget consumed — all systems go
    WARN = "warn"             # 50–70% — log a warning, continue with reasoning model
    DOWNGRADE = "downgrade"   # 70–85% — switch to fast_model for remaining calls
    THROTTLE = "throttle"     # 85–95% — skip low-value branches, use fast_model
    HALT = "halt"             # ≥ 95% — stop all new LLM calls


# ── Threshold constants (fraction of budget consumed) ───────────
_WARN_THRESHOLD = 0.50
_DOWNGRADE_THRESHOLD = 0.70
_DOWNGRADE_COST_THRESHOLD = 0.70
_THROTTLE_THRESHOLD = 0.85
_HALT_THRESHOLD = 0.95

# Branch probability below which we skip when throttling
_DEFAULT_BRANCH_SKIP_PROBABILITY = 0.30


class CognitiveBudgetGuard:
    """
    Real-time intelligence budget governor (Layer 5 subagent).

    Unlike ``ExecutionMonitorAgent`` which watches for stuck loops,
    the Budget Guard watches for *economic* runaway — the gradual
    but accelerating consumption of the token/cost ceiling.

    Usage::

        guard = CognitiveBudgetGuard(config, event_logger)

        action = guard.evaluate_budget()
        if action == BudgetAction.HALT:
            break

        model = guard.get_recommended_model()
        # pass ``model`` to agent constructors or call_gemini overrides
    """

    def __init__(
        self,
        config: "PWMConfig",
        event_logger: Optional["EventLogger"] = None,
    ):
        self.config = config
        self.event_logger = event_logger

        # Track which thresholds have already fired to avoid log spam
        self._fired_thresholds: set[BudgetAction] = set()

    # ── Core evaluation ─────────────────────────────────────────

    @property
    def token_utilization(self) -> float:
        """Fraction of the token budget consumed (0.0 – 1.0+)."""
        max_tokens = self.config.models.max_run_tokens
        if max_tokens <= 0:
            return 0.0
        tokens = self.config.get_cumulative_tokens()
        total = tokens["input_tokens"] + tokens["output_tokens"]
        return total / max_tokens

    @property
    def cost_utilization(self) -> float:
        """Fraction of the USD cost budget consumed (0.0 – 1.0+)."""
        max_cost = self.config.models.max_run_cost_usd
        if max_cost <= 0:
            return 0.0
        return self.config.get_cumulative_cost_usd() / max_cost

    @property
    def utilization(self) -> float:
        """The higher of token or cost utilization — the binding constraint."""
        return max(self.token_utilization, self.cost_utilization)

    def evaluate_budget(self) -> BudgetAction:
        """
        Evaluate the current budget state and return the recommended action.

        Returns the *highest* applicable action level. Each threshold
        crossing is logged exactly once to the immutable event log.
        """
        u = self.utilization

        if u >= _HALT_THRESHOLD:
            action = BudgetAction.HALT
        elif u >= _THROTTLE_THRESHOLD:
            action = BudgetAction.THROTTLE
        elif u >= _DOWNGRADE_THRESHOLD:
            action = BudgetAction.DOWNGRADE
        elif u >= _WARN_THRESHOLD:
            action = BudgetAction.WARN
        else:
            action = BudgetAction.NOMINAL

        # Log threshold crossings (fire-once per level)
        if action != BudgetAction.NOMINAL and action not in self._fired_thresholds:
            self._fired_thresholds.add(action)
            self._log_alert(action, u)

        return action

    def get_recommended_model(self) -> str:
        """
        Return the model name to use for the next LLM call.

        - NOMINAL / WARN  → ``reasoning_model`` (full power)
        - DOWNGRADE / THROTTLE / HALT → ``fast_model`` (cheaper)
        """
        action = self.evaluate_budget()
        if action in (BudgetAction.DOWNGRADE, BudgetAction.THROTTLE, BudgetAction.HALT):
            return self.config.models.fast_model
        return self.config.models.reasoning_model

    def should_skip_branch(self, branch_probability: float) -> bool:
        """
        Decide whether a low-probability simulation branch should be pruned.

        Only prunes when budget pressure is at THROTTLE or above.
        Branches below ``_DEFAULT_BRANCH_SKIP_PROBABILITY`` are skipped.

        Args:
            branch_probability: Estimated probability (0.0–1.0) that this
                branch will yield actionable insights.

        Returns:
            True if the branch should be skipped to conserve budget.
        """
        action = self.evaluate_budget()
        if action in (BudgetAction.THROTTLE, BudgetAction.HALT):
            return branch_probability < _DEFAULT_BRANCH_SKIP_PROBABILITY
        return False

    def reset(self) -> None:
        """Reset fired thresholds for a new pipeline run."""
        self._fired_thresholds.clear()

    # ── Budget summary ──────────────────────────────────────────

    def get_budget_summary(self) -> dict:
        """Return a snapshot of budget utilization for dashboard display."""
        tokens = self.config.get_cumulative_tokens()
        return {
            "token_utilization": round(self.token_utilization, 4),
            "cost_utilization": round(self.cost_utilization, 4),
            "binding_utilization": round(self.utilization, 4),
            "action": self.evaluate_budget().value,
            "input_tokens": tokens["input_tokens"],
            "output_tokens": tokens["output_tokens"],
            "cumulative_cost_usd": round(self.config.get_cumulative_cost_usd(), 6),
            "max_run_tokens": self.config.models.max_run_tokens,
            "max_run_cost_usd": self.config.models.max_run_cost_usd,
            "recommended_model": self.get_recommended_model(),
        }

    # ── Internal helpers ────────────────────────────────────────

    def _log_alert(self, action: BudgetAction, utilization: float) -> None:
        """Emit a budget alert to the event logger and stdout."""
        tokens = self.config.get_cumulative_tokens()
        cost = self.config.get_cumulative_cost_usd()

        msg = (
            f"[💰 Budget Guard] {action.value.upper()} — "
            f"utilization {utilization:.1%} "
            f"(tokens: {tokens['input_tokens'] + tokens['output_tokens']}/{self.config.models.max_run_tokens}, "
            f"cost: ${cost:.4f}/${self.config.models.max_run_cost_usd:.2f})"
        )

        if self.config.verbose:
            print(msg)

        if self.event_logger:
            # Use synchronous-safe logging: the event_logger methods
            # are async, so we build the event directly as a PWMEvent
            try:
                from pwm.logging.event_logger import EventType, PWMEvent
                event = PWMEvent(
                    event_type=EventType.BUDGET_ALERT,
                    run_id="",
                    actor="budget_guard",
                    summary=msg,
                    details={
                        "action": action.value,
                        "utilization": round(utilization, 4),
                        "input_tokens": tokens["input_tokens"],
                        "output_tokens": tokens["output_tokens"],
                        "cost_usd": round(cost, 6),
                    },
                )
                self.event_logger.log_sync(event)
            except Exception:
                # Budget logging must never crash the pipeline
                pass
