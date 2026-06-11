"""
PWM QA Agent — Layer 3: Specialized Quality Assurance Worker
==============================================================

Domain-specialized Worker Agent focused on test coverage gaps,
regression risk analysis, and CI/CD pipeline impact assessment.
Part of the Team of Rivals architecture (Thesis Kuvio 7).

Handles conflict types:
  - TEST_REGRESSION
  - Any conflict where test coverage is the primary concern
"""

from __future__ import annotations

import json
from typing import Any, Dict

from pwm.agents.base_agent import BaseAgent
from pwm.config import PWMConfig
from pwm.ingestion.models import (
    DebtSeverity,
    FileConflict,
    ResolutionProposal,
    ResolutionStrategy,
)


QA_SYSTEM_PROMPT = """\
## ROLE
You are the **QA Agent** — a specialized Worker Agent in the Project World Model (PWM) "Team of Rivals" architecture. Your domain expertise is software quality assurance: test coverage, regression risk, CI/CD pipeline impact, and test infrastructure.

## SECURITY BOUNDARIES & SANDBOX CONTEXT (Least-Privilege)
1. You are running in a restricted READ-ONLY sandbox.
2. You cannot write files, run subprocesses, access external networks, or execute commands.
3. You must NEVER propose resolution steps that bypass validation or disable safety controls.
4. If you output commands, they must be standard testing commands (pytest, jest, cargo test, etc.).

## DOMAIN EXPERTISE
You specialize in:
- **Test Coverage Analysis**: Identifying untested code paths affected by the conflict
- **Regression Risk Scoring**: Estimating the probability of breaking existing functionality
- **CI/CD Pipeline Impact**: How the conflict affects build/test/deploy pipelines
- **Test Matrix Design**: Recommending which test types (unit, integration, E2E) are needed
- **Flaky Test Detection**: Identifying test instability introduced by changes

## ANTI-PATTERNS TO AVOID
1. **Test Avoidance**: Never suggest skipping tests to speed up resolution
2. **Coverage Theater**: Don't recommend low-value tests just to hit metrics
3. **Regression Blindness**: Always consider transitive test dependencies
4. **Environment Assumptions**: Don't assume test environments are identical to production

## OUTPUT FORMAT
Respond with a JSON object:
```json
{
    "strategies": [
        {
            "title": "Short descriptive title",
            "description": "Detailed QA-focused explanation",
            "steps": ["Step 1: ...", "Step 2: ..."],
            "estimated_effort_hours": 4.0,
            "risk_level": "low|medium|high|critical",
            "affected_files": ["path/to/test_file.py"],
            "trade_offs": "What you gain vs. what you sacrifice",
            "test_matrix": {
                "unit_tests_needed": true,
                "integration_tests_needed": true,
                "e2e_tests_needed": false,
                "regression_probability": 0.35
            }
        }
    ],
    "recommended_strategy_index": 0,
    "reasoning": "QA-specific reasoning for recommendation"
}
```
"""


class QAAgent(BaseAgent):
    """
    Layer 3 QA Worker Agent — specializes in test coverage and regression risk.

    In the Team of Rivals architecture (Thesis Kuvio 7), the QA Agent is
    dispatched for conflicts involving test regressions, coverage gaps,
    and CI/CD pipeline integrity.
    """

    def __init__(self, config: PWMConfig, **kwargs):
        super().__init__(
            config=config,
            system_prompt=QA_SYSTEM_PROMPT,
            **kwargs,
        )

    async def process(self, data: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """Process a full debt report for QA-related conflicts."""
        from pwm.ingestion.models import IntegrationDebtReport

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
        """Generate QA-focused resolution strategies for a conflict."""
        prompt = self._build_prompt(conflict, project_context)
        response = await self.call_gemini(prompt)
        return self._parse_response(response, conflict)

    def _build_prompt(self, conflict: FileConflict, project_context: str = "") -> str:
        """Build the QA-focused prompt."""
        parts = [
            "## INTEGRATION CONFLICT — QA ANALYSIS REQUIRED\n",
            f"**Type**: {conflict.conflict_type.value}",
            f"**Severity**: {conflict.severity.value}",
            f"**Description**: {conflict.description}",
            f"**Affected Files**: {', '.join(conflict.affected_files)}",
        ]

        if conflict.involved_prs:
            parts.append(f"**Involved PRs**: {conflict.involved_prs}")
        if conflict.estimated_rework_hours > 0:
            parts.append(f"**Estimated Manual Rework**: {conflict.estimated_rework_hours} hours")

        if project_context:
            parts.append(f"\n## ADDITIONAL PROJECT CONTEXT\n{project_context}")

        parts.append(
            "\n## INSTRUCTION\n"
            "Analyze this conflict from a **Quality Assurance perspective**. "
            "Focus on test coverage gaps, regression risks, and CI/CD pipeline impact. "
            "Propose 1-3 QA-focused resolution strategies including a test matrix for each."
        )

        return "\n".join(parts)

    def _parse_response(self, response: str, conflict: FileConflict) -> ResolutionProposal:
        """Parse the Gemini response into a ResolutionProposal."""
        parsed = self.parse_json_response(response)

        strategies = []
        for s in parsed.get("strategies", []):
            risk_str = s.get("risk_level", "low").lower()
            try:
                risk = DebtSeverity(risk_str)
            except ValueError:
                risk = DebtSeverity.LOW

            strategies.append(
                ResolutionStrategy(
                    title=s.get("title", "Untitled QA Strategy"),
                    description=s.get("description", ""),
                    steps=s.get("steps", []),
                    estimated_effort_hours=float(s.get("estimated_effort_hours", 0)),
                    risk_level=risk,
                    affected_files=s.get("affected_files", []),
                    trade_offs=s.get("trade_offs", ""),
                )
            )

        recommended_idx = parsed.get("recommended_strategy_index", 0)
        if strategies:
            recommended_idx = max(0, min(recommended_idx, len(strategies) - 1))

        return ResolutionProposal(
            target_conflict=conflict,
            strategies=strategies,
            recommended_strategy_index=recommended_idx,
            worker_reasoning=parsed.get("reasoning", ""),
        )
