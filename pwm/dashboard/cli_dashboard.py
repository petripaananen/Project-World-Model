"""
PWM CLI Dashboard — Scenario Strategist Interface
============================================================

Rich-powered terminal dashboard that presents the complete PWM pipeline
output to the human Scenario Strategist. This is the "last mile" of
the framework — where AI analysis becomes human decision.

Features:
  - Project state summary
  - Integration debt report with severity indicators
  - Worker proposals with Critic verdicts
  - CRR metric visualization
  - Veto controls (approve/reject/request re-analysis)
"""

from __future__ import annotations

from typing import Optional

from rich.console import Console
from rich.layout import Layout
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
from rich import box

from pwm.ingestion.models import (
    CriticVerdict,
    CriticVerdictStatus,
    CRRResult,
    DebtSeverity,
    IntegrationDebtReport,
    ProjectState,
    PWMPipelineState,
    ResolutionProposal,
    SprintState,
)


# Severity → emoji mapping
SEVERITY_ICONS = {
    DebtSeverity.CRITICAL: "🔴",
    DebtSeverity.HIGH: "🟠",
    DebtSeverity.MEDIUM: "🟡",
    DebtSeverity.LOW: "🟢",
}

# Verdict → emoji mapping
VERDICT_ICONS = {
    CriticVerdictStatus.APPROVED: "✅",
    CriticVerdictStatus.REJECTED: "❌",
    CriticVerdictStatus.NEEDS_REVISION: "🔄",
}


