"""
PWM Main Orchestrator
======================

CLI entry point that orchestrates the full PWM pipeline:

    Layer 1 (Ingest) → Layer 2 (Detect) → Layer 3 (Propose) →
    Layer 4 (Validate) → Layer 5 (Present to Scenario Strategist)

Usage:
    python -m pwm.main                    # Full pipeline with mock data
    python -m pwm.main --mode demo        # Demo mode (no Gemini API needed)
    python -m pwm.main --mode analyze     # Full analysis with Gemini agents
    python -m pwm.main --web              # Start web dashboard
    python -m pwm.main --help             # Show all options
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
import uuid
from datetime import datetime
from pathlib import Path

from pwm.config import PWMConfig
from pwm.dashboard.cli_dashboard import CLIDashboard
from pwm.ingestion.github_ingest import GitHubIngestor
from pwm.ingestion.linear_ingest import LinearIngestor
from pwm.ingestion.models import (
    ConflictType,
    CriticVerdict,
    CriticVerdictStatus,
    CRRResult,
    PWMPipelineState,
    ResolutionProposal,
    ResolutionStrategy,
    DebtSeverity,
    FileConflict,
)
from pwm.logging.event_logger import EventLogger
from pwm.simulation.crr_engine import CRREngine
from pwm.simulation.debt_detector import DebtDetector


async def _execute_agent_pipeline(
    state: PWMPipelineState,
    config: PWMConfig,
    mode: str,
    event_logger: EventLogger | None = None,
    detector: DebtDetector | None = None,
    scenario_id: int = 0,
) -> PWMPipelineState:
    """
    Shared Layer 3/4 agent execution step.

    Runs Worker + Critic agents (or demo fallback), calculates CRR,
    and logs events. Called by both the linear pipeline and the async
    loop architecture to avoid code duplication.

    Args:
        state: Pipeline state with debt_report already populated
        config: PWM configuration
        mode: "demo" or "analyze"
        event_logger: Optional event logger for audit trail
        detector: Optional DebtDetector instance to capture its token usage
        scenario_id: XPRIZE scenario ID (default: 0)

    Returns:
        Updated PWMPipelineState with proposals, verdicts, and CRR
    """
    if mode == "analyze":
        from pwm.agents.worker_agent import WorkerAgentFactory
        from pwm.agents.critic_agent import CriticAgent

        critic = CriticAgent(config=config)

        # Dispatch each conflict to the appropriate specialist agent (Thesis Kuvio 7)
        all_proposals = []
        all_worker_tokens = {"input_tokens": 0, "output_tokens": 0}

        for conflict in state.debt_report.conflicts:
            agent, agent_type = WorkerAgentFactory.create(conflict, config)

            data = {
                "debt_report": state.debt_report,
                "project_context": _build_project_context(state),
                "worker_agent": agent,
            }
            data = await agent.process(data)
            proposals_for_conflict = data.get("proposals", [])

            # Tag each proposal with the agent type
            for p in proposals_for_conflict:
                p.agent_type = agent_type

            all_proposals.extend(proposals_for_conflict)

            # Accumulate tokens from this specialist agent
            usage = agent.token_usage
            all_worker_tokens["input_tokens"] += usage["input_tokens"]
            all_worker_tokens["output_tokens"] += usage["output_tokens"]

            if config.verbose:
                print(f"  🏷️ [{agent_type}] handled: {conflict.conflict_type.value}")

        state.proposals = all_proposals

        # Run critic on all proposals
        critic_data = {
            "proposals": state.proposals,
            "debt_report": state.debt_report,
            "project_context": _build_project_context(state),
        }
        critic_data = await critic.process(critic_data)
        state.proposals = critic_data.get("proposals", [])
        state.verdicts = critic_data.get("verdicts", [])

        critic_tokens = critic.token_usage
        layer2_input = detector.token_usage["input_tokens"] if detector else 0
        layer2_output = detector.token_usage["output_tokens"] if detector else 0
        
        state.total_input_tokens = all_worker_tokens["input_tokens"] + critic_tokens["input_tokens"] + layer2_input
        state.total_output_tokens = all_worker_tokens["output_tokens"] + critic_tokens["output_tokens"] + layer2_output
    else:
        if scenario_id > 0:
            from pwm.scenarios import get_scenario
            _, state.proposals, state.verdicts = get_scenario(scenario_id)
        else:
            state.proposals, state.verdicts = _generate_demo_proposals(state)
        state.total_input_tokens = 15_000
        state.total_output_tokens = 8_000

    # Log proposals and verdicts
    if event_logger:
        for proposal in state.proposals:
            desc = proposal.target_conflict.description[:80] if proposal.target_conflict else "Unknown"
            await event_logger.log_proposal(state.run_id, desc, len(proposal.strategies))
        for verdict in state.verdicts:
            await event_logger.log_verdict(
                state.run_id, verdict.verdict.value, verdict.architectural_integrity_score
            )

    # CRR calculation
    crr_engine = CRREngine(config)
    state.crr = crr_engine.calculate(
        debt_report=state.debt_report,
        input_tokens=state.total_input_tokens,
        output_tokens=state.total_output_tokens,
    )

    if event_logger and state.crr:
        await event_logger.log_crr(
            state.run_id, state.crr.crr,
            state.crr.total_ai_cost_usd, state.crr.estimated_rework_cost_usd,
        )
        await event_logger.log_pipeline_end(state.run_id, state.crr.crr)

    return state


async def ingest_worker(queue: asyncio.Queue, config: PWMConfig, ingestion_mode: str, interval: int = 60):
    """Layer 1: Continuous background ingestion. Produces project state snapshots."""
    github = GitHubIngestor(config)
    linear = LinearIngestor(config)
    
    while True:
        print(f"\n[📡 Ingest Worker] Waking up to poll MCP servers...")
        try:
            p_state = await github.ingest(mode=ingestion_mode)
            s_state = await linear.ingest(mode=ingestion_mode)
            await queue.put((p_state, s_state))
            print(f"[📡 Ingest Worker] Queued new state snapshot. Sleeping {interval}s.")
        except Exception as e:
            print(f"[❌ Ingest Worker] Error: {e}")
        await asyncio.sleep(interval)

async def agent_worker(
    queue: asyncio.Queue,
    config: PWMConfig,
    mode: str,
    no_interactive: bool,
    event_logger: EventLogger | None = None,
    dashboard_state=None,
):
    """Layer 3-5: Consumes snapshots, detects debt, runs Agents, and renders Dashboard."""
    dashboard = CLIDashboard()
    detector = DebtDetector(config)
    
    while True:
        p_state, s_state = await queue.get()
        
        state = PWMPipelineState(run_id=str(uuid.uuid4())[:8], started_at=datetime.now())
        state.project_state = p_state
        state.sprint_state = s_state
        
        print(f"[🤖 Agent Worker] Processing snapshot {state.run_id}...")

        # Log pipeline start
        if event_logger:
            await event_logger.log_pipeline_start(state.run_id)
        
        # Layer 2: Detect
        state.debt_report = await detector.analyze(p_state, s_state, mode=mode)

        if event_logger and state.debt_report:
            await event_logger.log_debt_detected(
                state.run_id,
                state.debt_report.total_debt_items,
                state.debt_report.total_estimated_rework_hours,
            )
        
        if not state.debt_report.conflicts:
            print(f"[🤖 Agent Worker] No conflicts detected. Waiting for next snapshot.")
            queue.task_done()
            continue
            
        # Layer 3/4: Agents (shared pipeline step)
        try:
            state = await _execute_agent_pipeline(state, config, mode, event_logger, detector)
        except Exception as e:
            err_msg = str(e)
            print(f"❌ Error during agent execution: {err_msg}")
            if event_logger:
                await event_logger.log_error(state.run_id, err_msg)
            queue.task_done()
            continue
            
        # Push state to web dashboard if connected
        if dashboard_state:
            await dashboard_state.update_state(state)
        
        # Layer 5: CLI Dashboard
        if not no_interactive:
            dashboard.render_full_report(state)
        else:
            print(f"[🤖 Agent Worker] Pipeline run {state.run_id} completed successfully (no-interactive).")
        
        queue.task_done()

async def run_async_architecture(
    config: PWMConfig,
    mode: str,
    ingestion_mode: str,
    no_interactive: bool,
    web: bool = False,
):
    """Deploys the full async Agent Verification Engine architecture with event queues."""
    queue = asyncio.Queue()
    event_logger = EventLogger(config.dashboard.event_log_path, config=config)
    if event_logger.has_firestore():
        await event_logger.load_from_firestore()
    else:
        event_logger.load_from_disk()
    dashboard_state = None
    
    print("\n🌍 Deploying Async Agent Verification Engine...")
    print("Spawning Ingest Worker and Agent Worker tasks...")

    tasks = []

    # Optionally start web dashboard
    if web:
        from pwm.dashboard.web_dashboard import DashboardState, start_dashboard
        dashboard_state = DashboardState(event_logger)
        tasks.append(asyncio.create_task(start_dashboard(config, dashboard_state)))

    # Spawn workers
    tasks.append(asyncio.create_task(
        ingest_worker(queue, config, ingestion_mode, interval=60)
    ))
    tasks.append(asyncio.create_task(
        agent_worker(queue, config, mode, no_interactive, event_logger, dashboard_state)
    ))
    
    # Run forever
    await asyncio.gather(*tasks)

async def run_pipeline(
    config: PWMConfig,
    mode: str = "demo",
    ingestion_mode: str = "mock",
    event_logger: EventLogger | None = None,
    scenario_id: int = 0,
) -> PWMPipelineState:
    """
    Execute the full PWM pipeline (linear single-shot mode).

    Args:
        config: PWM configuration
        mode: "demo" (no LLM) or "analyze" (with Gemini agents)
        ingestion_mode: "mock", "mcp", or "api"
        event_logger: Optional shared event logger for audit trail
        scenario_id: XPRIZE scenario ID to load

    Returns:
        Complete PWMPipelineState with all layers populated
    """
    state = PWMPipelineState(
        run_id=str(uuid.uuid4())[:8],
        started_at=datetime.now(),
    )

    dashboard = CLIDashboard()
    dashboard.console.print(
        f"\n[bold cyan]🌍 PWM Pipeline Starting[/bold cyan] "
        f"[dim](run: {state.run_id}, mode: {mode})[/dim]\n"
    )

    # ── Layer 1: Ingestion ──────────────────────────────────────
    dashboard.console.print("[bold blue]📡 Layer 1: Ingesting project data...[/bold blue]")

    github = GitHubIngestor(config)
    state.project_state = await github.ingest(mode=ingestion_mode)
    dashboard.console.print(
        f"  ✓ GitHub: {state.project_state.total_open_prs} PRs, "
        f"{state.project_state.total_active_branches} branches, "
        f"{len(state.project_state.recent_commits)} recent commits"
    )

    linear = LinearIngestor(config)
    state.sprint_state = await linear.ingest(mode=ingestion_mode)
    dashboard.console.print(
        f"  ✓ Linear: {state.sprint_state.total_issues} issues in "
        f"'{state.sprint_state.cycle_name}'"
    )
    dashboard.console.print()

    # ── Layer 2: Debt Detection ─────────────────────────────────
    dashboard.console.print("[bold yellow]🔍 Layer 2: Analyzing integration debt...[/bold yellow]")

    detector = DebtDetector(config)
    if scenario_id > 0:
        from pwm.scenarios import get_scenario
        state.debt_report, _, _ = get_scenario(scenario_id)
        dashboard.console.print(f"  ✓ Loaded XPRIZE Scenario {scenario_id} Mock Debt Report")
    else:
        state.debt_report = await detector.analyze(
            project_state=state.project_state,
            sprint_state=state.sprint_state,
        )
        dashboard.console.print(
            f"  ✓ {state.debt_report.executive_summary}"
        )
    dashboard.console.print()

    # ── Layer 3 + 4: Worker + Critic Agents ─────────────────────
    dashboard.console.print(
        "[bold green]🤖 Layer 3+4: Running agents...[/bold green]"
    )

    try:
        state = await _execute_agent_pipeline(state, config, mode, event_logger, detector, scenario_id=scenario_id)
    except Exception as e:
        err_msg = str(e)
        dashboard.console.print(f"[bold red]❌ Error during agent execution: {err_msg}[/bold red]")
        if event_logger:
            await event_logger.log_error(state.run_id, err_msg)
        raise

    approved = sum(
        1 for v in state.verdicts
        if v.verdict == CriticVerdictStatus.APPROVED
    )
    dashboard.console.print(
        f"  ✓ {len(state.proposals)} proposals, "
        f"{approved}/{len(state.verdicts)} approved by Critic"
    )
    dashboard.console.print()

    # ── CRR Display ─────────────────────────────────────────────
    if state.crr:
        dashboard.console.print(
            f"[bold]📈 CRR = {state.crr.crr:.4f}[/bold] — {state.crr.crr_interpretation}"
        )
        dashboard.console.print()

    state.completed_at = datetime.now()
    return state


def _build_project_context(state: PWMPipelineState) -> str:
    """Build a context string from project state for the agents."""
    parts = []
    if state.project_state:
        ps = state.project_state
        parts.append(
            f"Repository: {ps.repo_owner}/{ps.repo_name}\n"
            f"Open PRs: {ps.total_open_prs}\n"
            f"Active Branches: {ps.total_active_branches}\n"
            f"Files with collisions: {len(ps.files_with_multiple_pr_touches)}"
        )
    if state.sprint_state:
        ss = state.sprint_state
        parts.append(
            f"\nSprint: {ss.cycle_name}\n"
            f"Total Issues: {ss.total_issues}\n"
            f"Status breakdown: {json.dumps(ss.issues_by_status)}\n"
            f"Blocked Issues: {len(ss.blocked_issues)} ({', '.join(ss.blocked_issues)})"
        )
    return "\n".join(parts)


def _generate_demo_proposals(
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


def main():
    """CLI entry point."""
    # Fix Windows terminal encoding for emoji support
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    parser = argparse.ArgumentParser(
        description="Project World Model (PWM) - Integration Debt Analysis Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python -m pwm.main                     # Demo with mock data\n"
            "  python -m pwm.main --mode analyze       # Full analysis with Gemini\n"
            "  python -m pwm.main --mode demo --no-interactive  # Non-interactive demo\n"
        ),
    )
    parser.add_argument(
        "--mode",
        choices=["demo", "analyze"],
        default="demo",
        help="Pipeline mode: 'demo' (no API needed) or 'analyze' (uses Gemini)",
    )
    parser.add_argument(
        "--ingestion",
        choices=["mock", "mcp", "api"],
        default="mock",
        help="Data ingestion mode (default: mock)",
    )
    parser.add_argument(
        "--scenario",
        type=int,
        choices=[0, 1, 2, 3],
        default=0,
        help="Load a specific XPRIZE mock scenario (1=Causal Simulation, 2=NemoClaw Sandbox, 3=CRR ROI)",
    )
    parser.add_argument(
        "--no-interactive",
        action="store_true",
        help="Skip the interactive Scenario Strategist prompt",
    )
    parser.add_argument(
        "--loop",
        action="store_true",
        help="Run in continuous async loop mode (Prototype Phase 3 architecture)",
    )
    parser.add_argument(
        "--web",
        action="store_true",
        help="Start the web dashboard (FastAPI + WebSocket)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=None,
        help="Web dashboard port (default: 8765)",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Save pipeline state to JSON file",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        default=True,
        help="Enable verbose logging",
    )

    args = parser.parse_args()

    # Load config
    config = PWMConfig.from_env()
    config.verbose = args.verbose

    # Apply port override
    if args.port is not None:
        config.dashboard.web_port = args.port

    # Validate API access for analyze mode
    if args.mode == "analyze" and not config.validate_api_access():
        print(
            "❌ ERROR: Analyze mode requires a Gemini API key.\n"
            "   Set GOOGLE_API_KEY in your .env file or environment.\n"
            "   Or use --mode demo for a demo without API access."
        )
        return

    if args.loop or args.web:
        # Run async architecture (with optional web dashboard)
        try:
            asyncio.run(
                run_async_architecture(
                    config=config,
                    mode=args.mode,
                    ingestion_mode=args.ingestion,
                    no_interactive=args.no_interactive,
                    web=args.web,
                )
            )
        except KeyboardInterrupt:
            print("\n[dim]Async loop terminated by user.[/dim]")
        return  # F5: Always return after loop/web mode — never fall through

    # Run the linear pipeline (Phase 2 PoC mode)
    state = asyncio.run(
        run_pipeline(
            config=config,
            mode=args.mode,
            ingestion_mode=args.ingestion,
            scenario_id=args.scenario,
        )
    )

    # Render the full dashboard
    dashboard = CLIDashboard()
    dashboard.render_full_report(state)

    # Save output if requested
    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(
            state.model_dump_json(indent=2), encoding="utf-8"
        )
        dashboard.console.print(
            f"\n[dim]Pipeline state saved to: {output_path}[/dim]"
        )

    # Interactive mode
    if not args.no_interactive:
        while True:
            decision = dashboard.prompt_decision()
            if decision == "A":
                dashboard.console.print(
                    "\n[bold green]✅ All proposals APPROVED by Scenario Strategist.[/bold green]"
                )
                state.human_approved = True
                break
            elif decision == "V":
                dashboard.console.print(
                    "\n[bold red]❌ All proposals VETOED by Scenario Strategist.[/bold red]"
                )
                state.human_approved = False
                break
            elif decision == "R":
                dashboard.console.print(
                    "\n[bold yellow]🔄 Re-analysis requested. (Not yet implemented — coming Week 3)[/bold yellow]"
                )
            elif decision == "D":
                dashboard.console.print(
                    "\n[bold blue]🔍 Drill-down mode. (Not yet implemented — coming Week 5)[/bold blue]"
                )
            elif decision == "Q":
                dashboard.console.print("\n[dim]Exiting.[/dim]")
                break
            else:
                dashboard.console.print(
                    "[dim]Unknown command. Use A/R/V/D/Q.[/dim]"
                )


if __name__ == "__main__":
    main()
