"""
PWM Data Models
================

Pydantic models that flow through the entire PWM pipeline as the shared
data contract. These represent the "language" of the system — every layer
reads and writes these structures.

Data Flow:
    Layer 1 (Ingestion) → ProjectState, SprintState
    Layer 2 (Simulation) → IntegrationDebtReport, CRRResult
    Layer 3 (Worker)     → ResolutionProposal
    Layer 4 (Critic)     → CriticVerdict
    Layer 5 (Dashboard)  → reads all of the above
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ──────────────────────────────────────────────────────────────
# Enums
# ──────────────────────────────────────────────────────────────

class DebtSeverity(str, Enum):
    """Severity level of an integration debt item."""
    CRITICAL = "critical"   # Will cause production failure if not resolved
    HIGH = "high"           # Significant risk, needs attention this sprint
    MEDIUM = "medium"       # Should be addressed, but not blocking
    LOW = "low"             # Minor, can be deferred


class CriticVerdictStatus(str, Enum):
    """Possible outcomes of a Critic Agent's review."""
    APPROVED = "approved"           # Proposal is sound, proceed
    REJECTED = "rejected"           # Proposal has fundamental flaws
    NEEDS_REVISION = "needs_revision"  # Proposal needs specific changes


class ConflictType(str, Enum):
    """Types of integration conflicts detected."""
    FILE_COLLISION = "file_collision"         # Multiple PRs modifying same files
    DEPENDENCY_BREAK = "dependency_break"     # Transitive dependency conflict
    BRANCH_DIVERGENCE = "branch_divergence"   # Branch drifted too far from main
    SEMANTIC_CONFLICT = "semantic_conflict"   # Logically incompatible changes
    TEST_REGRESSION = "test_regression"       # Changes that break existing tests
    LARGE_PR_RISK = "large_pr_risk"           # PR is too large, increasing integration risk
    ORGANIZATIONAL_BOTTLENECK = "organizational_bottleneck" # Sprint task delays cascading into PR integration failures


# ──────────────────────────────────────────────────────────────
# Layer 1: Ingestion Models
# ──────────────────────────────────────────────────────────────

class CommitInfo(BaseModel):
    """A single commit from the repository."""
    sha: str
    author: str
    message: str
    timestamp: datetime
    files_changed: list[str] = Field(default_factory=list)
    additions: int = 0
    deletions: int = 0


class PullRequestInfo(BaseModel):
    """A pull request with its metadata and change footprint."""
    id: int
    title: str
    author: str
    branch: str
    base_branch: str = "main"
    state: str = "open"  # open, closed, merged
    created_at: datetime
    updated_at: Optional[datetime] = None
    files_changed: list[str] = Field(default_factory=list)
    additions: int = 0
    deletions: int = 0
    review_state: Optional[str] = None  # pending, approved, changes_requested
    labels: list[str] = Field(default_factory=list)


class BranchInfo(BaseModel):
    """A branch with divergence metrics."""
    name: str
    ahead_of_main: int = 0
    behind_main: int = 0
    last_commit_date: Optional[datetime] = None
    author: Optional[str] = None


class IssueInfo(BaseModel):
    """An issue/task from the project tracker (Linear/Jira)."""
    id: str
    title: str
    status: str  # e.g., "In Progress", "Done", "Backlog"
    assignee: Optional[str] = None
    priority: Optional[str] = None  # urgent, high, medium, low, none
    labels: list[str] = Field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    cycle_name: Optional[str] = None  # Sprint/Cycle name


class ProjectState(BaseModel):
    """
    Complete snapshot of the project's current state from GitHub.
    This is the primary output of Layer 1's GitHub ingestion.
    """
    repo_owner: str
    repo_name: str
    ingested_at: datetime = Field(default_factory=datetime.now)
    default_branch: str = "main"

    # Git data
    recent_commits: list[CommitInfo] = Field(default_factory=list)
    open_pull_requests: list[PullRequestInfo] = Field(default_factory=list)
    active_branches: list[BranchInfo] = Field(default_factory=list)

    # Derived stats
    total_open_prs: int = 0
    total_active_branches: int = 0
    files_with_multiple_pr_touches: dict[str, list[int]] = Field(
        default_factory=dict,
        description="Map of filepath → list of PR IDs that touch it",
    )

    def compute_derived_stats(self) -> None:
        """Compute derived statistics from raw data."""
        self.total_open_prs = len(self.open_pull_requests)
        self.total_active_branches = len(self.active_branches)

        # Find files touched by multiple PRs (collision candidates)
        file_pr_map: dict[str, list[int]] = {}
        for pr in self.open_pull_requests:
            for f in pr.files_changed:
                file_pr_map.setdefault(f, []).append(pr.id)
        self.files_with_multiple_pr_touches = {
            f: prs for f, prs in file_pr_map.items() if len(prs) > 1
        }


