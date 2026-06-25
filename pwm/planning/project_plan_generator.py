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
PWM Project Plan Generator
=============================

Generates structured project plans from ingested data including
Work Breakdown Structure (WBS), milestone timelines, resource allocation
heat maps, and comprehensive risk registers.

Reference: Projektiliiketoiminta Ch. 4 — Project Planning and Control
  Knowledge areas: scope, schedule, cost, resources, communication,
  risk, procurement, quality, integration.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional


# ── Knowledge Areas (9 per Projektiliiketoiminta) ───────────────

KNOWLEDGE_AREAS = [
    "integration_management",
    "scope_management",
    "schedule_management",
    "cost_management",
    "resource_management",
    "communication_management",
    "risk_management",
    "procurement_management",
    "quality_management",
]


class WBSItem:
    """A Work Breakdown Structure item (hierarchical task decomposition)."""

    def __init__(
        self,
        item_id: str,
        title: str,
        parent_id: Optional[str] = None,
        level: int = 0,
        estimated_hours: float = 0.0,
        assignee: Optional[str] = None,
        status: str = "planned",
    ):
        self.item_id = item_id
        self.title = title
        self.parent_id = parent_id
        self.level = level
        self.estimated_hours = estimated_hours
        self.assignee = assignee
        self.status = status  # planned, in_progress, completed
        self.children: List[WBSItem] = []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "item_id": self.item_id,
            "title": self.title,
            "parent_id": self.parent_id,
            "level": self.level,
            "estimated_hours": self.estimated_hours,
            "assignee": self.assignee,
            "status": self.status,
            "children": [c.to_dict() for c in self.children],
        }


class Milestone:
    """A project milestone with target and actual dates."""

    def __init__(
        self,
        milestone_id: str,
        title: str,
        target_date: Optional[datetime] = None,
        actual_date: Optional[datetime] = None,
        status: str = "pending",
    ):
        self.milestone_id = milestone_id
        self.title = title
        self.target_date = target_date
        self.actual_date = actual_date
        self.status = status  # pending, completed, overdue, at_risk

    @property
    def is_overdue(self) -> bool:
        if self.status == "completed":
            return False
        if self.target_date and datetime.now() > self.target_date:
            return True
        return False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "milestone_id": self.milestone_id,
            "title": self.title,
            "target_date": self.target_date.isoformat() if self.target_date else None,
            "actual_date": self.actual_date.isoformat() if self.actual_date else None,
            "status": "overdue" if self.is_overdue else self.status,
        }


class RiskRegisterEntry:
    """A single entry in the project risk register."""

    def __init__(
        self,
        risk_id: str,
        description: str,
        knowledge_area: str,
        probability: float = 0.5,
        impact: float = 0.5,
        mitigation: str = "",
        status: str = "open",
    ):
        self.risk_id = risk_id
        self.description = description
        self.knowledge_area = knowledge_area
        self.probability = probability
        self.impact = impact
        self.mitigation = mitigation
        self.status = status  # open, mitigated, closed, accepted

    @property
    def risk_score(self) -> float:
        return round(self.probability * self.impact, 3)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "risk_id": self.risk_id,
            "description": self.description,
            "knowledge_area": self.knowledge_area,
            "probability": self.probability,
            "impact": self.impact,
            "risk_score": self.risk_score,
            "mitigation": self.mitigation,
            "status": self.status,
        }


