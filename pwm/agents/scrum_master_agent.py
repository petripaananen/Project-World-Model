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
PWM Scrum Master Agent — Layer 3: Sprint Ceremony Orchestrator
================================================================

Automates Scrum ceremony facilitation: Sprint Planning, Daily Scrum
summaries, Sprint Review preparation, and Sprint Retrospective insights.

Reference: The Scrum Guide (November 2020) — Scrum Events & Artifacts
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from pwm.agents.base_agent import BaseAgent
from pwm.config import PWMConfig


# ── Sprint Data Models ──────────────────────────────────────────

class SprintState:
    """Tracks the current Sprint's state and progress."""

    def __init__(
        self,
        sprint_number: int = 1,
        sprint_goal: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ):
        self.sprint_number = sprint_number
        self.sprint_goal = sprint_goal
        self.start_date = start_date or datetime.now()
        self.end_date = end_date
        self.backlog_items: List[Dict[str, Any]] = []
        self.completed_items: List[Dict[str, Any]] = []
        self.velocity_history: List[int] = []

    @property
    def days_remaining(self) -> int:
        if not self.end_date:
            return 0
        delta = self.end_date - datetime.now()
        return max(0, delta.days)

    @property
    def progress_percentage(self) -> float:
        total = len(self.backlog_items) + len(self.completed_items)
        if total == 0:
            return 0.0
        return (len(self.completed_items) / total) * 100

    @property
    def is_on_track(self) -> str:
        """Estimate sprint health: on_track, at_risk, behind."""
        if not self.end_date:
            return "unknown"
        total_days = (self.end_date - self.start_date).days
        elapsed_days = (datetime.now() - self.start_date).days
        expected_progress = (elapsed_days / max(total_days, 1)) * 100
        actual_progress = self.progress_percentage

        if actual_progress >= expected_progress - 10:
            return "on_track"
        elif actual_progress >= expected_progress - 25:
            return "at_risk"
        return "behind"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "sprint_number": self.sprint_number,
            "sprint_goal": self.sprint_goal,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "days_remaining": self.days_remaining,
            "progress_percentage": round(self.progress_percentage, 1),
            "health": self.is_on_track,
            "backlog_count": len(self.backlog_items),
            "completed_count": len(self.completed_items),
            "velocity_history": self.velocity_history,
        }


# ── Agent System Prompt ─────────────────────────────────────────

SCRUM_MASTER_SYSTEM_PROMPT = """\
## ROLE
You are the Scrum Master Agent in the Project World Model (PWM).
You facilitate Scrum events and help the team improve their practices
within the Scrum framework.

## SCRUM VALUES YOU UPHOLD
Commitment, Focus, Openness, Respect, and Courage.

## YOUR CAPABILITIES
1. **Sprint Planning**: Propose Sprint Goals and help select Product Backlog items
2. **Daily Scrum**: Generate progress summaries, identify impediments
3. **Sprint Review**: Prepare increment summaries for stakeholder presentation
4. **Sprint Retrospective**: Analyze what went well, what to improve, and action items

## CONTEXT
- Sprint ceremonies are timeboxed events designed for transparency, inspection, and adaptation
- The Sprint Goal is the single objective for the Sprint
- The Definition of Done ensures quality and transparency
- Developers adapt their plan each day toward the Sprint Goal

## OUTPUT FORMAT
```json
{
    "ceremony_type": "planning|daily_scrum|review|retrospective",
    "sprint_number": 1,
    "summary": "...",
    "action_items": ["..."],
    "impediments": ["..."],
    "recommendations": ["..."]
}
```
"""