class SprintState(BaseModel):
    """
    Snapshot of the current sprint/cycle state from Linear/Jira.
    This is the primary output of Layer 1's project tracker ingestion.
    """
    team_name: str = ""
    cycle_name: str = ""
    ingested_at: datetime = Field(default_factory=datetime.now)

    issues: list[IssueInfo] = Field(default_factory=list)

    # Derived stats
    total_issues: int = 0
    issues_by_status: dict[str, int] = Field(default_factory=dict)
    blocked_issues: list[str] = Field(
        default_factory=list, description="IDs of blocked issues"
    )

    def compute_derived_stats(self) -> None:
        """Compute derived statistics from raw data."""
        self.total_issues = len(self.issues)
        status_counts: dict[str, int] = {}
        for issue in self.issues:
            status_counts[issue.status] = status_counts.get(issue.status, 0) + 1
        self.issues_by_status = status_counts


# ──────────────────────────────────────────────────────────────
# Layer 2: Simulation Models
# ──────────────────────────────────────────────────────────────

class FileConflict(BaseModel):
    """A specific integration conflict between PRs or branches."""
    conflict_type: ConflictType
    severity: DebtSeverity
    description: str
    affected_files: list[str] = Field(default_factory=list)
    involved_prs: list[int] = Field(default_factory=list)
    involved_branches: list[str] = Field(default_factory=list)
    involved_issues: list[str] = Field(default_factory=list)
    estimated_rework_hours: float = 0.0


class IntegrationDebtReport(BaseModel):
    """
    Complete integration debt analysis for a project.
    Output of Layer 2's debt detection engine.
    """
    generated_at: datetime = Field(default_factory=datetime.now)
    repo: str = ""
    total_debt_items: int = 0
    total_estimated_rework_hours: float = 0.0

    # Breakdown by severity
    critical_count: int = 0
    high_count: int = 0
    medium_count: int = 0
    low_count: int = 0

    # The actual debt items
    conflicts: list[FileConflict] = Field(default_factory=list)

    # Summary for the Scenario Strategist
    executive_summary: str = ""

    def compute_stats(self) -> None:
        """Compute aggregate statistics from conflict list."""
        self.total_debt_items = len(self.conflicts)
        self.total_estimated_rework_hours = sum(
            c.estimated_rework_hours for c in self.conflicts
        )
        self.critical_count = sum(
            1 for c in self.conflicts if c.severity == DebtSeverity.CRITICAL
        )
        self.high_count = sum(
            1 for c in self.conflicts if c.severity == DebtSeverity.HIGH
        )
        self.medium_count = sum(
            1 for c in self.conflicts if c.severity == DebtSeverity.MEDIUM
        )
        self.low_count = sum(
            1 for c in self.conflicts if c.severity == DebtSeverity.LOW
        )