class ProjectPlanGenerator:
    """
    Generates structured project plans from ingested project data.

    Produces:
    - Work Breakdown Structure (WBS) from issue hierarchies
    - Milestone timelines from sprint data
    - Resource allocation heat maps from contributor activity
    - Comprehensive risk registers combining the nine knowledge areas
      with PWM's causal debt data
    """

    def __init__(self):
        self._wbs_items: List[WBSItem] = []
        self._milestones: List[Milestone] = []
        self._risk_register: List[RiskRegisterEntry] = []
        self._contributors: Dict[str, Dict[str, Any]] = {}

    def build_wbs_from_issues(
        self,
        issues: List[Dict[str, Any]],
    ) -> List[WBSItem]:
        """Build WBS from issue hierarchy (epics → stories → tasks)."""
        self._wbs_items = []
        items_by_id: Dict[str, WBSItem] = {}

        for issue in issues:
            item = WBSItem(
                item_id=issue.get("id", ""),
                title=issue.get("title", ""),
                parent_id=issue.get("parent_id"),
                level=issue.get("level", 0),
                estimated_hours=issue.get("estimated_hours", 0.0),
                assignee=issue.get("assignee"),
                status=issue.get("status", "planned"),
            )
            items_by_id[item.item_id] = item
            self._wbs_items.append(item)

        # Build hierarchy
        for item in self._wbs_items:
            if item.parent_id and item.parent_id in items_by_id:
                items_by_id[item.parent_id].children.append(item)

        # Return root items only
        return [item for item in self._wbs_items if not item.parent_id]

    def generate_milestones_from_sprints(
        self,
        sprint_count: int,
        sprint_length_days: int = 14,
        start_date: Optional[datetime] = None,
    ) -> List[Milestone]:
        """Generate milestone markers from sprint boundaries."""
        self._milestones = []
        start = start_date or datetime.now()

        for i in range(1, sprint_count + 1):
            target = start + timedelta(days=sprint_length_days * i)
            self._milestones.append(Milestone(
                milestone_id=f"sprint-{i}-end",
                title=f"Sprint {i} Completion",
                target_date=target,
                status="pending",
            ))

        # Add project-level milestones
        if sprint_count > 0:
            midpoint = sprint_count // 2
            self._milestones.insert(midpoint, Milestone(
                milestone_id="mid-project-review",
                title="Mid-Project Review Gate",
                target_date=start + timedelta(days=sprint_length_days * midpoint),
                status="pending",
            ))
            self._milestones.append(Milestone(
                milestone_id="project-delivery",
                title="Project Delivery & Handoff",
                target_date=start + timedelta(days=sprint_length_days * sprint_count + 7),
                status="pending",
            ))

        return self._milestones

    def calculate_resource_allocation(
        self,
        contributor_activities: Dict[str, List[Dict[str, Any]]],
    ) -> Dict[str, Any]:
        """Calculate resource allocation heat map from contributor activity."""
        allocation = {}

        for contributor, activities in contributor_activities.items():
            total_items = len(activities)
            areas: Dict[str, int] = defaultdict(int)
            for activity in activities:
                area = activity.get("area", "general")
                areas[area] += 1

            utilization = min(100, total_items * 10)  # rough utilization proxy
            allocation[contributor] = {
                "total_activities": total_items,
                "utilization_pct": utilization,
                "areas": dict(areas),
                "overloaded": utilization > 80,
            }

        self._contributors = allocation
        return allocation

    def build_risk_register_from_debt(
        self,
        debt_conflicts: List[Dict[str, Any]],
    ) -> List[RiskRegisterEntry]:
        """Build a risk register from PWM debt detection results."""
        self._risk_register = []

        # Map conflict types to knowledge areas
        type_to_area = {
            "merge_conflict": "integration_management",
            "dependency_conflict": "scope_management",
            "semantic_conflict": "quality_management",
            "resource_conflict": "resource_management",
            "timeline_conflict": "schedule_management",
            "budget_conflict": "cost_management",
        }

        for i, conflict in enumerate(debt_conflicts):
            conflict_type = conflict.get("conflict_type", "unknown")
            severity = conflict.get("severity", "medium")

            probability_map = {"critical": 0.9, "high": 0.7, "medium": 0.5, "low": 0.3}
            impact_map = {"critical": 0.9, "high": 0.7, "medium": 0.5, "low": 0.2}

            entry = RiskRegisterEntry(
                risk_id=f"RISK-{i + 1:03d}",
                description=conflict.get("description", ""),
                knowledge_area=type_to_area.get(conflict_type, "integration_management"),
                probability=probability_map.get(severity, 0.5),
                impact=impact_map.get(severity, 0.5),
                mitigation=conflict.get("causal_evidence", {}).get("counterfactual", ""),
            )
            self._risk_register.append(entry)

        return sorted(self._risk_register, key=lambda r: r.risk_score, reverse=True)

    def generate_plan(self) -> Dict[str, Any]:
        """Generate the complete project plan document."""
        root_wbs = [item for item in self._wbs_items if not item.parent_id]
        total_hours = sum(item.estimated_hours for item in self._wbs_items)
        overdue_milestones = [m for m in self._milestones if m.is_overdue]

        # Risk register summary by knowledge area
        risk_by_area: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        for risk in self._risk_register:
            risk_by_area[risk.knowledge_area].append(risk.to_dict())

        return {
            "generated_at": datetime.now().isoformat(),
            "work_breakdown_structure": {
                "total_items": len(self._wbs_items),
                "total_estimated_hours": round(total_hours, 1),
                "root_items": [item.to_dict() for item in root_wbs],
            },
            "milestones": {
                "total": len(self._milestones),
                "overdue": len(overdue_milestones),
                "items": [m.to_dict() for m in self._milestones],
            },
            "resource_allocation": self._contributors,
            "risk_register": {
                "total_risks": len(self._risk_register),
                "high_risk_count": sum(1 for r in self._risk_register if r.risk_score > 0.6),
                "by_knowledge_area": dict(risk_by_area),
                "top_risks": [r.to_dict() for r in self._risk_register[:10]],
            },
            "knowledge_areas_covered": list(set(
                r.knowledge_area for r in self._risk_register
            )) if self._risk_register else KNOWLEDGE_AREAS,
        }
