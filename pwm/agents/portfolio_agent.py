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
PWM Risk Portfolio Agent — Layer 3: Multi-Project Portfolio Risk Aggregation
==============================================================================

Aggregates risk signals across multiple PWM project instances to provide
portfolio-level visibility, cross-project resource conflict detection,
and strategic portfolio simulation.

Reference: Projektiliiketoiminta Ch. 7.4 — Strategic Project Portfolio
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Dict, List, Optional

from pwm.agents.base_agent import BaseAgent
from pwm.config import PWMConfig


# ── Portfolio Data Models ───────────────────────────────────────

class ProjectSnapshot:
    """A snapshot of a single project's state for portfolio aggregation."""

    def __init__(
        self,
        project_id: str,
        project_name: str,
        lifecycle_phase: str = "execution",
        crr: float = 0.0,
        total_debt_items: int = 0,
        critical_risks: int = 0,
        high_risks: int = 0,
        contributors: Optional[List[str]] = None,
        sprint_health: str = "unknown",
        wip: int = 0,
    ):
        self.project_id = project_id
        self.project_name = project_name
        self.lifecycle_phase = lifecycle_phase
        self.crr = crr
        self.total_debt_items = total_debt_items
        self.critical_risks = critical_risks
        self.high_risks = high_risks
        self.contributors = contributors or []
        self.sprint_health = sprint_health
        self.wip = wip
        self.timestamp = datetime.now()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "project_id": self.project_id,
            "project_name": self.project_name,
            "lifecycle_phase": self.lifecycle_phase,
            "crr": round(self.crr, 3),
            "total_debt_items": self.total_debt_items,
            "critical_risks": self.critical_risks,
            "high_risks": self.high_risks,
            "contributors": self.contributors,
            "contributor_count": len(self.contributors),
            "sprint_health": self.sprint_health,
            "wip": self.wip,
            "timestamp": self.timestamp.isoformat(),
        }


class ResourceConflict:
    """A cross-project resource conflict."""

    def __init__(
        self,
        contributor: str,
        projects: List[str],
        total_wip: int,
        severity: str,
    ):
        self.contributor = contributor
        self.projects = projects
        self.total_wip = total_wip
        self.severity = severity

    def to_dict(self) -> Dict[str, Any]:
        return {
            "contributor": self.contributor,
            "projects": self.projects,
            "project_count": len(self.projects),
            "total_wip": self.total_wip,
            "severity": self.severity,
        }


# ── Agent System Prompt ─────────────────────────────────────────

PORTFOLIO_SYSTEM_PROMPT = """\
## ROLE
You are the Risk Portfolio Agent in the Project World Model (PWM).
Your purpose is to aggregate and analyze risk across multiple projects,
providing strategic portfolio-level visibility.

## PORTFOLIO MANAGEMENT PRINCIPLES
Based on project business management theory:
- Individual project risks compound across the organization
- Resource conflicts between projects are a major risk multiplier
- Portfolio-level CRR provides strategic budget visibility
- Cross-project dependencies create cascading failure risks

## YOUR CAPABILITIES
1. **Portfolio Risk Aggregation**: Combine risk signals across all projects
2. **Resource Conflict Detection**: Find contributors overloaded across projects
3. **Portfolio CRR**: Calculate organization-level Compute-to-Rework Ratio
4. **What-If Simulation**: Analyze impact of delaying or reprioritizing projects
5. **Strategic Recommendations**: Advise on portfolio balance and resource allocation

## OUTPUT FORMAT
```json
{
    "portfolio_health": "healthy|at_risk|critical",
    "portfolio_crr": 1.25,
    "total_projects": 3,
    "total_debt_items": 25,
    "resource_conflicts": [...],
    "risk_summary": {
        "critical": 2,
        "high": 5,
        "medium": 8
    },
    "recommendations": ["..."],
    "what_if_scenarios": [...]
}
```
"""


