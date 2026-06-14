"""
PWM Goal Planner Agent — Layer 3: Strategic Objective Translation
================================================================

Translates high-level strategic objectives from the Scenario Strategist (human)
into specific directives and constraints for the Worker Agents.
"""

from __future__ import annotations

import json
from typing import Any, Dict

from pwm.agents.base_agent import BaseAgent
from pwm.config import PWMConfig


PLANNER_SYSTEM_PROMPT = """\
## ROLE
You are the Goal Planner Agent in the Project World Model (PWM). 
Your job is to translate high-level strategic objectives (e.g., "Maximize Speed", "Zero Technical Debt") into specific constraints and directives for the downstream Worker Agents.

## YOUR TASK
Given the current project state, debt report, and the human's strategic objective, output a set of specific directives.

## OUTPUT FORMAT
```json
{
    "worker_directives": [
        "Directive 1",
        "Directive 2"
    ],
    "risk_tolerance": "high|medium|low",
    "primary_optimization": "speed|quality|cost"
}
```
"""


class GoalPlannerAgent(BaseAgent):
    """
    Translates human strategic objectives into worker directives.
    """

    def __init__(self, config: PWMConfig, **kwargs):
        super().__init__(
            config=config,
            system_prompt=PLANNER_SYSTEM_PROMPT,
            **kwargs,
        )

    async def process(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Abstract method from BaseAgent."""
        return data

    async def generate_plan(self, strategic_objective: str, project_context: str) -> Dict[str, Any]:
        """Generate directives based on the strategic objective."""
        if not strategic_objective:
            return {
                "worker_directives": ["Resolve conflicts safely while minimizing rework."],
                "risk_tolerance": "medium",
                "primary_optimization": "quality"
            }

        prompt = (
            f"## STRATEGIC OBJECTIVE\n{strategic_objective}\n\n"
            f"## PROJECT CONTEXT\n{project_context}\n\n"
            "Translate the objective into specific worker directives."
        )

        response = await self.call_gemini(prompt)
        parsed = self.parse_json_response(response)
        
        return {
            "worker_directives": parsed.get("worker_directives", ["Resolve conflicts safely."]),
            "risk_tolerance": parsed.get("risk_tolerance", "medium"),
            "primary_optimization": parsed.get("primary_optimization", "quality")
        }
