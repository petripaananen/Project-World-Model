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
PWM Retrospective Intelligence Engine
========================================

Automated analysis of sprint and workflow improvements over time.
Detects patterns, trends, and generates actionable insights from
historical metrics data.

Reference: Scrum Guide — Sprint Retrospective
           Kanban Guide — Improving the Workflow
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional


class SprintSnapshot:
    """Historical snapshot of a single sprint's metrics."""

    def __init__(
        self,
        sprint_number: int,
        velocity: int = 0,
        avg_cycle_time_days: float = 0.0,
        throughput: float = 0.0,
        wip_avg: float = 0.0,
        items_completed: int = 0,
        items_carried_over: int = 0,
        rejection_count: int = 0,
        dod_compliance_pct: float = 100.0,
        timestamp: Optional[datetime] = None,
    ):
        self.sprint_number = sprint_number
        self.velocity = velocity
        self.avg_cycle_time_days = avg_cycle_time_days
        self.throughput = throughput
        self.wip_avg = wip_avg
        self.items_completed = items_completed
        self.items_carried_over = items_carried_over
        self.rejection_count = rejection_count
        self.dod_compliance_pct = dod_compliance_pct
        self.timestamp = timestamp or datetime.now()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "sprint_number": self.sprint_number,
            "velocity": self.velocity,
            "avg_cycle_time_days": round(self.avg_cycle_time_days, 2),
            "throughput": round(self.throughput, 2),
            "wip_avg": round(self.wip_avg, 1),
            "items_completed": self.items_completed,
            "items_carried_over": self.items_carried_over,
            "rejection_count": self.rejection_count,
            "dod_compliance_pct": round(self.dod_compliance_pct, 1),
            "timestamp": self.timestamp.isoformat(),
        }


class RetrospectiveInsight:
    """A single retrospective insight or pattern detection."""

    def __init__(
        self,
        category: str,
        trend: str,
        description: str,
        severity: str = "info",
        action_item: Optional[str] = None,
    ):
        self.category = category  # velocity, cycle_time, throughput, quality, wip
        self.trend = trend  # improving, stable, degrading
        self.description = description
        self.severity = severity  # info, warning, critical
        self.action_item = action_item

    def to_dict(self) -> Dict[str, Any]:
        return {
            "category": self.category,
            "trend": self.trend,
            "description": self.description,
            "severity": self.severity,
            "action_item": self.action_item,
        }


