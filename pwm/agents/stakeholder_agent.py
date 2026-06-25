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
PWM Stakeholder Agent — Layer 3: Stakeholder Intelligence
============================================================

Tracks, analyzes, and manages project stakeholder relationships.
Detects communication silos, inactive contributors, and generates
stakeholder risk reports and RACI matrices.

Reference: Projektiliiketoiminta Ch. 2.6 — Stakeholders
"""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set

from pwm.agents.base_agent import BaseAgent
from pwm.config import PWMConfig


# ── Stakeholder Data Models ─────────────────────────────────────

class Stakeholder:
    """A project stakeholder — any individual who affects or is affected by the project."""

    def __init__(
        self,
        stakeholder_id: str,
        name: str,
        role: str = "contributor",
        influence: str = "medium",
    ):
        self.stakeholder_id = stakeholder_id
        self.name = name
        self.role = role  # contributor, reviewer, owner, sponsor, user
        self.influence = influence  # high, medium, low
        self.activities: List[Dict[str, Any]] = []
        self.communication_partners: Set[str] = set()
        self.assigned_areas: List[str] = []

    @property
    def last_activity_date(self) -> Optional[datetime]:
        if not self.activities:
            return None
        return max(
            datetime.fromisoformat(a["timestamp"].replace("Z", "+00:00"))
            for a in self.activities
            if "timestamp" in a
        )

    @property
    def activity_count(self) -> int:
        return len(self.activities)

    @property
    def days_since_last_activity(self) -> Optional[float]:
        last = self.last_activity_date
        if not last:
            return None
        return (datetime.now(tz=last.tzinfo) - last).total_seconds() / 86400

    def to_dict(self) -> Dict[str, Any]:
        return {
            "stakeholder_id": self.stakeholder_id,
            "name": self.name,
            "role": self.role,
            "influence": self.influence,
            "activity_count": self.activity_count,
            "days_since_last_activity": (
                round(self.days_since_last_activity, 1)
                if self.days_since_last_activity is not None else None
            ),
            "communication_partners": list(self.communication_partners),
            "assigned_areas": self.assigned_areas,
        }


class StakeholderRisk:
    """A risk related to stakeholder engagement."""

    def __init__(
        self,
        stakeholder_id: str,
        risk_type: str,
        severity: str,
        description: str,
    ):
        self.stakeholder_id = stakeholder_id
        self.risk_type = risk_type  # inactive, siloed, overloaded, missing_reviewer
        self.severity = severity  # critical, warning, info
        self.description = description

    def to_dict(self) -> Dict[str, Any]:
        return {
            "stakeholder_id": self.stakeholder_id,
            "risk_type": self.risk_type,
            "severity": self.severity,
            "description": self.description,
        }


# ── Agent System Prompt ─────────────────────────────────────────

STAKEHOLDER_SYSTEM_PROMPT = """\
## ROLE
You are the Stakeholder Agent in the Project World Model (PWM).
Your purpose is to track, analyze, and manage project stakeholder relationships
to ensure effective communication, collaboration, and risk mitigation.

## STAKEHOLDER MANAGEMENT PRINCIPLES
Based on project management best practices:
- All stakeholders must be identified and their needs understood
- Stakeholder relationships must be actively managed throughout the project lifecycle
- Communication patterns reveal silos, bottlenecks, and disconnected parties
- Early identification of stakeholder risks prevents downstream problems

## YOUR CAPABILITIES
1. **Stakeholder Mapping**: Build and maintain a stakeholder network graph
2. **Risk Detection**: Identify inactive contributors, communication silos, overloaded team members
3. **RACI Generation**: Propose responsibility matrices for work streams
4. **Communication Analysis**: Detect disconnected or siloed stakeholders

