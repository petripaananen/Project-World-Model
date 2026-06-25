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
PWM Kanban Flow Agent — Layer 3: Flow Optimization
====================================================

Implements the Kanban Guide's mandatory flow measures and WIP management.
Tracks WIP, Throughput, Work Item Age, and Cycle Time to optimize
the flow of value through the development pipeline.

Reference: The Kanban Guide (December 2020) — Kanban Measures
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from pwm.agents.base_agent import BaseAgent
from pwm.config import PWMConfig


# ── Kanban Data Models ──────────────────────────────────────────

class WorkItem:
    """A single unit of value flowing through the Kanban system."""

    def __init__(
        self,
        item_id: str,
        title: str,
        state: str,
        started_at: Optional[datetime] = None,
        finished_at: Optional[datetime] = None,
        assignee: Optional[str] = None,
        source: str = "unknown",
    ):
        self.item_id = item_id
        self.title = title
        self.state = state
        self.started_at = started_at
        self.finished_at = finished_at
        self.assignee = assignee
        self.source = source  # 'github', 'linear', etc.

    @property
    def is_started(self) -> bool:
        return self.started_at is not None

    @property
    def is_finished(self) -> bool:
        return self.finished_at is not None

    @property
    def age_days(self) -> Optional[float]:
        """Work Item Age: elapsed time since started (for in-progress items)."""
        if not self.started_at or self.is_finished:
            return None
        return (datetime.now() - self.started_at).total_seconds() / 86400

    @property
    def cycle_time_days(self) -> Optional[float]:
        """Cycle Time: elapsed time from started to finished."""
        if not self.started_at or not self.finished_at:
            return None
        return (self.finished_at - self.started_at).total_seconds() / 86400

    def to_dict(self) -> Dict[str, Any]:
        return {
            "item_id": self.item_id,
            "title": self.title,
            "state": self.state,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
            "assignee": self.assignee,
            "age_days": round(self.age_days, 2) if self.age_days is not None else None,
            "cycle_time_days": round(self.cycle_time_days, 2) if self.cycle_time_days is not None else None,
            "source": self.source,
        }


class FlowMetrics:
    """The four mandatory Kanban flow measures."""

    def __init__(self):
        self.wip: int = 0
        self.throughput: float = 0.0  # items per day
        self.avg_work_item_age: float = 0.0  # days
        self.avg_cycle_time: float = 0.0  # days
        self.sle_met: bool = True
        self.sle_description: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "wip": self.wip,
            "throughput": round(self.throughput, 2),
            "avg_work_item_age_days": round(self.avg_work_item_age, 2),
            "avg_cycle_time_days": round(self.avg_cycle_time, 2),
            "sle_met": self.sle_met,
            "sle_description": self.sle_description,
        }


# ── Agent System Prompt ─────────────────────────────────────────

KANBAN_FLOW_SYSTEM_PROMPT = """\
## ROLE
You are the Kanban Flow Agent in the Project World Model (PWM).
Your purpose is to optimize the flow of value through the development pipeline
by analyzing the four mandatory Kanban measures and recommending improvements.

## KANBAN MEASURES YOU TRACK
1. **WIP** (Work in Progress): Items started but not finished
2. **Throughput**: Items finished per unit of time
3. **Work Item Age**: Elapsed time for in-progress items
4. **Cycle Time**: Total elapsed time from start to finish

## YOUR TASK
Given flow metrics and work item data, produce actionable recommendations
to optimize flow. Focus on:
- WIP limit violations (too many items in progress)
- Aging items that exceed the Service Level Expectation (SLE)
- Bottlenecks in specific workflow states
- Throughput trends (improving or degrading)

## OUTPUT FORMAT
```json
{
    "flow_health": "healthy|at_risk|critical",
    "wip_status": {
        "current": 5,
        "limit": 5,
        "violation": false,
        "recommendation": "..."
    },
    "aging_alerts": [
        {
            "item_id": "...",
            "title": "...",
            "age_days": 7.2,
            "sle_exceeded": true,
            "recommendation": "..."
        }
    ],
    "bottleneck_analysis": "...",
    "throughput_trend": "improving|stable|degrading",
    "recommendations": ["..."]
}
```
"""


