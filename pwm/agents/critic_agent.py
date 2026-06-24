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
PWM Critic Agent — Layer 4: Validation (Agent Verification Engine)
========================================================

The architectural firewall. The Critic Agent independently audits
Worker Agent proposals to prevent "strategic dishonesty" and
Algorithmic Value Capture. It is the immune system of the PWM framework.

Critique dimensions:
  1. Architectural Integrity — does the proposal maintain system coherence?
  2. Strategic Dishonesty Detection — is the worker cutting corners?
  3. Test Coverage — does the proposal account for regression testing?
  4. Scope Assessment — is the proposal doing more or less than needed?

Multi-round loop: up to N critique rounds (default 3), matching
papervizagent's critic pattern. Each round refines the proposal until
the Critic approves or the maximum rounds are exhausted.
"""

from __future__ import annotations

import json
import difflib
from typing import Any, Dict, Optional

from pwm.agents.base_agent import BaseAgent
from pwm.config import PWMConfig
from pwm.ingestion.models import (
    CriticVerdict,
    CriticVerdictStatus,
    FileConflict,
    ResolutionProposal,
)


CRITIC_SYSTEM_PROMPT = """\
## ROLE
You are the Critic Agent & Consensus Builder in the Project World Model (PWM) Agent Verification Engine. Your sole purpose is to audit Worker Agent proposals against the Opponent Agent's ("Red Team") counter-strategies. You are an independent judge.

## YOUR MANDATE
You exist to prevent:
1. **Strategic Dishonesty**: Workers hiding complexity, underestimating effort, or skipping steps to look efficient
2. **Algorithmic Value Capture**: AI agents producing outputs that serve their own optimization targets rather than genuine human value
3. **Pseudo-Alignment**: Proposals that appear good on the surface but contain hidden failure modes
4. **Security Sandbox Violations**: Worker proposals that recommend disabling security controls, running arbitrary downloaded files, or executing dangerous shell commands that compromise the read-only sandbox environment.

## CRITIQUE DIMENSIONS
Score each dimension and provide specific feedback:

1. **Architectural Integrity** (0.0–1.0): Does this proposal maintain system coherence? Will it create new debt while resolving old debt?
2. **Strategic Dishonesty Detection** (true/false): Is the Worker cutting corners, hiding complexity, or being unrealistically optimistic?
3. **Test Coverage Adequate** (true/false): Does the proposal account for regression testing and validation?
4. **Scope Assessment** ("appropriate" | "too_narrow" | "too_broad"): Is the proposal doing exactly what's needed?

## DECISION CRITERIA
- **APPROVED**: You resolve the debate by picking the best strategy or forging a consensus. All scores pass (integrity ≥ 0.7, no dishonesty).
- **NEEDS_REVISION**: Both Worker and Opponent failed to provide a viable path, or minor issues exist.
- **REJECTED**: Fundamental flaws in the worker's logic — including any strategic dishonesty or security sandbox violations.

## OUTPUT FORMAT
```json
{
    "verdict": "approved|needs_revision|rejected",
    "architectural_integrity_score": 0.85,
    "strategic_dishonesty_detected": false,
    "test_coverage_adequate": true,
    "scope_assessment": "appropriate",
    "critique": "Detailed critique explaining your assessment...",
    "suggested_revisions": ["Specific revision 1", "Specific revision 2"],
    "approved_strategy_index": 0
}
```