class CRRResult(BaseModel):
    """
    Compute-to-Rework Ratio calculation result.

    CRR = Cost_of_AI_Inference / Value_of_Human_Rework_Saved
    
    A CRR < 1.0 means AI is cheaper than human rework (good).
    A CRR > 1.0 means human rework would be cheaper (bad).
    """
    computed_at: datetime = Field(default_factory=datetime.now)

    # AI cost side
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    total_ai_cost_usd: float = 0.0

    # Human cost side
    estimated_rework_hours: float = 0.0
    estimated_rework_cost_usd: float = 0.0

    # The ratio
    crr: float = 0.0
    crr_interpretation: str = ""

    def compute(
        self,
        input_tokens: int,
        output_tokens: int,
        rework_hours: float,
        token_cost_input_per_m: float = 1.25,
        token_cost_output_per_m: float = 10.0,
        developer_hourly_rate: float = 75.0,
    ) -> None:
        """Calculate the CRR from raw inputs."""
        self.total_input_tokens = input_tokens
        self.total_output_tokens = output_tokens
        self.estimated_rework_hours = rework_hours

        self.total_ai_cost_usd = (
            (input_tokens / 1_000_000) * token_cost_input_per_m
            + (output_tokens / 1_000_000) * token_cost_output_per_m
        )
        self.estimated_rework_cost_usd = rework_hours * developer_hourly_rate

        if self.estimated_rework_cost_usd > 0:
            self.crr = self.total_ai_cost_usd / self.estimated_rework_cost_usd
        else:
            self.crr = 0.0

        # Interpretation
        if self.crr == 0:
            self.crr_interpretation = "No rework detected — CRR not applicable"
        elif self.crr < 0.01:
            self.crr_interpretation = "Exceptional — AI costs are negligible vs. rework"
        elif self.crr < 0.1:
            self.crr_interpretation = "Excellent — AI is 10x+ cheaper than rework"
        elif self.crr < 0.5:
            self.crr_interpretation = "Good — AI is significantly cheaper than rework"
        elif self.crr < 1.0:
            self.crr_interpretation = "Acceptable — AI is cheaper, but margins are thin"
        else:
            self.crr_interpretation = "Warning — AI costs exceed human rework value"


# ──────────────────────────────────────────────────────────────
# Layer 3: Worker Agent Models
# ──────────────────────────────────────────────────────────────

class ResolutionStrategy(BaseModel):
    """A single proposed resolution for an integration debt item."""
    title: str
    description: str
    steps: list[str] = Field(default_factory=list)
    estimated_effort_hours: float = 0.0
    risk_level: DebtSeverity = DebtSeverity.LOW
    affected_files: list[str] = Field(default_factory=list)
    trade_offs: str = ""


class ResolutionProposal(BaseModel):
    """
    Worker Agent's complete output: resolution proposals for detected debts.
    """
    generated_at: datetime = Field(default_factory=datetime.now)
    target_conflict: Optional[FileConflict] = None
    strategies: list[ResolutionStrategy] = Field(default_factory=list)
    recommended_strategy_index: int = 0
    worker_reasoning: str = ""


# ──────────────────────────────────────────────────────────────
# Layer 4: Critic Agent Models
# ──────────────────────────────────────────────────────────────

class CriticVerdict(BaseModel):
    """
    Critic Agent's assessment of a Worker Agent's resolution proposal.
    """
    generated_at: datetime = Field(default_factory=datetime.now)
    verdict: CriticVerdictStatus = CriticVerdictStatus.NEEDS_REVISION
    round_number: int = 0

    # Critique dimensions
    architectural_integrity_score: float = Field(
        default=0.0, ge=0.0, le=1.0,
        description="0.0 = destroys architecture, 1.0 = perfectly sound",
    )
    strategic_dishonesty_detected: bool = Field(
        default=False,
        description="True if worker is cutting corners or hiding complexity",
    )
    test_coverage_adequate: bool = True
    scope_assessment: str = ""  # "appropriate", "too_narrow", "too_broad"

    # Detailed feedback
    critique: str = ""
    suggested_revisions: list[str] = Field(default_factory=list)

    # If approved, the final validated proposal
    approved_strategy_index: Optional[int] = None


# ──────────────────────────────────────────────────────────────
# Pipeline State (flows through all layers)
# ──────────────────────────────────────────────────────────────

class PWMPipelineState(BaseModel):
    """
    The complete state object that flows through the entire PWM pipeline.
    Each layer reads and enriches this state.
    """
    # Metadata
    run_id: str = ""
    started_at: datetime = Field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None

    # Layer 1 outputs
    project_state: Optional[ProjectState] = None
    sprint_state: Optional[SprintState] = None

    # Layer 2 outputs
    debt_report: Optional[IntegrationDebtReport] = None
    crr: Optional[CRRResult] = None

    # Layer 3 outputs
    proposals: list[ResolutionProposal] = Field(default_factory=list)

    # Layer 4 outputs
    verdicts: list[CriticVerdict] = Field(default_factory=list)

    # Layer 5 outputs (human decisions)
    human_approved: Optional[bool] = None
    human_notes: str = ""

    # Token tracking (for CRR)
    total_input_tokens: int = 0
    total_output_tokens: int = 0
