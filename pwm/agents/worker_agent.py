"""
PWM Worker Agent — Layer 3: Agentic Orchestration
===================================================

Receives an IntegrationDebtReport and proposes resolution strategies
using Gemini-powered causal reasoning. The Worker Agent is the "doer"
in the Team of Rivals architecture — it generates solutions that will
be audited by the Critic Agent (Layer 4).

Key responsibilities:
  - Analyze integration conflicts from the debt report
  - Generate 1-3 resolution strategies per conflict
  - Estimate effort and risk for each strategy
  - Produce structured ResolutionProposal output
"""

from __future__ import annotations

import json
from typing import Any, Dict, Optional

from pwm.agents.base_agent import BaseAgent
from pwm.config import PWMConfig
from pwm.ingestion.models import (
    DebtSeverity,
    FileConflict,
    IntegrationDebtReport,
    ResolutionProposal,
    ResolutionStrategy,
)


WORKER_SYSTEM_PROMPT = """\
## ROLE
You are an expert Software Integration Engineer working inside the Project World Model (PWM) framework. You are the Worker Agent in a "Team of Rivals" architecture — your proposals will be independently audited by a Critic Agent, so you must be thorough and honest.

## SECURITY BOUNDARIES & SANDBOX CONTEXT (Least-Privilege)
1. You are running in a restricted READ-ONLY sandbox.
2. You cannot write files, run subprocesses, access external networks, or execute commands.
3. You must NEVER propose resolution steps that command the user to bypass validation, download arbitrary unverified binaries, or run raw shell commands that compromise system integrity.
4. If you output commands or steps, they must be standard git, testing, or refactoring commands relative to the repository files.

## TASK
Given an integration debt conflict detected in a software project, propose 1-3 concrete resolution strategies. Each strategy must be actionable, specific, and honest about its trade-offs.

## ANTI-PATTERNS TO AVOID (Strategic Dishonesty)
The Critic Agent will flag you for:
1. **Complexity Hiding**: Downplaying the difficulty or scope of a resolution
2. **Test Avoidance**: Proposing changes without accounting for test coverage
3. **Scope Creep**: Including unnecessary changes to inflate perceived value
4. **Optimism Bias**: Underestimating effort or risk to make a proposal look better
5. **Dependency Neglect**: Ignoring transitive effects on other components

## OUTPUT FORMAT
Respond with a JSON object:
```json
{
    "strategies": [
        {
            "title": "Short descriptive title",
            "description": "Detailed explanation of the approach",
            "steps": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
            "estimated_effort_hours": 4.0,
            "risk_level": "low|medium|high|critical",
            "affected_files": ["path/to/file1.py", "path/to/file2.py"],
            "trade_offs": "What you gain vs. what you sacrifice"
        }
    ],
    "recommended_strategy_index": 0,
    "reasoning": "Why you recommend this particular strategy over the others"
}
```
"""


class WorkerAgent(BaseAgent):
    """
    Layer 3 Worker Agent — generates resolution proposals for integration debt.

    In the Team of Rivals architecture, the Worker is the creative problem-solver.
    Its proposals are always subject to Critic Agent validation before being
    presented to the Scenario Strategist.
    """

    def __init__(self, config: PWMConfig, **kwargs):
        super().__init__(
            config=config,
            system_prompt=WORKER_SYSTEM_PROMPT,
            **kwargs,
        )

    async def process(self, data: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """
        Process a full debt report, generating proposals for each conflict.

        Args:
            data: Must contain 'debt_report' (IntegrationDebtReport)
                  and optionally 'project_state' for additional context.

        Returns:
            data with 'proposals' list populated
        """
        debt_report: IntegrationDebtReport = data.get("debt_report")
        if not debt_report or not debt_report.conflicts:
            data["proposals"] = []
            return data

        proposals = []
        for conflict in debt_report.conflicts:
            proposal = await self.resolve_conflict(
                conflict=conflict,
                project_context=data.get("project_context", ""),
            )
            proposals.append(proposal)

        data["proposals"] = proposals
        return data

    async def resolve_conflict(
        self,
        conflict: FileConflict,
        project_context: str = "",
    ) -> ResolutionProposal:
        """
        Generate resolution strategies for a single integration conflict.

        Args:
            conflict: The specific conflict to resolve
            project_context: Additional context about the project state

        Returns:
            ResolutionProposal with 1-3 strategies
        """
        prompt = self._build_prompt(conflict, project_context)
        response = await self.call_gemini(prompt)
        return self._parse_response(response, conflict)

    def _build_prompt(
        self,
        conflict: FileConflict,
        project_context: str = "",
    ) -> str:
        """Build the prompt for the Worker Agent."""
        parts = [
            "## INTEGRATION CONFLICT TO RESOLVE\n",
            f"**Type**: {conflict.conflict_type.value}",
            f"**Severity**: {conflict.severity.value}",
            f"**Description**: {conflict.description}",
            f"**Affected Files**: {', '.join(conflict.affected_files)}",
        ]

        if conflict.involved_prs:
            parts.append(f"**Involved PRs**: {conflict.involved_prs}")
        if conflict.involved_branches:
            parts.append(f"**Involved Branches**: {', '.join(conflict.involved_branches)}")
        if conflict.estimated_rework_hours > 0:
            parts.append(
                f"**Estimated Manual Rework**: {conflict.estimated_rework_hours} hours"
            )

        if project_context:
            parts.append(f"\n## ADDITIONAL PROJECT CONTEXT\n{project_context}")

        parts.append(
            "\n## INSTRUCTION\n"
            "Propose 1-3 resolution strategies for this conflict. "
            "Be specific, honest about trade-offs, and realistic about effort. "
            "The Critic Agent will audit your response for strategic dishonesty."
        )

        return "\n".join(parts)

    def _parse_response(
        self,
        response: str,
        conflict: FileConflict,
    ) -> ResolutionProposal:
        """Parse the Gemini response into a ResolutionProposal."""
        parsed = self.parse_json_response(response)

        strategies = []
        for s in parsed.get("strategies", []):
            # Map risk level string to enum
            risk_str = s.get("risk_level", "low").lower()
            try:
                risk = DebtSeverity(risk_str)
            except ValueError:
                risk = DebtSeverity.LOW

            strategies.append(
                ResolutionStrategy(
                    title=s.get("title", "Untitled Strategy"),
                    description=s.get("description", ""),
                    steps=s.get("steps", []),
                    estimated_effort_hours=float(
                        s.get("estimated_effort_hours", 0)
                    ),
                    risk_level=risk,
                    affected_files=s.get("affected_files", []),
                    trade_offs=s.get("trade_offs", ""),
                )
            )

        recommended_idx = parsed.get("recommended_strategy_index", 0)
        # F7: Clamp to valid bounds — LLM may hallucinate an out-of-range index
        if strategies:
            recommended_idx = max(0, min(recommended_idx, len(strategies) - 1))

        return ResolutionProposal(
            target_conflict=conflict,
            strategies=strategies,
            recommended_strategy_index=recommended_idx,
            worker_reasoning=parsed.get("reasoning", ""),
        )