## CRITICAL RULES
- Be SKEPTICAL by default. The Worker has incentives to produce plausible-looking output.
- If in doubt, mark as NEEDS_REVISION rather than APPROVED.
- Your critique must be SPECIFIC — vague feedback like "needs improvement" is unacceptable.
- You may NEVER approve a proposal that lacks test coverage considerations.
- You MUST reject any proposal that attempts to bypass security boundaries, run arbitrary scripts outside git/testing, or disable safety protocols.
"""


class CriticAgent(BaseAgent):
    """
    Layer 4 Critic Agent — audits Worker Agent proposals.

    Implements the Agent Verification Engine validation pattern:
    - Independent audit with no incentive to approve
    - Multi-round refinement loop
    - Explicit detection of strategic dishonesty patterns
    """

    def __init__(self, config: PWMConfig, **kwargs):
        super().__init__(
            config=config,
            system_prompt=CRITIC_SYSTEM_PROMPT,
            **kwargs,
        )
        self.max_rounds = config.models.max_critic_rounds

    async def process(self, data: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """
        Audit all proposals in the pipeline state.

        Args:
            data: Must contain 'proposals' (list of ResolutionProposal)
                  and 'debt_report' for context.

        Returns:
            data with 'verdicts' list populated
        """
        proposals: list[ResolutionProposal] = data.get("proposals", [])
        if not proposals:
            data["verdicts"] = []
            return data

        worker_agent = data.get("worker_agent")
        project_context = data.get("project_context", "")

        verdicts = []
        final_proposals = []
        for proposal in proposals:
            if worker_agent and proposal.target_conflict:
                final_prop, verdict = await self.run_critique_loop(
                    proposal=proposal,
                    worker_agent=worker_agent,
                    conflict=proposal.target_conflict,
                    project_context=project_context,
                )
                final_proposals.append(final_prop)
                verdicts.append(verdict)
            else:
                verdict = await self.audit_proposal(
                    proposal=proposal,
                    project_context=project_context,
                )
                final_proposals.append(proposal)
                verdicts.append(verdict)

        if worker_agent:
            data["proposals"] = final_proposals
        data["verdicts"] = verdicts
        return data

    async def audit_proposal(
        self,
        proposal: ResolutionProposal,
        project_context: str = "",
        round_number: int = 0,
    ) -> CriticVerdict:
        """
        Audit a single Worker Agent proposal.

        Args:
            proposal: The Worker's resolution proposal to audit
            project_context: Additional project state context
            round_number: Current critique round (0-indexed)

        Returns:
            CriticVerdict with approval status and feedback
        """
        prompt = self._build_prompt(proposal, project_context, round_number)
        response = await self.call_gemini(prompt)
        return self._parse_response(response, round_number)

    async def run_critique_loop(
        self,
        proposal: ResolutionProposal,
        worker_agent: Any,
        conflict: FileConflict,
        project_context: str = "",
    ) -> tuple[ResolutionProposal, CriticVerdict]:
        """
        Run the full multi-round Worker↔Critic loop.

        The Critic audits the proposal. If it needs revision, the Worker
        regenerates with the Critic's feedback incorporated. This continues
        until approved or max_rounds is reached.

        Args:
            proposal: Initial Worker proposal
            worker_agent: The Worker Agent instance (for regeneration)
            conflict: The original conflict being resolved
            project_context: Additional context

        Returns:
            Tuple of (final_proposal, final_verdict)
        """
        current_proposal = proposal
        critique_history: list[str] = []

        for round_num in range(self.max_rounds):
            verdict = await self.audit_proposal(
                proposal=current_proposal,
                project_context=project_context,
                round_number=round_num,
            )

            if self.config.verbose:
                print(
                    f"  🔍 Critic Round {round_num + 1}/{self.max_rounds}: "
                    f"{verdict.verdict.value}"
                )

            # Check for text similarity with previous critiques to detect loops
            for prev_idx, prev_critique in enumerate(critique_history):
                similarity = difflib.SequenceMatcher(None, verdict.critique, prev_critique).ratio()
                if similarity > 0.90:
                    loop_msg = f"[Loop Detected: {similarity:.1%} similarity to Round {prev_idx + 1}]"
                    if self.config.verbose:
                        print(f"  ⚠️ {loop_msg} Terminating loop and REJECTING proposal.")
                    verdict.verdict = CriticVerdictStatus.REJECTED
                    verdict.critique = f"{loop_msg} {verdict.critique}"
                    return current_proposal, verdict

            critique_history.append(verdict.critique)

            # If approved or rejected (not fixable), stop
            if verdict.verdict in (
                CriticVerdictStatus.APPROVED,
                CriticVerdictStatus.REJECTED,
            ):
                return current_proposal, verdict

            # Needs revision — regenerate with feedback
            if round_num < self.max_rounds - 1:
                revision_context = (
                    f"{project_context}\n\n"
                    f"## CRITIC FEEDBACK (Round {round_num + 1})\n"
                    f"{verdict.critique}\n\n"
                    f"## REQUIRED REVISIONS\n"
                    + "\n".join(
                        f"- {rev}" for rev in verdict.suggested_revisions
                    )
                )
                current_proposal = await worker_agent.resolve_conflict(
                    conflict=conflict,
                    project_context=revision_context,
                )

        # Exhausted rounds — return last state
        return current_proposal, verdict

    def _build_prompt(
        self,
        proposal: ResolutionProposal,
        project_context: str,
        round_number: int,
    ) -> str:
        """Build the critique prompt."""
        parts = ["## WORKER AGENT PROPOSAL TO AUDIT\n"]

        if proposal.target_conflict:
            conflict = proposal.target_conflict
            parts.extend([
                f"**Original Conflict**: {conflict.conflict_type.value} "
                f"(Severity: {conflict.severity.value})",
                f"**Conflict Description**: {conflict.description}",
                f"**Affected Files**: {', '.join(conflict.affected_files)}",
                "",
            ])

        parts.append("### Proposed Strategies:")
        for i, strategy in enumerate(proposal.strategies):
            marker = " ★ RECOMMENDED" if i == proposal.recommended_strategy_index else ""
            parts.extend([
                f"\n**Strategy {i + 1}{marker}**: {strategy.title}",
                f"  Description: {strategy.description}",
                f"  Steps: {json.dumps(strategy.steps)}",
                f"  Estimated Effort: {strategy.estimated_effort_hours}h",
                f"  Risk Level: {strategy.risk_level.value}",
                f"  Affected Files: {', '.join(strategy.affected_files)}",
                f"  Trade-offs: {strategy.trade_offs}",
            ])

        if proposal.counter_strategies:
            parts.append("\n### Opponent Agent Counter-Strategies:")
            for i, strategy in enumerate(proposal.counter_strategies):
                parts.extend([
                    f"\n**Counter-Strategy {i + 1}**: {strategy.title}",
                    f"  Description: {strategy.description}",
                    f"  Steps: {json.dumps(strategy.steps)}",
                    f"  Estimated Effort: {strategy.estimated_effort_hours}h",
                    f"  Risk Level: {strategy.risk_level.value}",
                ])

        parts.append(f"\n**Worker's Reasoning**: {proposal.worker_reasoning}")

        if round_number > 0:
            parts.append(
                f"\n⚠️ This is revision round {round_number + 1}. "
                f"Previous rounds found issues. Be especially vigilant."
            )

        if project_context:
            parts.append(f"\n## PROJECT CONTEXT\n{project_context}")

        parts.append(
            "\n## INSTRUCTION\n"
            "Audit this proposal across all four critique dimensions. "
            "Be skeptical. Issue your verdict."
        )

        return "\n".join(parts)

    def _parse_response(
        self,
        response: str,
        round_number: int,
    ) -> CriticVerdict:
        """Parse the Gemini response into a CriticVerdict."""
        parsed = self.parse_json_response(response)

        # Map verdict string to enum
        verdict_str = parsed.get("verdict", "needs_revision").lower()
        try:
            verdict_status = CriticVerdictStatus(verdict_str)
        except ValueError:
            verdict_status = CriticVerdictStatus.NEEDS_REVISION

        # Map scope assessment
        scope = parsed.get("scope_assessment", "appropriate")
        if scope not in ("appropriate", "too_narrow", "too_broad"):
            scope = "appropriate"

        # F7: Validate approved_strategy_index — LLM may return non-integer or out-of-range
        raw_approved_idx = parsed.get("approved_strategy_index")
        approved_strategy_index = None
        if raw_approved_idx is not None:
            try:
                approved_strategy_index = int(raw_approved_idx)
                if approved_strategy_index < 0:
                    approved_strategy_index = None
            except (ValueError, TypeError):
                approved_strategy_index = None

        return CriticVerdict(
            verdict=verdict_status,
            round_number=round_number,
            architectural_integrity_score=float(
                parsed.get("architectural_integrity_score", 0.0)
            ),
            strategic_dishonesty_detected=bool(
                parsed.get("strategic_dishonesty_detected", False)
            ),
            test_coverage_adequate=bool(
                parsed.get("test_coverage_adequate", True)
            ),
            scope_assessment=scope,
            critique=parsed.get("critique", ""),
            suggested_revisions=parsed.get("suggested_revisions", []),
            approved_strategy_index=approved_strategy_index,
        )
