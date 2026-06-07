"""
PWM Debt Detector — Layer 2: Integration Debt Pattern Detection
================================================================

Analyzes a ProjectState snapshot to identify integration debt patterns.
This is the "brain" of Layer 2 — it finds conflicts that would cause
integration failures if left unresolved.

Detection patterns:
  1. File Collisions — multiple PRs modifying the same files
  2. Branch Divergence — branches that have drifted far from main
  3. Dependency Breaks — changes that could break transitive dependencies
  4. Semantic Conflicts — logically incompatible changes (Gemini-powered)
"""

from __future__ import annotations

from typing import Optional

from pwm.config import PWMConfig
from pwm.ingestion.models import (
    BranchInfo,
    ConflictType,
    DebtSeverity,
    FileConflict,
    IntegrationDebtReport,
    ProjectState,
    SprintState,
)


class DebtDetector:
    """
    Layer 2 integration debt detection engine.

    Operates in two modes:
      - Deterministic: File collisions, branch divergence (no LLM needed)
      - Semantic: Deep conflict analysis using Gemini (future — Week 3)
    """

    def __init__(self, config: PWMConfig):
        self.config = config

    def analyze(
        self,
        project_state: ProjectState,
        sprint_state: Optional[SprintState] = None,
    ) -> IntegrationDebtReport:
        """
        Run all detection patterns against the project state.

        Args:
            project_state: GitHub data snapshot from Layer 1
            sprint_state: Optional Linear/Jira data for cross-referencing

        Returns:
            IntegrationDebtReport with all detected conflicts
        """
        conflicts: list[FileConflict] = []

        # Pattern 1: File collisions
        conflicts.extend(self._detect_file_collisions(project_state))

        # Pattern 2: Branch divergence
        conflicts.extend(self._detect_branch_divergence(project_state))

        # Pattern 3: Large PR risk
        conflicts.extend(self._detect_large_pr_risk(project_state))

        # Build the report
        report = IntegrationDebtReport(
            repo=f"{project_state.repo_owner}/{project_state.repo_name}",
            conflicts=conflicts,
        )
        report.compute_stats()

        # Generate executive summary
        report.executive_summary = self._generate_summary(report)

        return report

    def _detect_file_collisions(
        self, state: ProjectState
    ) -> list[FileConflict]:
        """
        Detect files being modified by multiple open PRs simultaneously.

        This is the most common source of integration debt — two developers
        working on the same file in parallel will collide at merge time.
        """
        conflicts = []

        # Ensure derived stats are computed
        state.compute_derived_stats()

        for filepath, pr_ids in state.files_with_multiple_pr_touches.items():
            if len(pr_ids) < 2:
                continue

            # Severity based on number of colliding PRs
            if len(pr_ids) >= 4:
                severity = DebtSeverity.CRITICAL
            elif len(pr_ids) >= 3:
                severity = DebtSeverity.HIGH
            else:
                severity = DebtSeverity.MEDIUM

            # Get PR titles for context
            pr_titles = []
            for pr in state.open_pull_requests:
                if pr.id in pr_ids:
                    pr_titles.append(f"PR #{pr.id}: {pr.title}")

            conflicts.append(
                FileConflict(
                    conflict_type=ConflictType.FILE_COLLISION,
                    severity=severity,
                    description=(
                        f"File '{filepath}' is being modified by "
                        f"{len(pr_ids)} open PRs simultaneously: "
                        + "; ".join(pr_titles)
                    ),
                    affected_files=[filepath],
                    involved_prs=pr_ids,
                    estimated_rework_hours=self.config.crr.severity_hours.get(
                        severity.value, 4.0
                    ),
                )
            )

        return conflicts

    def _detect_branch_divergence(
        self, state: ProjectState
    ) -> list[FileConflict]:
        """
        Detect branches that have diverged significantly from main.

        Branches with high behind_main counts are ticking time bombs —
        the longer they stay unmerged, the harder the eventual merge.
        """
        conflicts = []

        for branch in state.active_branches:
            if branch.name == state.default_branch:
                continue

            # Severity thresholds for divergence
            if branch.behind_main >= 100:
                severity = DebtSeverity.CRITICAL
            elif branch.behind_main >= 50:
                severity = DebtSeverity.HIGH
            elif branch.behind_main >= 20:
                severity = DebtSeverity.MEDIUM
            else:
                continue  # Not significant enough to report

            conflicts.append(
                FileConflict(
                    conflict_type=ConflictType.BRANCH_DIVERGENCE,
                    severity=severity,
                    description=(
                        f"Branch '{branch.name}' is {branch.behind_main} "
                        f"commits behind {state.default_branch} and "
                        f"{branch.ahead_of_main} commits ahead. "
                        f"Merge complexity increases exponentially with divergence."
                    ),
                    involved_branches=[branch.name, state.default_branch],
                    estimated_rework_hours=self.config.crr.severity_hours.get(
                        severity.value, 4.0
                    ),
                )
            )

        return conflicts

    def _detect_large_pr_risk(
        self, state: ProjectState
    ) -> list[FileConflict]:
        """
        Detect PRs that are too large, increasing integration risk.

        Large PRs are harder to review, more likely to contain bugs,
        and more likely to conflict with other work.
        """
        conflicts = []

        for pr in state.open_pull_requests:
            total_changes = pr.additions + pr.deletions
            file_count = len(pr.files_changed)

            if total_changes >= 1000 or file_count >= 30:
                severity = DebtSeverity.HIGH
            elif total_changes >= 500 or file_count >= 15:
                severity = DebtSeverity.MEDIUM
            else:
                continue

            conflicts.append(
                FileConflict(
                    conflict_type=ConflictType.SEMANTIC_CONFLICT,
                    severity=severity,
                    description=(
                        f"PR #{pr.id} '{pr.title}' is very large "
                        f"({total_changes} line changes across {file_count} files). "
                        f"Large PRs exponentially increase integration risk and "
                        f"review difficulty."
                    ),
                    affected_files=pr.files_changed[:10],  # Cap for readability
                    involved_prs=[pr.id],
                    estimated_rework_hours=self.config.crr.severity_hours.get(
                        severity.value, 4.0
                    ),
                )
            )

        return conflicts

    def _generate_summary(self, report: IntegrationDebtReport) -> str:
        """Generate a human-readable executive summary."""
        if report.total_debt_items == 0:
            return (
                "✅ No integration debt detected. "
                "The project is in a clean integration state."
            )

        severity_parts = []
        if report.critical_count:
            severity_parts.append(f"🔴 {report.critical_count} critical")
        if report.high_count:
            severity_parts.append(f"🟠 {report.high_count} high")
        if report.medium_count:
            severity_parts.append(f"🟡 {report.medium_count} medium")
        if report.low_count:
            severity_parts.append(f"🟢 {report.low_count} low")

        return (
            f"⚠️ Detected {report.total_debt_items} integration debt items "
            f"({', '.join(severity_parts)}). "
            f"Estimated total rework if unresolved: "
            f"{report.total_estimated_rework_hours:.1f} developer-hours "
            f"(${report.total_estimated_rework_hours * self.config.crr.developer_hourly_rate:,.0f})."
        )
