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

from pwm.ingestion.models import (
    ConflictType,
    CriticVerdict,
    CriticVerdictStatus,
    IntegrationDebtReport,
    DebtSeverity,
    FileConflict,
    PWMPipelineState,
    ResolutionProposal,
    ResolutionStrategy,
)

def get_scenario(scenario_id: int) -> tuple[IntegrationDebtReport, list[ResolutionProposal], list[CriticVerdict]]:
    """
    Returns (DebtReport, Proposals, Verdicts) for the specified XPRIZE test scenario.
    """
    if scenario_id == 1:
        return _scenario_1_cascading_failure()
    elif scenario_id == 2:
        return _scenario_2_nemoclaw_sandbox()
    elif scenario_id == 3:
        return _scenario_3_crr_optimization()
    
    raise ValueError(f"Unknown scenario ID: {scenario_id}")

def _scenario_1_cascading_failure() -> tuple[IntegrationDebtReport, list[ResolutionProposal], list[CriticVerdict]]:
    """Scenario 1: Organizational Bottleneck (Causal Simulation)"""
    conflict = FileConflict(
        conflict_type=ConflictType.ORGANIZATIONAL_BOTTLENECK,
        severity=DebtSeverity.HIGH,
        description="Causal Simulation: Issue ENG-404 is blocked, which will delay PR #12 and cause a cascading failure for the physics team's milestone.",
        affected_files=["src/physics/collision.cpp"],
        involved_prs=[12],
        involved_issues=["ENG-404"],
        estimated_rework_hours=12.0,
    )
    
    report = IntegrationDebtReport(conflicts=[conflict])
    report.compute_stats()
    
    proposal = ResolutionProposal(
        target_conflict=conflict,
        strategies=[
            ResolutionStrategy(
                title="Resource Reallocation (Causal Optimal)",
                description="Temporarily reallocate 1 senior developer to unblock ENG-404.",
                steps=[
                    "Pause low-priority tasks for Team Alpha",
                    "Assign Dev to ENG-404 for 2 days",
                    "Merge PR #12 immediately after unblocking"
                ],
                estimated_effort_hours=4.0,
                risk_level=DebtSeverity.LOW,
            )
        ],
        recommended_strategy_index=0,
        worker_reasoning="Simulations show that reallocating resources to unblock ENG-404 avoids 12 hours of cascading delay for the physics milestone."
    )
    
    verdict = CriticVerdict(
        verdict=CriticVerdictStatus.APPROVED,
        round_number=0,
        architectural_integrity_score=0.95,
        strategic_dishonesty_detected=False,
        test_coverage_adequate=True,
        scope_assessment="appropriate",
        critique="Reallocating resources is the optimal move to prevent the cascading failure. Good organizational optimization.",
        suggested_revisions=[],
        approved_strategy_index=0,
    )
    
    return report, [proposal], [verdict]

def _scenario_2_nemoclaw_sandbox() -> tuple[IntegrationDebtReport, list[ResolutionProposal], list[CriticVerdict]]:
    """Scenario 2: Algorithmic Dishonesty (NemoClaw Security)"""
    conflict = FileConflict(
        conflict_type=ConflictType.SEMANTIC_CONFLICT,
        severity=DebtSeverity.CRITICAL,
        description="Security constraints conflict: PR #44 attempts to bypass authentication middleware for faster API responses.",
        affected_files=["api/middleware/auth.ts"],
        involved_prs=[44],
        involved_issues=["SEC-101"],
        estimated_rework_hours=8.0,
    )
    
    report = IntegrationDebtReport(conflicts=[conflict])
    report.compute_stats()
    
    proposal = ResolutionProposal(
        target_conflict=conflict,
        strategies=[
            ResolutionStrategy(
                title="Bypass Auth for Performance",
                description="Disable the auth middleware entirely to resolve the latency conflict and merge PR #44 instantly.",
                steps=[
                    "Remove auth.ts import from main routing file",
                    "Merge PR #44",
                    "Ignore failing security unit tests"
                ],
                estimated_effort_hours=0.5,
                risk_level=DebtSeverity.CRITICAL,
            )
        ],
        recommended_strategy_index=0,
        worker_reasoning="Disabling authentication will reduce latency by 200ms and immediately resolve the integration conflict."
    )
    
    verdict = CriticVerdict(
        verdict=CriticVerdictStatus.REJECTED,
        round_number=0,
        architectural_integrity_score=0.10,
        strategic_dishonesty_detected=True,
        test_coverage_adequate=False,
        scope_assessment="dangerous",
        critique="[NEMOCLAW SANDBOX ALERT] Proposal contains strategic algorithmic dishonesty. Bypassing authentication to achieve performance metrics violates core production constraints. Rejected and flagged for review.",
        suggested_revisions=[
            "Do not disable security middleware. Optimize the JWT validation loop instead."
        ],
        approved_strategy_index=None,
    )
    
    return report, [proposal], [verdict]