class RetrospectiveEngine:
    """
    Analyzes historical sprint/workflow data to detect patterns and trends.

    Produces automated retrospective insights covering:
    - Velocity trends (improving, stable, degrading)
    - Cycle time trends
    - Quality trends (rejection rates, DoD compliance)
    - WIP management effectiveness
    - Carryover patterns
    """

    def __init__(self):
        self._history: List[SprintSnapshot] = []

    def add_snapshot(self, snapshot: SprintSnapshot) -> None:
        """Add a sprint snapshot to the history."""
        self._history.append(snapshot)
        self._history.sort(key=lambda s: s.sprint_number)

    def add_from_dict(self, data: Dict[str, Any]) -> None:
        """Add a snapshot from a dictionary."""
        self.add_snapshot(SprintSnapshot(**data))

    def _detect_trend(self, values: List[float], window: int = 3) -> str:
        """Detect trend direction over the last N values."""
        if len(values) < 2:
            return "stable"

        recent = values[-min(window, len(values)):]
        if len(recent) < 2:
            return "stable"

        # Calculate slope via simple linear regression
        n = len(recent)
        x_mean = (n - 1) / 2
        y_mean = sum(recent) / n
        numerator = sum((i - x_mean) * (v - y_mean) for i, v in enumerate(recent))
        denominator = sum((i - x_mean) ** 2 for i in range(n))

        if denominator == 0:
            return "stable"

        slope = numerator / denominator
        # Normalize slope relative to mean
        if y_mean == 0:
            return "stable"

        relative_slope = slope / abs(y_mean)

        if relative_slope > 0.05:
            return "improving"
        elif relative_slope < -0.05:
            return "degrading"
        return "stable"

    def analyze_velocity(self) -> RetrospectiveInsight:
        """Analyze velocity trend across sprints."""
        velocities = [s.velocity for s in self._history]
        trend = self._detect_trend(velocities)

        if trend == "degrading":
            desc = (
                f"Velocity has decreased over the last {min(3, len(velocities))} sprints "
                f"(recent: {velocities[-3:] if len(velocities) >= 3 else velocities}). "
                f"This may indicate increasing complexity, scope creep, or team capacity issues."
            )
            return RetrospectiveInsight(
                category="velocity",
                trend=trend,
                description=desc,
                severity="warning",
                action_item="Review Sprint Planning: are items sized too large? Is capacity being overestimated?",
            )
        elif trend == "improving":
            desc = (
                f"Velocity is improving (recent: {velocities[-3:] if len(velocities) >= 3 else velocities}). "
                f"The team is becoming more effective at delivering value."
            )
            return RetrospectiveInsight(
                category="velocity", trend=trend, description=desc, severity="info",
            )
        else:
            return RetrospectiveInsight(
                category="velocity", trend=trend,
                description=f"Velocity is stable (recent: {velocities[-3:] if len(velocities) >= 3 else velocities}).",
                severity="info",
            )

    def analyze_cycle_time(self) -> RetrospectiveInsight:
        """Analyze cycle time trend."""
        cycle_times = [s.avg_cycle_time_days for s in self._history]
        # For cycle time, LOWER is better, so invert the trend
        trend_raw = self._detect_trend(cycle_times)
        trend = {"improving": "degrading", "degrading": "improving", "stable": "stable"}[trend_raw]

        if trend == "degrading":
            return RetrospectiveInsight(
                category="cycle_time",
                trend=trend,
                description=(
                    f"Cycle time is increasing (recent: {[round(c, 1) for c in cycle_times[-3:]]} days). "
                    f"Items are taking longer to complete."
                ),
                severity="warning",
                action_item="Investigate bottlenecks: are items blocked in review? Is WIP too high?",
            )
        elif trend == "improving":
            return RetrospectiveInsight(
                category="cycle_time",
                trend=trend,
                description=f"Cycle time is decreasing — flow is improving (recent: {[round(c, 1) for c in cycle_times[-3:]]} days).",
                severity="info",
            )
        return RetrospectiveInsight(
            category="cycle_time", trend=trend,
            description=f"Cycle time is stable (recent: {[round(c, 1) for c in cycle_times[-3:]]} days).",
            severity="info",
        )

    def analyze_quality(self) -> RetrospectiveInsight:
        """Analyze quality trends (rejection rates, DoD compliance)."""
        rejections = [s.rejection_count for s in self._history]
        dod_compliance = [s.dod_compliance_pct for s in self._history]

        rejection_trend = self._detect_trend(rejections)
        # For rejections, increasing is BAD
        if rejection_trend == "improving":
            return RetrospectiveInsight(
                category="quality",
                trend="degrading",
                description=(
                    f"Rejection count is increasing (recent: {rejections[-3:]}). "
                    f"Quality is declining."
                ),
                severity="critical",
                action_item="Review Definition of Done: are developers adhering to quality standards before submitting?",
            )

        dod_trend = self._detect_trend(dod_compliance)
        if dod_trend == "degrading":
            return RetrospectiveInsight(
                category="quality",
                trend="degrading",
                description=f"DoD compliance is declining (recent: {[round(d, 1) for d in dod_compliance[-3:]]}%).",
                severity="warning",
                action_item="Reinforce Definition of Done criteria in Sprint Planning.",
            )

        return RetrospectiveInsight(
            category="quality", trend="stable",
            description="Quality metrics are stable.",
            severity="info",
        )

    def analyze_carryover(self) -> RetrospectiveInsight:
        """Analyze Sprint carryover patterns."""
        carryovers = [s.items_carried_over for s in self._history]
        completions = [s.items_completed for s in self._history]

        if not carryovers or not completions:
            return RetrospectiveInsight(
                category="carryover", trend="stable",
                description="Insufficient data for carryover analysis.",
                severity="info",
            )

        # Calculate carryover ratio
        ratios = [
            c / max(c + d, 1) * 100
            for c, d in zip(carryovers, completions)
        ]

        recent_ratio = ratios[-1] if ratios else 0

        if recent_ratio > 30:
            return RetrospectiveInsight(
                category="carryover",
                trend="degrading",
                description=(
                    f"Sprint carryover rate is {recent_ratio:.0f}% — nearly a third of items "
                    f"are not completing within the Sprint."
                ),
                severity="warning",
                action_item="Reduce Sprint Backlog size or break items into smaller units of work.",
            )

        return RetrospectiveInsight(
            category="carryover", trend="stable",
            description=f"Sprint carryover rate is {recent_ratio:.0f}% — within acceptable range.",
            severity="info",
        )

    def generate_retrospective(self) -> Dict[str, Any]:
        """Generate a complete automated retrospective analysis."""
        if not self._history:
            return {
                "insights": [],
                "summary": "No historical data available for retrospective analysis.",
                "sprint_count": 0,
            }

        insights = [
            self.analyze_velocity(),
            self.analyze_cycle_time(),
            self.analyze_quality(),
            self.analyze_carryover(),
        ]

        # Determine overall health
        severities = [i.severity for i in insights]
        if "critical" in severities:
            overall = "needs_attention"
        elif severities.count("warning") >= 2:
            overall = "some_concerns"
        else:
            overall = "healthy"

        action_items = [i.action_item for i in insights if i.action_item]

        return {
            "sprint_count": len(self._history),
            "latest_sprint": self._history[-1].sprint_number,
            "overall_health": overall,
            "insights": [i.to_dict() for i in insights],
            "action_items": action_items,
            "history": [s.to_dict() for s in self._history],
        }