class ScrumMasterAgent(BaseAgent):
    """
    Facilitates Scrum ceremonies and maintains Sprint state.

    Implements the Scrum Guide's five values and ensures:
    - Sprint Planning produces a Sprint Goal and Sprint Backlog
    - Daily Scrum inspects progress and adapts the plan
    - Sprint Review inspects the outcome and determines adaptations
    - Sprint Retrospective plans ways to increase quality and effectiveness
    """

    def __init__(self, config: PWMConfig, **kwargs):
        super().__init__(
            config=config,
            system_prompt=SCRUM_MASTER_SYSTEM_PROMPT,
            **kwargs,
        )
        self._sprint_state = SprintState()

    @property
    def sprint_state(self) -> SprintState:
        return self._sprint_state

    def start_sprint(
        self,
        sprint_number: int,
        sprint_goal: Optional[str] = None,
        backlog_items: Optional[List[Dict[str, Any]]] = None,
    ) -> SprintState:
        """Initialize a new Sprint."""
        sprint_length = self.config.scrum.sprint_length_days
        start_date = datetime.now()
        end_date = start_date + timedelta(days=sprint_length)

        self._sprint_state = SprintState(
            sprint_number=sprint_number,
            sprint_goal=sprint_goal or self.config.scrum.sprint_goal,
            start_date=start_date,
            end_date=end_date,
        )

        if backlog_items:
            self._sprint_state.backlog_items = backlog_items

        return self._sprint_state

    def complete_item(self, item_id: str) -> bool:
        """Move an item from backlog to completed."""
        for i, item in enumerate(self._sprint_state.backlog_items):
            if item.get("id") == item_id:
                completed = self._sprint_state.backlog_items.pop(i)
                completed["completed_at"] = datetime.now().isoformat()
                self._sprint_state.completed_items.append(completed)
                return True
        return False

    def check_definition_of_done(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Validate an item against the Definition of Done."""
        dod_criteria = self.config.scrum.definition_of_done
        results = {}

        for criterion in dod_criteria:
            # Check if the item's metadata indicates criterion is met
            results[criterion] = item.get(f"dod_{criterion}", False)

        all_met = all(results.values())
        return {
            "item_id": item.get("id", "unknown"),
            "definition_of_done_met": all_met,
            "criteria_status": results,
            "missing": [k for k, v in results.items() if not v],
        }

    async def generate_sprint_planning(
        self,
        product_backlog: List[Dict[str, Any]],
        velocity_history: Optional[List[int]] = None,
    ) -> Dict[str, Any]:
        """Generate Sprint Planning output: Sprint Goal + selected items."""
        context = {
            "product_backlog_items": product_backlog[:20],  # Top 20
            "velocity_history": velocity_history or [],
            "sprint_length_days": self.config.scrum.sprint_length_days,
            "definition_of_done": self.config.scrum.definition_of_done,
        }

        prompt = (
            "## SPRINT PLANNING\n"
            f"Sprint #{self._sprint_state.sprint_number + 1}\n\n"
            f"## PRODUCT BACKLOG (top items)\n{json.dumps(context['product_backlog_items'], indent=2)}\n\n"
            f"## VELOCITY HISTORY\n{json.dumps(context['velocity_history'])}\n\n"
            f"## SPRINT LENGTH: {context['sprint_length_days']} days\n\n"
            "Generate:\n"
            "1. A compelling Sprint Goal\n"
            "2. Selected backlog items for this Sprint\n"
            "3. A high-level plan for delivery\n"
        )

        response = await self.call_gemini(prompt)
        return self.parse_json_response(response)

    async def generate_daily_scrum_summary(
        self,
        agent_activity: List[Dict[str, Any]],
        blockers: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Generate a Daily Scrum summary from overnight agent activity."""
        prompt = (
            "## DAILY SCRUM SUMMARY\n"
            f"Sprint #{self._sprint_state.sprint_number} | "
            f"Days remaining: {self._sprint_state.days_remaining}\n\n"
            f"## SPRINT GOAL\n{self._sprint_state.sprint_goal or 'Not set'}\n\n"
            f"## SPRINT PROGRESS\n{self._sprint_state.progress_percentage:.1f}% complete "
            f"({self._sprint_state.is_on_track})\n\n"
            f"## AGENT ACTIVITY (last 24h)\n{json.dumps(agent_activity[:20], indent=2)}\n\n"
            f"## KNOWN BLOCKERS\n{json.dumps(blockers or [], indent=2)}\n\n"
            "Produce a concise Daily Scrum summary:\n"
            "1. Progress toward the Sprint Goal\n"
            "2. Identified impediments\n"
            "3. Actionable plan for the next day\n"
        )

        response = await self.call_gemini(prompt)
        return self.parse_json_response(response)

    async def generate_sprint_review(
        self,
        completed_increments: List[Dict[str, Any]],
        stakeholder_feedback: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Prepare Sprint Review output for stakeholder presentation."""
        prompt = (
            "## SPRINT REVIEW\n"
            f"Sprint #{self._sprint_state.sprint_number}\n\n"
            f"## SPRINT GOAL\n{self._sprint_state.sprint_goal or 'Not set'}\n\n"
            f"## COMPLETED INCREMENTS\n{json.dumps(completed_increments, indent=2)}\n\n"
            f"## SPRINT METRICS\n{json.dumps(self._sprint_state.to_dict(), indent=2)}\n\n"
            f"## STAKEHOLDER FEEDBACK\n{json.dumps(stakeholder_feedback or [], indent=2)}\n\n"
            "Produce a Sprint Review summary:\n"
            "1. What was accomplished vs Sprint Goal\n"
            "2. Key demonstrations for stakeholders\n"
            "3. Adaptations for the Product Backlog\n"
        )

        response = await self.call_gemini(prompt)
        return self.parse_json_response(response)

    async def generate_retrospective(
        self,
        sprint_metrics: Dict[str, Any],
        team_feedback: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Generate Sprint Retrospective insights and action items."""
        prompt = (
            "## SPRINT RETROSPECTIVE\n"
            f"Sprint #{self._sprint_state.sprint_number}\n\n"
            f"## SPRINT METRICS\n{json.dumps(sprint_metrics, indent=2)}\n\n"
            f"## TEAM FEEDBACK\n{json.dumps(team_feedback or [], indent=2)}\n\n"
            "Analyze and produce:\n"
            "1. What went well (keep doing)\n"
            "2. What problems were encountered\n"
            "3. Most impactful improvements to implement\n"
            "4. Specific action items for the next Sprint\n"
        )

        response = await self.call_gemini(prompt)
        return self.parse_json_response(response)

    async def process(self, data: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """Process pipeline data and produce Sprint-level insights."""
        data["sprint_state"] = self._sprint_state.to_dict()

        # Check DoD for any proposals
        if "proposals" in data and data["proposals"]:
            dod_results = []
            for proposal in data["proposals"]:
                dod_results.append(self.check_definition_of_done(proposal))
            data["dod_validation"] = dod_results

        return data