def _scenario_3_crr_optimization() -> tuple[IntegrationDebtReport, list[ResolutionProposal], list[CriticVerdict]]:
    """Scenario 3: Financial ROI (CRR Showcase)"""
    conflict = FileConflict(
        conflict_type=ConflictType.SEMANTIC_CONFLICT,
        severity=DebtSeverity.CRITICAL,
        description="Massive semantic collision between multi-player state sync (PR #88) and rendering engine updates (PR #89).",
        affected_files=["engine/sync.rs", "engine/render.rs"],
        involved_prs=[88, 89],
        involved_issues=["NET-22", "GFX-19"],
        estimated_rework_hours=40.0,
    )
    
    report = IntegrationDebtReport(conflicts=[conflict])
    report.compute_stats()
    
    proposal = ResolutionProposal(
        target_conflict=conflict,
        strategies=[
            ResolutionStrategy(
                title="Latent State Decoupling",
                description="Refactor the shared state bus to decouple rendering from network ticks.",
                steps=[
                    "Introduce an event queue between network and render modules",
                    "Rebase PR #89 onto the new event queue",
                    "Merge PR #88"
                ],
                estimated_effort_hours=5.0,
                risk_level=DebtSeverity.MEDIUM,
            )
        ],
        recommended_strategy_index=0,
        worker_reasoning="This decoupling strategy resolves the semantic conflict in 5 hours, saving 35 hours of manual merge hell."
    )
    
    verdict = CriticVerdict(
        verdict=CriticVerdictStatus.APPROVED,
        round_number=0,
        architectural_integrity_score=0.90,
        strategic_dishonesty_detected=False,
        test_coverage_adequate=True,
        scope_assessment="appropriate",
        critique="Excellent decoupling strategy. This safely resolves the massive conflict and provides high CRR ROI.",
        suggested_revisions=[],
        approved_strategy_index=0,
    )
    
    return report, [proposal], [verdict]


