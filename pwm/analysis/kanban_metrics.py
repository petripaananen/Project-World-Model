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
PWM Kanban Flow Engine
======================

Deterministic mathematical calculation of Kanban Guide flow measures:
- Work in Progress (WIP)
- Cycle Time (Mean, 85th percentile, 95th percentile)
- Work Item Age
- Throughput
- Little's Law validation (WIP = Throughput * Cycle Time)
- Bottleneck & Stalled Item Detection

Zero token cost, microsecond execution, mathematically exact.
"""

from __future__ import annotations

import math
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional


class KanbanFlowMetricsEngine:
    """
    High-speed deterministic calculation engine for Kanban flow metrics.
    Replaces LLM-based metric estimations with exact mathematical analysis.
    """

    @staticmethod
    def calculate_metrics(
        work_items: List[Dict[str, Any]],
        wip_limit: int = 10,
        cycle_time_target_days: float = 5.0,
        now: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """
        Calculates all mandatory Kanban flow measures for a set of work items.

        Each work item dict can have:
          - id, title, state ('todo', 'in_progress', 'review', 'done')
          - started_at: datetime or ISO string
          - finished_at: datetime or ISO string
        """
        current_time = now or datetime.now()

        active_items = []
        completed_items = []
        cycle_times_days: List[float] = []
        item_ages_days: List[float] = []
        stalled_item_ids: List[str] = []

        for item in work_items:
            state = str(item.get("state", "")).lower()
            started_at = item.get("started_at")
            finished_at = item.get("finished_at")

            # Normalize datetimes if string
            if isinstance(started_at, str):
                try:
                    started_at = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
                except Exception:
                    started_at = None
            if isinstance(started_at, datetime) and started_at.tzinfo is not None:
                started_at = started_at.replace(tzinfo=None)

            if isinstance(finished_at, str):
                try:
                    finished_at = datetime.fromisoformat(finished_at.replace("Z", "+00:00"))
                except Exception:
                    finished_at = None
            if isinstance(finished_at, datetime) and finished_at.tzinfo is not None:
                finished_at = finished_at.replace(tzinfo=None)

            if state in ["done", "closed", "resolved"] or finished_at:
                completed_items.append(item)
                if started_at and finished_at:
                    dur = max((finished_at - started_at).total_seconds() / 86400.0, 0.01)
                    cycle_times_days.append(dur)
            else:
                active_items.append(item)
                if started_at:
                    age = max((current_time - started_at).total_seconds() / 86400.0, 0.0)
                    item_ages_days.append(age)
                    if age > (cycle_time_target_days * 2):
                        stalled_item_ids.append(str(item.get("id", "unknown")))

        current_wip = len(active_items)
        wip_exceeded = current_wip > wip_limit

        # Cycle Time percentiles
        cycle_times_days.sort()
        mean_cycle_time = sum(cycle_times_days) / len(cycle_times_days) if cycle_times_days else 0.0
        p85_cycle_time = (
            cycle_times_days[int(math.ceil(0.85 * len(cycle_times_days))) - 1]
            if cycle_times_days
            else 0.0
        )
        p95_cycle_time = (
            cycle_times_days[int(math.ceil(0.95 * len(cycle_times_days))) - 1]
            if cycle_times_days
            else 0.0
        )

        # Work Item Age stats
        item_ages_days.sort()
        mean_age = sum(item_ages_days) / len(item_ages_days) if item_ages_days else 0.0
        max_age = item_ages_days[-1] if item_ages_days else 0.0

        # Throughput (completed items)
        throughput = len(completed_items)

        # Little's Law check: WIP = Throughput_rate * Cycle_Time
        # Expected WIP = (throughput / lookback_window) * mean_cycle_time
        littles_law_ratio = (
            (current_wip / (throughput * (mean_cycle_time / 14.0)))
            if throughput > 0 and mean_cycle_time > 0
            else 1.0
        )

        # Stalled items (age > 2x target)
        stalled_items = stalled_item_ids

        flow_health = "HEALTHY"
        if wip_exceeded or p85_cycle_time > (cycle_time_target_days * 1.5):
            flow_health = "DEGRADED"
        if wip_exceeded and len(stalled_items) >= 3:
            flow_health = "CRITICAL_BOTTLENECK"

        return {
            "current_wip": current_wip,
            "wip_limit": wip_limit,
            "wip_exceeded": wip_exceeded,
            "throughput_completed": throughput,
            "mean_cycle_time_days": round(mean_cycle_time, 2),
            "p85_cycle_time_days": round(p85_cycle_time, 2),
            "p95_cycle_time_days": round(p95_cycle_time, 2),
            "mean_work_item_age_days": round(mean_age, 2),
            "max_work_item_age_days": round(max_age, 2),
            "stalled_items_count": len(stalled_items),
            "stalled_item_ids": stalled_items,
            "flow_health": flow_health,
            "littles_law_equilibrium": round(littles_law_ratio, 2),
        }