class CLIDashboard:
    """
    CLI Dashboard for the Scenario Strategist.

    Renders the full PWM pipeline state in a scannable terminal format.
    """

    def __init__(self):
        self.console = Console()

    def render_full_report(self, state: PWMPipelineState) -> None:
        """Render the complete pipeline state as a dashboard."""
        self.console.clear()
        self._render_header()

        if state.project_state:
            self._render_project_state(state.project_state)

        if state.sprint_state:
            self._render_sprint_state(state.sprint_state)

        if state.debt_report:
            self._render_debt_report(state.debt_report)

        if state.proposals and state.verdicts:
            self._render_proposals_with_verdicts(
                state.proposals, state.verdicts
            )
        elif state.proposals:
            self._render_proposals(state.proposals)

        if state.crr:
            self._render_crr(state.crr)

        self._render_footer()

    def _render_header(self) -> None:
        """Render the PWM dashboard header."""
        header = Text()
        header.append("╔══════════════════════════════════════════════════════╗\n", style="bold cyan")
        header.append("║   ", style="bold cyan")
        header.append("🌍 PROJECT WORLD MODEL", style="bold white")
        header.append(" — Scenario Strategist   ", style="bold cyan")
        header.append("║\n", style="bold cyan")
        header.append("║   ", style="bold cyan")
        header.append("Causal Digital Twin • Agent Verification", style="dim white")
        header.append("     ║\n", style="bold cyan")
        header.append("╚══════════════════════════════════════════════════════╝", style="bold cyan")
        self.console.print(header)
        self.console.print()

    def _render_project_state(self, state: ProjectState) -> None:
        """Render Project State summary."""
        table = Table(
            title="📡 Project State",
            box=box.ROUNDED,
            title_style="bold blue",
            border_style="blue",
        )
        table.add_column("Metric", style="cyan")
        table.add_column("Value", justify="right")

        table.add_row("Repository", f"{state.repo_owner}/{state.repo_name}")
        table.add_row("Open PRs", str(state.total_open_prs))
        table.add_row("Active Branches", str(state.total_active_branches))
        table.add_row("Recent Commits", str(len(state.recent_commits)))
        table.add_row(
            "File Collisions",
            str(len(state.files_with_multiple_pr_touches)),
        )

        self.console.print(table)
        self.console.print()

    def _render_sprint_state(self, state: SprintState) -> None:
        """Render Sprint State summary."""
        table = Table(
            title=f"📋 Sprint: {state.cycle_name}",
            box=box.ROUNDED,
            title_style="bold blue",
            border_style="blue",
        )
        table.add_column("Status", style="cyan")
        table.add_column("Count", justify="right")

        for status, count in sorted(
            state.issues_by_status.items(), key=lambda x: -x[1]
        ):
            table.add_row(status, str(count))

        if state.blocked_issues:
            table.add_row(
                "⛔ Blocked", str(len(state.blocked_issues)), style="red"
            )

        self.console.print(table)
        self.console.print()

    def _render_debt_report(self, report: IntegrationDebtReport) -> None:
        """Render Integration Debt Report."""
        # Summary panel
        self.console.print(
            Panel(
                report.executive_summary,
                title="🔍 Integration Debt Analysis",
                border_style="yellow",
                title_align="left",
            )
        )

        if not report.conflicts:
            return

        # Detailed conflict table
        table = Table(
            box=box.SIMPLE_HEAVY,
            border_style="yellow",
        )
        table.add_column("#", style="dim", width=3)
        table.add_column("Sev", width=3)
        table.add_column("Type", style="cyan", width=18)
        table.add_column("Description", ratio=1)
        table.add_column("Rework (h)", justify="right", width=10)

        for i, conflict in enumerate(report.conflicts, 1):
            icon = SEVERITY_ICONS.get(conflict.severity, "⚪")
            table.add_row(
                str(i),
                icon,
                conflict.conflict_type.value,
                conflict.description[:80] + ("..." if len(conflict.description) > 80 else ""),
                f"{conflict.estimated_rework_hours:.1f}",
            )

        self.console.print(table)
        self.console.print()

    def _render_proposals(self, proposals: list[ResolutionProposal]) -> None:
        """Render Worker proposals without verdicts."""
        self.console.print(
            Text("🤖 Worker Agent Proposals", style="bold green")
        )
        for i, proposal in enumerate(proposals, 1):
            self._render_single_proposal(i, proposal)

    def _render_proposals_with_verdicts(
        self,
        proposals: list[ResolutionProposal],
        verdicts: list[CriticVerdict],
    ) -> None:
        """Render Proposals with Critic verdicts."""
        self.console.print(
            Text(
                "🤖 Proposals & Critic Verdicts",
                style="bold green",
            )
        )
        self.console.print()

        for i, (proposal, verdict) in enumerate(
            zip(proposals, verdicts), 1
        ):
            self._render_single_proposal(i, proposal, verdict)

    def _render_single_proposal(
        self,
        index: int,
        proposal: ResolutionProposal,
        verdict: Optional[CriticVerdict] = None,
    ) -> None:
        """Render a single proposal with optional verdict."""
        # Build the content
        content_parts = []

        if proposal.target_conflict:
            content_parts.append(
                f"[dim]Resolving: {proposal.target_conflict.description[:60]}...[/dim]\n"
            )

        for j, strategy in enumerate(proposal.strategies):
            marker = "★" if j == proposal.recommended_strategy_index else "○"
            content_parts.append(
                f"  {marker} [bold]{strategy.title}[/bold]\n"
                f"    {strategy.description[:100]}...\n"
                f"    Effort: {strategy.estimated_effort_hours}h | "
                f"Risk: {strategy.risk_level.value}\n"
            )

        if verdict:
            icon = VERDICT_ICONS.get(verdict.verdict, "❓")
            content_parts.append(
                f"\n[bold]Critic Verdict[/bold]: {icon} {verdict.verdict.value.upper()}\n"
                f"  Architectural Integrity: {verdict.architectural_integrity_score:.0%}\n"
                f"  Strategic Dishonesty: {'⚠️ DETECTED' if verdict.strategic_dishonesty_detected else '✓ None'}\n"
                f"  Scope: {verdict.scope_assessment}\n"
            )
            if verdict.critique:
                content_parts.append(
                    f"  [dim]{verdict.critique[:120]}...[/dim]\n"
                )

        border = "green" if verdict and verdict.verdict == CriticVerdictStatus.APPROVED else "yellow"

        self.console.print(
            Panel(
                "".join(content_parts),
                title=f"Conflict #{index}",
                border_style=border,
            )
        )

    def _render_crr(self, crr: CRRResult) -> None:
        """Render CRR Metric."""
        # Color based on CRR value
        if crr.crr < 0.1:
            color = "green"
            bar = "████████████████████"
        elif crr.crr < 0.5:
            color = "green"
            bar = "███████████████░░░░░"
        elif crr.crr < 1.0:
            color = "yellow"
            bar = "██████████░░░░░░░░░░"
        else:
            color = "red"
            bar = "████░░░░░░░░░░░░░░░░"

        content = (
            f"[bold]CRR = {crr.crr:.4f}[/bold]  [{color}]{bar}[/{color}]\n\n"
            f"  💰 AI Cost:     ${crr.total_ai_cost_usd:,.4f} "
            f"({crr.total_input_tokens:,} in / {crr.total_output_tokens:,} out tokens)\n"
            f"  👤 Rework Saved: ${crr.estimated_rework_cost_usd:,.2f} "
            f"({crr.estimated_rework_hours:.1f} hours × hourly rate)\n\n"
            f"  📊 {crr.crr_interpretation}"
        )

        self.console.print(
            Panel(
                content,
                title="📈 Compute-to-Rework Ratio (CRR)",
                border_style=color,
                title_align="left",
            )
        )
        self.console.print()

    def _render_footer(self) -> None:
        """Render the Scenario Strategist action prompt."""
        self.console.print(
            Panel(
                "[bold]Actions:[/bold]\n"
                "  [green][A][/green] Approve all validated proposals\n"
                "  [yellow][R][/yellow] Request re-analysis with adjusted parameters\n"
                "  [red][V][/red] Veto — reject all proposals\n"
                "  [blue][D][/blue] Drill down into a specific conflict\n"
                "  [dim][Q][/dim] Quit",
                title="🎯 Scenario Strategist",
                border_style="magenta",
                title_align="left",
            )
        )

    def prompt_decision(self) -> str:
        """Prompt the Scenario Strategist for a decision."""
        return self.console.input(
            "\n[bold magenta]Your decision > [/bold magenta]"
        ).strip().upper()