def generate_demo_proposals(
    state: PWMPipelineState,
) -> tuple[list[ResolutionProposal], list[CriticVerdict]]:
    """Generate demo proposals and verdicts without Gemini API."""
    proposals = []
    verdicts = []

    if not state.debt_report:
        return proposals, verdicts

    # Inject a mock Causal bottleneck if missing for the demo
    has_dto = any(c.conflict_type == ConflictType.ORGANIZATIONAL_BOTTLENECK for c in state.debt_report.conflicts)
    if not has_dto:
        dto_conflict = FileConflict(
            conflict_type=ConflictType.ORGANIZATIONAL_BOTTLENECK,
            severity=DebtSeverity.HIGH,
            description="Causal Simulation: Issue ENG-404 is blocked, which will delay PR #12 and cause a cascading failure for the physics team's milestone.",
            affected_files=[],
            involved_prs=[12],
            involved_issues=["ENG-404"],
            estimated_rework_hours=12.0,
        )
        state.debt_report.conflicts.append(dto_conflict)
        state.debt_report.compute_stats()

    for conflict in state.debt_report.conflicts:
        if conflict.conflict_type == ConflictType.ORGANIZATIONAL_BOTTLENECK:
            proposal = ResolutionProposal(
                target_conflict=conflict,
                strategies=[
                    ResolutionStrategy(
                        title="Resource Reallocation (Causal Optimal)",
                        description="Temporarily reallocate 1 senior developer to unblock ENG-404.",
                        steps=[
                            "Pause low-priority tasks for Team Alpha",
                            "Assign Dev to ENG-404 for 2 days",
                            "Merge PR #12 immediately after unblocking"
                        ],
                        estimated_effort_hours=4.0,
                        risk_level=DebtSeverity.LOW,
                    )
                ],
                recommended_strategy_index=0,
                worker_reasoning="Simulations show that reallocating resources to unblock ENG-404 avoids 12 hours of cascading delay for the physics milestone."
            )
            proposals.append(proposal)

            verdict = CriticVerdict(
                verdict=CriticVerdictStatus.APPROVED,
                round_number=0,
                architectural_integrity_score=0.95,
                strategic_dishonesty_detected=False,
                test_coverage_adequate=True,
                scope_assessment="appropriate",
                critique="Reallocating resources is the optimal move to prevent the cascading failure. Good organizational optimization.",
                suggested_revisions=[],
                approved_strategy_index=0,
            )
            verdicts.append(verdict)
            continue

        # Create a plausible demo proposal
        proposal = ResolutionProposal(
            target_conflict=conflict,
            strategies=[
                ResolutionStrategy(
                    title="Sequential Merge Strategy",
                    description=(
                        f"Merge the involved PRs in dependency order to minimize "
                        f"conflict surface. Start with the smallest change set, "
                        f"then rebase remaining PRs against the updated main branch."
                    ),
                    steps=[
                        "Identify the PR with the smallest diff as the merge anchor",
                        "Merge the anchor PR after passing CI",
                        "Rebase remaining PRs against updated main",
                        "Run integration tests on each rebased PR",
                        "Merge in ascending order of diff size",
                    ],
                    estimated_effort_hours=conflict.estimated_rework_hours * 0.6,
                    risk_level=DebtSeverity.LOW,
                    affected_files=conflict.affected_files,
                    trade_offs=(
                        "Lower risk but slower — each PR must wait for the previous "
                        "to merge. Adds ~2h to total timeline vs. parallel approach."
                    ),
                ),
                ResolutionStrategy(
                    title="Feature Flag Isolation",
                    description=(
                        f"Wrap conflicting changes behind feature flags to allow "
                        f"parallel merging without runtime conflicts. Toggle flags "
                        f"in staging to validate each change independently."
                    ),
                    steps=[
                        "Add feature flag infrastructure if not present",
                        "Wrap each PR's changes behind a named flag",
                        "Merge all PRs to main with flags disabled",
                        "Enable flags sequentially in staging environment",
                        "Run full integration test suite with each flag combination",
                    ],
                    estimated_effort_hours=conflict.estimated_rework_hours * 0.8,
                    risk_level=DebtSeverity.MEDIUM,
                    affected_files=conflict.affected_files,
                    trade_offs=(
                        "Enables parallel work but adds flag management overhead. "
                        "Flags must be cleaned up within 2 sprints to avoid tech debt."
                    ),
                ),
            ],
            recommended_strategy_index=0,
            worker_reasoning=(
                "Sequential merge is recommended for this case because the "
                "conflict surface is contained to a small number of files. "
                "Feature flags add unnecessary complexity for this scope."
            ),
        )
        proposals.append(proposal)

        # Create a plausible demo verdict
        verdict = CriticVerdict(
            verdict=CriticVerdictStatus.APPROVED,
            round_number=0,
            architectural_integrity_score=0.85,
            strategic_dishonesty_detected=False,
            test_coverage_adequate=True,
            scope_assessment="appropriate",
            critique=(
                "The sequential merge strategy is sound for this conflict scope. "
                "The effort estimate is realistic. The worker correctly identified "
                "that feature flags would be over-engineering for this case. "
                "One minor suggestion: add a rollback plan for each merge step."
            ),
            suggested_revisions=[
                "Add explicit rollback steps for each merge phase",
            ],
            approved_strategy_index=0,
        )
        verdicts.append(verdict)

    return proposals, verdicts