## OUTPUT FORMAT
```json
{
    "stakeholder_health": "healthy|at_risk|critical",
    "stakeholder_count": 10,
    "risks": [
        {
            "stakeholder_id": "...",
            "risk_type": "inactive|siloed|overloaded|missing_reviewer",
            "severity": "critical|warning|info",
            "description": "..."
        }
    ],
    "communication_graph": {
        "nodes": ["..."],
        "edges": [{"source": "...", "target": "...", "weight": 5}]
    },
    "recommendations": ["..."]
}
```
"""


class StakeholderAgent(BaseAgent):
    """
    Tracks and analyzes project stakeholder relationships.

    Implements stakeholder management practices from project business theory:
    - Stakeholder identification and classification
    - Communication pattern analysis
    - Risk detection and reporting
    - RACI matrix generation
    """

    def __init__(self, config: PWMConfig, **kwargs):
        super().__init__(
            config=config,
            system_prompt=STAKEHOLDER_SYSTEM_PROMPT,
            model_override=config.models.fast_model,
            **kwargs,
        )
        self._stakeholders: Dict[str, Stakeholder] = {}

    def ingest_from_project_data(
        self,
        pr_authors: List[Dict[str, str]],
        pr_reviewers: List[Dict[str, str]],
        issue_assignees: List[Dict[str, str]],
        message_participants: Optional[List[Dict[str, str]]] = None,
    ) -> None:
        """Build stakeholder map from ingested project data sources."""
        # Process PR authors
        for pr in pr_authors:
            sid = pr.get("author", "unknown")
            if sid not in self._stakeholders:
                self._stakeholders[sid] = Stakeholder(
                    stakeholder_id=sid,
                    name=sid,
                    role="contributor",
                )
            self._stakeholders[sid].activities.append({
                "type": "pr_authored",
                "pr_id": pr.get("pr_id", ""),
                "timestamp": pr.get("timestamp", datetime.now().isoformat()),
            })

        # Process PR reviewers
        for review in pr_reviewers:
            sid = review.get("reviewer", "unknown")
            author = review.get("author", "unknown")
            if sid not in self._stakeholders:
                self._stakeholders[sid] = Stakeholder(
                    stakeholder_id=sid,
                    name=sid,
                    role="reviewer",
                )
            self._stakeholders[sid].activities.append({
                "type": "pr_reviewed",
                "pr_id": review.get("pr_id", ""),
                "timestamp": review.get("timestamp", datetime.now().isoformat()),
            })
            # Track communication links
            if sid in self._stakeholders:
                self._stakeholders[sid].communication_partners.add(author)
            if author in self._stakeholders:
                self._stakeholders[author].communication_partners.add(sid)

        # Process issue assignees
        for issue in issue_assignees:
            sid = issue.get("assignee", "unknown")
            if sid not in self._stakeholders:
                self._stakeholders[sid] = Stakeholder(
                    stakeholder_id=sid,
                    name=sid,
                    role="contributor",
                )
            self._stakeholders[sid].activities.append({
                "type": "issue_assigned",
                "issue_id": issue.get("issue_id", ""),
                "timestamp": issue.get("timestamp", datetime.now().isoformat()),
            })
            # Track assigned areas
            area = issue.get("area", "")
            if area and area not in self._stakeholders[sid].assigned_areas:
                self._stakeholders[sid].assigned_areas.append(area)

        # Process message participants (Slack, etc.)
        if message_participants:
            for msg in message_participants:
                sid = msg.get("participant", "unknown")
                if sid not in self._stakeholders:
                    self._stakeholders[sid] = Stakeholder(
                        stakeholder_id=sid,
                        name=sid,
                        role="contributor",
                    )
                self._stakeholders[sid].activities.append({
                    "type": "message",
                    "channel": msg.get("channel", ""),
                    "timestamp": msg.get("timestamp", datetime.now().isoformat()),
                })

    def detect_risks(self, inactivity_threshold_days: float = 5.0) -> List[StakeholderRisk]:
        """Detect stakeholder-related risks."""
        risks: List[StakeholderRisk] = []

        for sid, stakeholder in self._stakeholders.items():
            # Inactive stakeholders
            days = stakeholder.days_since_last_activity
            if days is not None and days > inactivity_threshold_days:
                severity = "critical" if days > inactivity_threshold_days * 2 else "warning"
                risks.append(StakeholderRisk(
                    stakeholder_id=sid,
                    risk_type="inactive",
                    severity=severity,
                    description=(
                        f"{stakeholder.name} has been inactive for {days:.1f} days. "
                        f"Assigned areas: {', '.join(stakeholder.assigned_areas) or 'none'}."
                    ),
                ))

            # Siloed stakeholders (no communication partners)
            if (
                stakeholder.activity_count > 3
                and len(stakeholder.communication_partners) == 0
            ):
                risks.append(StakeholderRisk(
                    stakeholder_id=sid,
                    risk_type="siloed",
                    severity="warning",
                    description=(
                        f"{stakeholder.name} is active ({stakeholder.activity_count} activities) "
                        f"but has no recorded interactions with other team members."
                    ),
                ))

            # Overloaded stakeholders
            if stakeholder.activity_count > 20:
                risks.append(StakeholderRisk(
                    stakeholder_id=sid,
                    risk_type="overloaded",
                    severity="warning",
                    description=(
                        f"{stakeholder.name} has {stakeholder.activity_count} activities, "
                        f"which may indicate overload."
                    ),
                ))

        return sorted(risks, key=lambda r: {"critical": 0, "warning": 1, "info": 2}.get(r.severity, 3))

    def get_communication_graph(self) -> Dict[str, Any]:
        """Build a communication graph from stakeholder interactions."""
        nodes = list(self._stakeholders.keys())
        edges = []
        seen_edges: Set[tuple] = set()

        for sid, stakeholder in self._stakeholders.items():
            for partner in stakeholder.communication_partners:
                edge_key = tuple(sorted([sid, partner]))
                if edge_key not in seen_edges:
                    seen_edges.add(edge_key)
                    edges.append({
                        "source": sid,
                        "target": partner,
                        "weight": 1,
                    })

        return {"nodes": nodes, "edges": edges}

    def generate_raci_data(self) -> List[Dict[str, Any]]:
        """Generate RACI matrix data based on stakeholder activities."""
        # Group activities by area/component
        area_stakeholders: Dict[str, List[str]] = defaultdict(list)
        for sid, stakeholder in self._stakeholders.items():
            for area in stakeholder.assigned_areas:
                area_stakeholders[area].append(sid)

        raci = []
        for area, stakeholders_list in area_stakeholders.items():
            raci_entry = {
                "area": area,
                "responsible": stakeholders_list[0] if stakeholders_list else "unassigned",
                "accountable": stakeholders_list[0] if stakeholders_list else "unassigned",
                "consulted": stakeholders_list[1:3] if len(stakeholders_list) > 1 else [],
                "informed": stakeholders_list[3:] if len(stakeholders_list) > 3 else [],
            }
            raci.append(raci_entry)

        return raci

    async def process(self, data: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """Process pipeline data and produce stakeholder analysis."""
        if not self.config.portfolio.stakeholder_tracking_enabled:
            return data

        # Extract stakeholder data from the unified graph if present
        if "unified_graph" in data and data["unified_graph"]:
            graph = data["unified_graph"]
            pr_authors = []
            pr_reviewers = []
            issue_assignees = []

            for node in graph.get("nodes", []):
                attrs = node.get("attributes", {})
                author = attrs.get("author", "")
                if node.get("type") == "pr" and author:
                    pr_authors.append({
                        "author": author,
                        "pr_id": node.get("id", ""),
                        "timestamp": datetime.now().isoformat(),
                    })
                elif node.get("type") == "issue" and author:
                    issue_assignees.append({
                        "assignee": author,
                        "issue_id": node.get("id", ""),
                        "area": node.get("name", "").split(":")[0] if ":" in node.get("name", "") else "",
                        "timestamp": datetime.now().isoformat(),
                    })

            self.ingest_from_project_data(pr_authors, pr_reviewers, issue_assignees)

        risks = self.detect_risks()
        comm_graph = self.get_communication_graph()
        raci = self.generate_raci_data()

        data["stakeholder_analysis"] = {
            "stakeholder_count": len(self._stakeholders),
            "stakeholders": [s.to_dict() for s in self._stakeholders.values()],
            "risks": [r.to_dict() for r in risks],
            "communication_graph": comm_graph,
            "raci_matrix": raci,
            "health": (
                "critical" if any(r.severity == "critical" for r in risks) else
                "at_risk" if any(r.severity == "warning" for r in risks) else
                "healthy"
            ),
        }

        return data

    async def analyze_stakeholders(self, project_context: str = "") -> Dict[str, Any]:
        """Full stakeholder analysis with LLM-powered recommendations."""
        risks = self.detect_risks()
        comm_graph = self.get_communication_graph()
        stakeholder_data = [s.to_dict() for s in self._stakeholders.values()]

        prompt = (
            f"## STAKEHOLDER DATA\n{json.dumps(stakeholder_data[:15], indent=2)}\n\n"
            f"## RISKS DETECTED\n{json.dumps([r.to_dict() for r in risks], indent=2)}\n\n"
            f"## COMMUNICATION GRAPH\n{json.dumps(comm_graph, indent=2)}\n\n"
            f"## PROJECT CONTEXT\n{project_context or 'No additional context.'}\n\n"
            "Analyze stakeholder health and provide recommendations for:\n"
            "1. Addressing inactive or siloed stakeholders\n"
            "2. Improving communication patterns\n"
            "3. Reducing overload on key contributors\n"
        )

        response = await self.call_gemini(prompt)
        return self.parse_json_response(response)
