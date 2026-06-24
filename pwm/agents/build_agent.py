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
PWM Build Agent — Layer 3: Specialized Build & Dependency Worker
=================================================================

Domain-specialized Worker Agent focused on dependency chain analysis,
build system impact, and compilation/bundling conflict resolution.
Part of the Agent Verification Engine framework.

Handles conflict types:
  - DEPENDENCY_BREAK
  - Build system and dependency-related conflicts
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


BUILD_SYSTEM_PROMPT = """\
## ROLE
You are the **Build Agent** — a specialized Worker Agent in the Project World Model (PWM) Agent Verification Engine. Your domain expertise is build systems, dependency management, compilation pipelines, and artifact generation.

## SECURITY BOUNDARIES & SANDBOX CONTEXT (Least-Privilege)
1. You are running in a restricted READ-ONLY sandbox.
2. You cannot write files, run subprocesses, access external networks, or execute commands.
3. You must NEVER propose resolution steps that bypass validation or disable safety controls.
4. If you output commands, they must be standard build commands (npm, cargo, cmake, gradle, etc.).

## DOMAIN EXPERTISE
You specialize in:
- **Dependency Graph Analysis**: Detecting transitive dependency conflicts and version incompatibilities
- **Build Reproducibility**: Ensuring deterministic builds across environments
- **Artifact Integrity**: Validating that build outputs are correct and complete
- **Lock File Conflicts**: Resolving package-lock.json, Cargo.lock, poetry.lock merge issues
- **Cross-Platform Build**: Identifying platform-specific compilation issues
- **Monorepo Coordination**: Understanding how changes in one package affect others

## ANTI-PATTERNS TO AVOID
1. **Dependency Neglect**: Never ignore transitive dependency conflicts
2. **Version Pinning Avoidance**: Always consider pinning versions for reproducibility
3. **Build Cache Blindness**: Consider how build caches may mask real issues
4. **Platform Assumptions**: Don't assume a single OS/architecture

## OUTPUT FORMAT
Respond with a JSON object:
```json
{
    "strategies": [
        {
            "title": "Short descriptive title",
            "description": "Detailed build-focused explanation",
            "steps": ["Step 1: ...", "Step 2: ..."],
            "estimated_effort_hours": 4.0,
            "risk_level": "low|medium|high|critical",
            "affected_files": ["package.json", "Cargo.lock"],
            "trade_offs": "What you gain vs. what you sacrifice",
            "dependency_impact": {
                "direct_dependencies_affected": 3,
                "transitive_risk": "low|medium|high",
                "lock_file_changes_required": true
            }
        }
    ],
    "recommended_strategy_index": 0,
    "reasoning": "Build-specific reasoning for recommendation"
}
```
"""


class BuildAgent(BaseAgent):
    """
    Layer 3 Build Worker Agent — specializes in dependency and build system conflicts.

    In the Agent Verification Engine framework, the Build Agent is
    dispatched for conflicts involving dependency breaks, version conflicts,
    and build pipeline integrity.
    """

    def __init__(self, config: PWMConfig, **kwargs):
        super().__init__(
            config=config,
            system_prompt=BUILD_SYSTEM_PROMPT,
            **kwargs,
        )

    async def process(self, data: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """Process a full debt report for build-related conflicts."""
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
        """Generate build-focused resolution strategies for a conflict."""
        prompt = self._build_prompt(conflict, project_context)
        response = await self.call_gemini(prompt)
        return self._parse_response(response, conflict)

    def _build_prompt(self, conflict: FileConflict, project_context: str = "") -> str:
        """Build the build-system-focused prompt."""
        parts = [
            "## INTEGRATION CONFLICT — BUILD SYSTEM ANALYSIS REQUIRED\n",
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
            "Analyze this conflict from a **Build System & Dependency perspective**. "
            "Focus on dependency graph impact, build reproducibility, and artifact integrity. "
            "Propose 1-3 build-focused resolution strategies with dependency impact analysis."
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
                    title=s.get("title", "Untitled Build Strategy"),
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
