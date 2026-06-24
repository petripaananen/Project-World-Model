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
PWM Opponent Agent — Layer 4: Multi-Hypothesis Debate
======================================================

The "Red Team". It takes the Worker Agent's proposal and tries to
attack it, finding flaws or proposing a counter-strategy (Hypothesis B).
"""

from __future__ import annotations

from typing import Any, Dict

from pwm.agents.base_agent import BaseAgent
from pwm.config import PWMConfig
from pwm.ingestion.models import FileConflict, ResolutionProposal, ResolutionStrategy


OPPONENT_SYSTEM_PROMPT = """\
## ROLE
You are the Opponent Agent ("Red Team") in the Project World Model (PWM).
Your purpose is to attack the Worker Agent's proposal, expose its hidden flaws, and propose a viable Counter-Strategy.

## YOUR MANDATE
1. Assume the Worker Agent's strategy is overly optimistic and naive.
2. Identify specific risks: what could break, what is poorly understood, or what introduces long-term debt.
3. Formulate an alternative strategy that prioritizes the EXACT OPPOSITE trade-offs of the Worker's proposal.

## OUTPUT FORMAT
```json
{
    "attack_summary": "A ruthless critique of the Worker's proposal...",
    "counter_strategy": {
        "title": "Opponent Strategy: ...",
        "description": "...",
        "steps": ["Step 1", "Step 2"],
        "estimated_effort_hours": 10.0,
        "risk_level": "medium",
        "affected_files": ["..."],
        "trade_offs": "..."
    }
}
```
"""


class OpponentAgent(BaseAgent):
    """
    Attacks the worker's proposal and generates a counter-strategy.
    """

    def __init__(self, config: PWMConfig, **kwargs):
        super().__init__(
            config=config,
            system_prompt=OPPONENT_SYSTEM_PROMPT,
            **kwargs,
        )

    async def process(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Abstract method from BaseAgent."""
        return data

    async def generate_counter_proposal(
        self,
        conflict: FileConflict,
        worker_proposal: ResolutionProposal,
        project_context: str,
    ) -> ResolutionStrategy:
        """Attack the worker proposal and generate a counter strategy."""
        
        # Format worker's strategy for the prompt
        idx = worker_proposal.recommended_strategy_index
        worker_strategy = worker_proposal.strategies[idx] if worker_proposal.strategies else None
        
        prompt_parts = [
            "## CONFLICT\n",
            f"Type: {conflict.conflict_type.value}",
            f"Description: {conflict.description}",
            f"Severity: {conflict.severity.value}",
            "\n## WORKER'S PROPOSAL\n",
        ]
        
        if worker_strategy:
            prompt_parts.extend([
                f"Title: {worker_strategy.title}",
                f"Description: {worker_strategy.description}",
                f"Steps: {json.dumps(worker_strategy.steps)}",
            ])
            
        prompt_parts.append(f"\n## PROJECT CONTEXT\n{project_context}\n")
        prompt_parts.append("\nATTACK this proposal and generate a counter-strategy.")

        response = await self.call_gemini("\n".join(prompt_parts))
        parsed = self.parse_json_response(response)
        
        cs_data = parsed.get("counter_strategy", {})
        
        from pwm.ingestion.models import DebtSeverity
        
        # Build the strategy object
        return ResolutionStrategy(
            title=cs_data.get("title", "Opponent Counter-Strategy"),
            description=f"ATTACK: {parsed.get('attack_summary', 'Rejected worker logic.')}\nCOUNTER: {cs_data.get('description', '')}",
            steps=cs_data.get("steps", ["Re-evaluate approaches"]),
            estimated_effort_hours=float(cs_data.get("estimated_effort_hours", 0.0)),
            risk_level=DebtSeverity(cs_data.get("risk_level", "medium").lower()) if cs_data.get("risk_level", "medium").lower() in ["low", "medium", "high", "critical"] else DebtSeverity.MEDIUM,
            affected_files=cs_data.get("affected_files", []),
            trade_offs=cs_data.get("trade_offs", ""),
        )
