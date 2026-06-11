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

from typing import Any, Dict, Optional

from pwm.agents.base_agent import BaseAgent
from pwm.config import PWMConfig
from pwm.ingestion.models import (
    BranchInfo,
    CausalEvidence,
    ConflictType,
    DebtSeverity,
    FileConflict,
    IntegrationDebtReport,
    ProjectState,
    SprintState,
)


class DebtDetector(BaseAgent):
    """
    Layer 2 integration debt detection engine.

    Operates in two modes:
      - Deterministic: File collisions, branch divergence (no LLM needed)
      - Semantic: Deep conflict analysis using Gemini (causal world model)
    """

    def __init__(self, config: PWMConfig):
        system_prompt = (
            "You are the Causal Simulation Engine (Latent Core) acting as the Causal Digital Twin (CDT).\n"
            "Your task is to detect semantic integration debt and organizational bottlenecks using Causal Counterfactual reasoning.\n"
            "Analyze the provided Project State (open Pull Requests) and Sprint State (issues, priorities, blocked status) "
            "to determine if there are hidden logical conflicts or cascading workflow delays.\n\n"
            "Output your findings as a strict JSON array of conflict objects matching this schema:\n"
            "[\n"
            "  {\n"
            '    "conflict_type": "semantic_conflict", // or "organizational_bottleneck"\n'
            '    "severity": "high",\n'
            '    "description": "Explanation of the causal consequence or bottleneck...",\n'
            '    "affected_files": ["path/to/file.ext"],\n'
            '    "involved_prs": [123, 456],\n'
            '    "involved_issues": ["ENG-123"],\n'
            '    "estimated_rework_hours": 4.0\n'
            "  }\n"
            "]\n"
            "If there are no conflicts or bottlenecks, return an empty array: []"
        )
        super().__init__(config=config, system_prompt=system_prompt)

    async def process(self, data: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """Implement abstract method from BaseAgent."""
        project_state = data.get("project_state")
        sprint_state = data.get("sprint_state")
        if project_state:
            data["debt_report"] = await self.analyze(project_state, sprint_state)
        return data

    async def analyze(
        self,
        project_state: ProjectState,
        sprint_state: Optional[SprintState] = None,
        mode: str = "analyze",
    ) -> IntegrationDebtReport:
        """
        Run all detection patterns against the project state.

        Args:
            project_state: GitHub data snapshot from Layer 1
            sprint_state: Optional Linear/Jira data for cross-referencing
            mode: "demo" or "analyze". Skips Gemini if "demo".

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

        if mode == "analyze":
            # Pattern 4: Semantic conflicts (Causal World Model)
            try:
                semantic_conflicts = await self._detect_semantic_conflicts(project_state)
                conflicts.extend(semantic_conflicts)
            except Exception as e:
                if self.config.verbose:
                    print(f"⚠️ [DebtDetector] Semantic conflict detection failed: {e}")

            # Pattern 5: Organizational Bottlenecks (Causal Simulation)
            if sprint_state:
                try:
                    bottlenecks = await self._simulate_causal_bottlenecks(project_state, sprint_state)
                    conflicts.extend(bottlenecks)
                except Exception as e:
                    if self.config.verbose:
                        print(f"⚠️ [DebtDetector] Causal simulation failed: {e}")

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

            # Heuristic causal risk forecast (Thesis §5.2)
            pr_count = len(pr_ids)
            probability = min(0.3 + (pr_count - 2) * 0.2, 0.95)
            causal_evidence = CausalEvidence(
                probability=probability,
                confidence=0.85,
                counterfactual=(
                    f"If {pr_titles[0]} merges first, the remaining "
                    f"{pr_count - 1} PRs will require manual conflict resolution "
                    f"on '{filepath}'."
                ),
                causal_chain=[
                    f"{pr_count} PRs modify '{filepath}' concurrently",
                    "First merge locks the file state",
                    "Subsequent PRs face textual conflicts",
                    "Manual resolution required per remaining PR",
                ],
                impact_distribution={
                    "critical": probability * 0.3 if pr_count >= 4 else 0.0,
                    "high": probability * 0.5,
                    "medium": probability * 0.2,
                },
            )

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
                    causal_evidence=causal_evidence,
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

            # Heuristic causal evidence for branch divergence
            probability = min(0.2 + (branch.behind_main / 200.0), 0.90)
            causal_evidence = CausalEvidence(
                probability=probability,
                confidence=0.75,
                counterfactual=(
                    f"If '{branch.name}' is merged now with {branch.behind_main} "
                    f"commits of divergence, merge complexity is exponential."
                ),
                causal_chain=[
                    f"Branch '{branch.name}' diverged {branch.behind_main} commits",
                    "Main branch accumulated changes not in this branch",
                    "Merge will produce conflicts proportional to divergence",
                    "Post-merge regression risk increases with divergence",
                ],
                impact_distribution={
                    "critical": probability * 0.2 if branch.behind_main >= 100 else 0.0,
                    "high": probability * 0.4,
                    "medium": probability * 0.4,
                },
            )

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
                    causal_evidence=causal_evidence,
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
                    conflict_type=ConflictType.LARGE_PR_RISK,
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

    async def _detect_semantic_conflicts(
        self, state: ProjectState
    ) -> list[FileConflict]:
        """
        Use the Gemini API to perform causal reasoning on the project state.
        Detects hidden semantic conflicts between PRs.
        """
        # If there are fewer than 2 PRs, semantic conflicts are unlikely
        if len(state.open_pull_requests) < 2:
            return []

        # Build context
        context_parts = ["Current Open Pull Requests:\n"]
        for pr in state.open_pull_requests:
            context_parts.append(
                f"PR #{pr.id}: '{pr.title}' by {pr.author}\n"
                f"  Changes: +{pr.additions} -{pr.deletions}\n"
                f"  Files modified: {', '.join(pr.files_changed[:10])}"
            )
            
        prompt = (
            "Analyze the following open pull requests for potential semantic conflicts.\n"
            "Use Level 3 Counterfactual reasoning: 'If PR A is merged, how does it affect the assumptions of PR B?'\n\n"
            f"{chr(10).join(context_parts)}\n\n"
            "Return a JSON array of semantic conflicts."
        )

        response_text = await self.call_gemini(prompt)
        parsed_data = self.parse_json_response(response_text)
        
        conflicts = []
        items = parsed_data if isinstance(parsed_data, list) else parsed_data.get("conflicts", [])
        if isinstance(items, dict) and "raw" in items:
             return []
             
        for item in items:
            if isinstance(item, dict) and not item.get("_parse_error"):
                try:
                    severity_str = str(item.get("severity", "medium")).lower()
                    if severity_str not in [s.value for s in DebtSeverity]:
                        severity_str = "medium"
                        
                    conflicts.append(
                        FileConflict(
                            conflict_type=ConflictType.SEMANTIC_CONFLICT,
                            severity=DebtSeverity(severity_str),
                            description=item.get("description", "Semantic conflict detected."),
                            affected_files=item.get("affected_files", []),
                            involved_prs=item.get("involved_prs", []),
                            involved_issues=item.get("involved_issues", []),
                            estimated_rework_hours=float(item.get("estimated_rework_hours", 4.0)),
                        )
                    )
                except Exception as e:
                    if self.config.verbose:
                         print(f"⚠️ [DebtDetector] Error parsing semantic conflict item: {e}")
        return conflicts

    async def _simulate_causal_bottlenecks(
        self, state: ProjectState, sprint_state: SprintState
    ) -> list[FileConflict]:
        """
        Use the Gemini API to simulate organizational bottlenecks.
        Predicts cascading delays between blocked tasks and active PRs.
        """
        if not sprint_state.issues:
            return []

        # Build context
        context_parts = ["Current Sprint Issues:\n"]
        for issue in sprint_state.issues:
            status_flag = "[BLOCKED] " if issue.id in sprint_state.blocked_issues else ""
            context_parts.append(
                f"Issue {issue.id}: {status_flag}'{issue.title}' "
                f"(Status: {issue.status}, Priority: {issue.priority}, Assignee: {issue.assignee})"
            )
            
        context_parts.append("\nCurrent Open Pull Requests:\n")
        for pr in state.open_pull_requests:
            context_parts.append(
                f"PR #{pr.id}: '{pr.title}' by {pr.author} "
                f"({len(pr.files_changed)} files changed)"
            )

        prompt = (
            "Analyze the following sprint issues and open pull requests as a Digital Twin of the Organization.\n"
            "Use Level 3 Counterfactual reasoning: 'If Issue X is blocked or delayed, how does it cascade into PR integration and overall project delivery?'\n\n"
            f"{chr(10).join(context_parts)}\n\n"
            "Identify any organizational bottlenecks and return them as a JSON array of conflict objects with conflict_type 'organizational_bottleneck'."
        )

        response_text = await self.call_gemini(prompt)
        parsed_data = self.parse_json_response(response_text)
        
        conflicts = []
        items = parsed_data if isinstance(parsed_data, list) else parsed_data.get("conflicts", [])
        if isinstance(items, dict) and "raw" in items:
             return []
             
        for item in items:
            if isinstance(item, dict) and not item.get("_parse_error"):
                try:
                    severity_str = str(item.get("severity", "medium")).lower()
                    if severity_str not in [s.value for s in DebtSeverity]:
                        severity_str = "medium"
                        
                    c_type = str(item.get("conflict_type", "organizational_bottleneck"))
                    if c_type not in [c.value for c in ConflictType]:
                        c_type = "organizational_bottleneck"
                        
                    conflicts.append(
                        FileConflict(
                            conflict_type=ConflictType(c_type),
                            severity=DebtSeverity(severity_str),
                            description=item.get("description", "Organizational bottleneck detected."),
                            affected_files=item.get("affected_files", []),
                            involved_prs=item.get("involved_prs", []),
                            involved_issues=item.get("involved_issues", []),
                            estimated_rework_hours=float(item.get("estimated_rework_hours", 4.0)),
                        )
                    )
                except Exception as e:
                    if self.config.verbose:
                          print(f"⚠️ [DebtDetector] Error parsing causal bottleneck item: {e}")
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