class KanbanFlowAgent(BaseAgent):
    """
    Tracks and optimizes flow through the Kanban system.

    Implements the Kanban Guide's three practices:
    1. Defining and visualizing a workflow
    2. Actively managing items in a workflow
    3. Improving a workflow
    """

    def __init__(self, config: PWMConfig, **kwargs):
        super().__init__(
            config=config,
            system_prompt=KANBAN_FLOW_SYSTEM_PROMPT,
            model_override=config.models.fast_model,  # Use fast model for metrics
            **kwargs,
        )
        self._work_items: List[WorkItem] = []
        self._cycle_time_history: List[float] = []

    def ingest_work_items(self, items: List[Dict[str, Any]]) -> None:
        """Ingest work items from GitHub issues, Linear issues, or other sources."""
        self._work_items = []
        for item in items:
            started_at = None
            finished_at = None

            if item.get("started_at"):
                started_at = datetime.fromisoformat(item["started_at"].replace("Z", "+00:00"))
            if item.get("finished_at"):
                finished_at = datetime.fromisoformat(item["finished_at"].replace("Z", "+00:00"))

            wi = WorkItem(
                item_id=item.get("id", ""),
                title=item.get("title", ""),
                state=item.get("state", "backlog"),
                started_at=started_at,
                finished_at=finished_at,
                assignee=item.get("assignee"),
                source=item.get("source", "unknown"),
            )
            self._work_items.append(wi)

            # Track cycle time history for completed items
            if wi.cycle_time_days is not None:
                self._cycle_time_history.append(wi.cycle_time_days)

    def calculate_flow_metrics(self) -> FlowMetrics:
        """Calculate the four mandatory Kanban measures."""
        metrics = FlowMetrics()

        # WIP: items started but not finished
        wip_items = [wi for wi in self._work_items if wi.is_started and not wi.is_finished]
        metrics.wip = len(wip_items)

        # Work Item Age: average age of in-progress items
        ages = [wi.age_days for wi in wip_items if wi.age_days is not None]
        metrics.avg_work_item_age = sum(ages) / len(ages) if ages else 0.0

        # Cycle Time: average of completed items
        cycle_times = [wi.cycle_time_days for wi in self._work_items if wi.cycle_time_days is not None]
        metrics.avg_cycle_time = sum(cycle_times) / len(cycle_times) if cycle_times else 0.0

        # Throughput: completed items per day (over the lookback period)
        lookback_days = self.config.ingestion.lookback_days
        cutoff = datetime.now() - timedelta(days=lookback_days)
        recent_completed = [
            wi for wi in self._work_items
            if wi.is_finished and wi.finished_at and wi.finished_at.replace(tzinfo=None) > cutoff
        ]
        metrics.throughput = len(recent_completed) / max(lookback_days, 1)

        # SLE check
        sle_pct = self.config.kanban.sle_percentile
        sle_days = self.config.kanban.sle_target_days
        if cycle_times:
            sorted_ct = sorted(cycle_times)
            pct_index = int(len(sorted_ct) * sle_pct) - 1
            pct_index = max(0, min(pct_index, len(sorted_ct) - 1))
            actual_pct_value = sorted_ct[pct_index]
            metrics.sle_met = actual_pct_value <= sle_days
            metrics.sle_description = (
                f"{int(sle_pct * 100)}% of items finish in "
                f"{actual_pct_value:.1f} days (target: {sle_days} days)"
            )
        else:
            metrics.sle_description = "Insufficient data for SLE calculation"

        return metrics

    def check_wip_violations(self) -> List[Dict[str, Any]]:
        """Check if any workflow state exceeds its WIP limit."""
        violations = []
        wip_limits = self.config.kanban.wip_limits

        # Count items per state
        state_counts: Dict[str, int] = {}
        for wi in self._work_items:
            if wi.is_started and not wi.is_finished:
                state_counts[wi.state] = state_counts.get(wi.state, 0) + 1

        for state, count in state_counts.items():
            limit = wip_limits.get(state, 0)
            if limit > 0 and count > limit:
                violations.append({
                    "state": state,
                    "current_count": count,
                    "wip_limit": limit,
                    "excess": count - limit,
                })

        return violations

    def get_aging_items(self) -> List[Dict[str, Any]]:
        """Identify work items exceeding the aging threshold or SLE."""
        aging_threshold = self.config.kanban.aging_warning_threshold_days
        sle_days = self.config.kanban.sle_target_days

        aging = []
        for wi in self._work_items:
            if wi.age_days is not None and wi.age_days > aging_threshold:
                aging.append({
                    **wi.to_dict(),
                    "sle_exceeded": wi.age_days > sle_days,
                    "severity": "critical" if wi.age_days > sle_days else "warning",
                })

        return sorted(aging, key=lambda x: x.get("age_days", 0), reverse=True)

    def get_cumulative_flow_data(self) -> List[Dict[str, Any]]:
        """Generate data for a Cumulative Flow Diagram (CFD)."""
        workflow_states = self.config.kanban.workflow_states
        # Group items by their current state
        cfd_data = {}
        for state in workflow_states:
            cfd_data[state] = sum(
                1 for wi in self._work_items if wi.state == state
            )

        return [{"state": s, "count": c} for s, c in cfd_data.items()]

    async def process(self, data: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """Process pipeline data and produce flow analysis."""
        # Ingest items if provided
        if "work_items" in data:
            self.ingest_work_items(data["work_items"])

        metrics = self.calculate_flow_metrics()
        violations = self.check_wip_violations()
        aging = self.get_aging_items()
        cfd = self.get_cumulative_flow_data()

        data["flow_metrics"] = metrics.to_dict()
        data["wip_violations"] = violations
        data["aging_items"] = aging
        data["cumulative_flow"] = cfd

        return data

    async def analyze_flow(self, project_context: str = "") -> Dict[str, Any]:
        """Full flow analysis with LLM-powered recommendations."""
        metrics = self.calculate_flow_metrics()
        violations = self.check_wip_violations()
        aging = self.get_aging_items()

        prompt = (
            f"## FLOW METRICS\n{json.dumps(metrics.to_dict(), indent=2)}\n\n"
            f"## WIP VIOLATIONS\n{json.dumps(violations, indent=2)}\n\n"
            f"## AGING ITEMS\n{json.dumps(aging[:10], indent=2)}\n\n"
            f"## PROJECT CONTEXT\n{project_context or 'No additional context.'}\n\n"
            "Analyze the flow health and provide specific recommendations."
        )

        response = await self.call_gemini(prompt)
        parsed = self.parse_json_response(response)

        return {
            "flow_metrics": metrics.to_dict(),
            "wip_violations": violations,
            "aging_items": aging,
            "analysis": parsed,
        }