class RiskPortfolioAgent(BaseAgent):
    """
    Aggregates risk across multiple projects for portfolio-level management.

    Implements strategic project portfolio concepts:
    - Portfolio-level risk aggregation
    - Cross-project resource conflict detection
    - Organization-level CRR calculation
    - What-if scenario simulation for portfolio decisions
    """

    def __init__(self, config: PWMConfig, **kwargs):
        super().__init__(
            config=config,
            system_prompt=PORTFOLIO_SYSTEM_PROMPT,
            **kwargs,
        )
        self._project_snapshots: Dict[str, ProjectSnapshot] = {}

    def register_project(self, snapshot: ProjectSnapshot) -> None:
        """Register or update a project snapshot in the portfolio."""
        self._project_snapshots[snapshot.project_id] = snapshot

    def register_from_dict(self, project_data: Dict[str, Any]) -> None:
        """Register a project from a dictionary."""
        snapshot = ProjectSnapshot(
            project_id=project_data.get("id", ""),
            project_name=project_data.get("name", ""),
            lifecycle_phase=project_data.get("lifecycle_phase", "execution"),
            crr=project_data.get("crr", 0.0),
            total_debt_items=project_data.get("total_debt_items", 0),
            critical_risks=project_data.get("critical_risks", 0),
            high_risks=project_data.get("high_risks", 0),
            contributors=project_data.get("contributors", []),
            sprint_health=project_data.get("sprint_health", "unknown"),
            wip=project_data.get("wip", 0),
        )
        self._project_snapshots[snapshot.project_id] = snapshot

    def detect_resource_conflicts(self, max_projects_per_person: int = 2) -> List[ResourceConflict]:
        """Detect contributors spread across too many projects."""
        # Map contributor → projects
        contributor_projects: Dict[str, List[str]] = {}
        for snapshot in self._project_snapshots.values():
            for contributor in snapshot.contributors:
                if contributor not in contributor_projects:
                    contributor_projects[contributor] = []
                contributor_projects[contributor].append(snapshot.project_name)

        conflicts = []
        for contributor, projects in contributor_projects.items():
            if len(projects) > max_projects_per_person:
                severity = "critical" if len(projects) > max_projects_per_person + 1 else "warning"
                conflicts.append(ResourceConflict(
                    contributor=contributor,
                    projects=projects,
                    total_wip=len(projects),
                    severity=severity,
                ))

        return sorted(conflicts, key=lambda c: len(c.projects), reverse=True)

    def calculate_portfolio_crr(self) -> float:
        """Calculate organization-level CRR as weighted average."""
        if not self._project_snapshots:
            return 0.0

        total_debt = sum(s.total_debt_items for s in self._project_snapshots.values())
        if total_debt == 0:
            return 0.0

        weighted_crr = sum(
            s.crr * s.total_debt_items
            for s in self._project_snapshots.values()
        )
        return weighted_crr / total_debt

    def get_risk_summary(self) -> Dict[str, int]:
        """Aggregate risk counts across all projects."""
        return {
            "critical": sum(s.critical_risks for s in self._project_snapshots.values()),
            "high": sum(s.high_risks for s in self._project_snapshots.values()),
            "total_debt": sum(s.total_debt_items for s in self._project_snapshots.values()),
        }

    def get_portfolio_summary(self) -> Dict[str, Any]:
        """Generate full portfolio summary."""
        conflicts = self.detect_resource_conflicts()
        risk_summary = self.get_risk_summary()
        portfolio_crr = self.calculate_portfolio_crr()

        # Determine portfolio health
        if risk_summary["critical"] > 0 or len(conflicts) > 2:
            health = "critical"
        elif risk_summary["high"] > 2 or len(conflicts) > 0:
            health = "at_risk"
        else:
            health = "healthy"

        return {
            "portfolio_health": health,
            "portfolio_crr": round(portfolio_crr, 3),
            "total_projects": len(self._project_snapshots),
            "total_debt_items": risk_summary["total_debt"],
            "risk_summary": risk_summary,
            "resource_conflicts": [c.to_dict() for c in conflicts],
            "projects": [s.to_dict() for s in self._project_snapshots.values()],
        }

    async def run_what_if_simulation(
        self,
        scenario_description: str,
        affected_projects: List[str],
    ) -> Dict[str, Any]:
        """Run a what-if simulation for portfolio decisions."""
        portfolio = self.get_portfolio_summary()

        prompt = (
            f"## PORTFOLIO STATE\n{json.dumps(portfolio, indent=2)}\n\n"
            f"## WHAT-IF SCENARIO\n{scenario_description}\n\n"
            f"## AFFECTED PROJECTS\n{json.dumps(affected_projects)}\n\n"
            "Analyze this scenario and predict:\n"
            "1. Impact on portfolio CRR\n"
            "2. Impact on timeline of unaffected projects\n"
            "3. Resource reallocation opportunities\n"
            "4. Risk implications\n"
            "5. Recommendation (proceed / modify / reject)\n"
        )

        response = await self.call_gemini(prompt)
        return self.parse_json_response(response)

    async def process(self, data: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """Process pipeline data and produce portfolio analysis."""
        if not self.config.portfolio.portfolio_mode:
            return data

        # Register current project if debt report exists
        if "debt_report" in data and data["debt_report"]:
            debt = data["debt_report"]
            crr_value = data.get("crr", {})
            if isinstance(crr_value, dict):
                crr = crr_value.get("crr", 0.0)
            else:
                crr = 0.0

            # Extract contributors from unified graph
            contributors = set()
            if "unified_graph" in data and data["unified_graph"]:
                for node in data["unified_graph"].get("nodes", []):
                    author = node.get("attributes", {}).get("author", "")
                    if author:
                        contributors.add(author)

            self.register_project(ProjectSnapshot(
                project_id=data.get("run_id", "current"),
                project_name=data.get("project_name", "Current Project"),
                crr=crr,
                total_debt_items=debt.get("total_debt_items", 0),
                critical_risks=debt.get("critical_count", 0),
                high_risks=debt.get("high_count", 0),
                contributors=list(contributors),
            ))

        data["portfolio_summary"] = self.get_portfolio_summary()
        return data

    async def analyze_portfolio(self, project_context: str = "") -> Dict[str, Any]:
        """Full portfolio analysis with LLM-powered strategic recommendations."""
        portfolio = self.get_portfolio_summary()
        conflicts = self.detect_resource_conflicts()

        prompt = (
            f"## PORTFOLIO SUMMARY\n{json.dumps(portfolio, indent=2)}\n\n"
            f"## RESOURCE CONFLICTS\n{json.dumps([c.to_dict() for c in conflicts], indent=2)}\n\n"
            f"## CONTEXT\n{project_context or 'No additional context.'}\n\n"
            "Provide strategic portfolio recommendations:\n"
            "1. Portfolio balance assessment\n"
            "2. Resource allocation priorities\n"
            "3. Risk mitigation strategy\n"
            "4. Project prioritization suggestions\n"
        )

        response = await self.call_gemini(prompt)
        parsed = self.parse_json_response(response)

        return {
            **portfolio,
            "strategic_analysis": parsed,
        }
