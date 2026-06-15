"""
PWM Web Dashboard — Scenario Strategist Web Interface
================================================================

FastAPI-powered web dashboard with WebSocket real-time updates.
Serves a premium single-page application that visualizes the full
PWM pipeline state, agent negotiation trees, and What-If Sandbox.

Usage:
    # Started automatically via main.py --web
    # Or standalone:
    python -m pwm.dashboard.web_dashboard
"""

from __future__ import annotations

import asyncio
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, File, UploadFile
from fastapi.responses import HTMLResponse
from starlette.websockets import WebSocketState

from pwm.config import PWMConfig
from pwm.ingestion.models import PWMPipelineState
from pwm.logging.event_logger import EventLogger, EventType, PWMEvent


# ── Shared Dashboard State ──────────────────────────────────────

class DashboardState:
    """
    In-memory state holder shared between the orchestrator and web clients.
    The orchestrator pushes updates here; WebSocket broadcasts them.
    """

    def __init__(self, event_logger: EventLogger):
        self.event_logger = event_logger
        self.current_state: Optional[PWMPipelineState] = None
        self.crr_history: List[Dict[str, Any]] = []
        self._connected_clients: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def update_state(self, state: PWMPipelineState) -> None:
        """Push a new pipeline state and notify all WebSocket clients."""
        async with self._lock:
            self.current_state = state

            # Track CRR history
            if state.crr:
                self.crr_history.append({
                    "run_id": state.run_id,
                    "timestamp": datetime.now().isoformat(),
                    "crr": state.crr.crr,
                    "ai_cost": state.crr.total_ai_cost_usd,
                    "rework_saved": state.crr.estimated_rework_cost_usd,
                })

        # Broadcast to all connected clients
        await self._broadcast({
            "type": "state_update",
            "data": self._serialize_state(state),
        })

    async def connect(self, websocket: WebSocket) -> None:
        """Register a new WebSocket client."""
        await websocket.accept()
        self._connected_clients.add(websocket)

        # Send current state immediately
        if self.current_state:
            await websocket.send_json({
                "type": "state_update",
                "data": self._serialize_state(self.current_state),
            })

    def disconnect(self, websocket: WebSocket) -> None:
        """Unregister a WebSocket client."""
        self._connected_clients.discard(websocket)

    async def _broadcast(self, message: dict) -> None:
        """Send a message to all connected WebSocket clients."""
        disconnected = set()
        for ws in self._connected_clients:
            try:
                if ws.client_state == WebSocketState.CONNECTED:
                    await ws.send_json(message)
            except Exception:
                disconnected.add(ws)
        self._connected_clients -= disconnected

    def _serialize_state(self, state: PWMPipelineState) -> dict:
        """Serialize pipeline state for JSON transmission."""
        from zoneinfo import ZoneInfo
        from datetime import datetime, timezone

        data = json.loads(state.model_dump_json())
        data["events"] = [
            json.loads(e.model_dump_json())
            for e in self.event_logger.get_events(run_id=state.run_id, limit=50)
        ]
        data["crr_history"] = self.crr_history[-20:]  # Last 20 CRR values
        
        # Embed calibration data (Phase 8 Grounding)
        try:
            from pwm.config import PWMConfig
            from pwm.simulation.calibration import WorldModelCalibrator
            config = PWMConfig()
            calibrator = WorldModelCalibrator(config)
            calibrator.load_state()
            data["calibration"] = {
                "factor": calibrator.calibration_factor,
                "history": calibrator.history[-20:]
            }
        except Exception:
            data["calibration"] = {
                "factor": 1.0,
                "history": []
            }

        # Embed cycle data directly into state (Thesis Kuvio 8)
        try:
            # Assuming config is available globally or we can import it
            from pwm.config import PWMConfig
            config = PWMConfig() # We can recreate default config or pass it in. For simplicity, reading env here:
            tz_str = os.getenv("PWM_TIMEZONE", "Europe/Helsinki")
            tz = ZoneInfo(tz_str)
        except Exception:
            tz = timezone.utc
            tz_str = "UTC"
            
        now = datetime.now(tz)
        hour = now.hour
        
        if 22 <= hour or hour < 6:
            phase = "night"
            title = "Agent Simulation"
            desc = "Asynchronous models running background validation."
        elif 6 <= hour < 10:
            phase = "morning"
            title = "Review & Triage"
            desc = "Scenario Strategist reviews overnight conflict reports."
        elif 10 <= hour < 18:
            phase = "day"
            title = "Human-in-the-Loop"
            desc = "Collaborative refinement of integration strategies."
        else: # 18 <= hour < 22
            phase = "evening"
            title = "Objective Setting"
            desc = "Setting parameters for the next overnight cycle."

        data["cycle"] = {
            "phase": phase,
            "title": title,
            "description": desc,
            "local_time": now.strftime("%H:%M"),
            "timezone": tz_str,
        }

        return data


# ── FastAPI Application ─────────────────────────────────────────

def create_app(
    config: PWMConfig,
    dashboard_state: DashboardState,
) -> FastAPI:
    """Create the FastAPI web dashboard application."""

    app = FastAPI(
        title="Project World Model — Scenario Strategist",
        description="Causal Digital Twin Dashboard",
        version="0.5.0",
    )

    templates_dir = Path(__file__).parent / "templates"

    # ── Routes ──────────────────────────────────────────────────

    from fastapi.staticfiles import StaticFiles
    dist_dir = Path(__file__).resolve().parent.parent.parent / "visualizer" / "dist"
    
    if dist_dir.exists():
        # Serve the built Vite assets
        app.mount("/assets", StaticFiles(directory=str(dist_dir / "assets")), name="assets")
        
        @app.get("/", response_class=HTMLResponse)
        async def index():
            """Serve the Vite React SPA."""
            html_path = dist_dir / "index.html"
            return HTMLResponse(content=html_path.read_text(encoding="utf-8"))
    else:
        # Fallback
        @app.get("/", response_class=HTMLResponse)
        async def index():
            """Serve the fallback dashboard."""
            html_path = templates_dir / "index.html"
            return HTMLResponse(content=html_path.read_text(encoding="utf-8"))

    @app.get("/api/state")
    async def get_state():
        """Get the current pipeline state."""
        if dashboard_state.current_state:
            return dashboard_state._serialize_state(dashboard_state.current_state)
        return {"status": "waiting", "message": "No pipeline data yet"}

    @app.get("/api/events")
    async def get_events(
        run_id: Optional[str] = None,
        event_type: Optional[str] = None,
        limit: int = 100,
    ):
        """Get event log entries."""
        et = EventType(event_type) if event_type else None
        events = dashboard_state.event_logger.get_events(
            run_id=run_id, event_type=et, limit=limit
        )
        return [json.loads(e.model_dump_json()) for e in events]

    @app.get("/api/history")
    async def get_crr_history():
        """Get CRR calculation history."""
        return dashboard_state.crr_history

    @app.get("/api/cycle")
    async def get_cycle_phase():
        """
        Get the current 24h async cycle phase (Thesis Kuvio 8).
        Uses the timezone configured in DashboardConfig.
        """
        import pytz
        
        try:
            tz = pytz.timezone(config.dashboard.timezone)
        except Exception:
            tz = pytz.UTC
            
        now = datetime.now(tz)
        hour = now.hour
        
        # 24h Async Cycle Phases (Thesis Kuvio 8)
        if 22 <= hour or hour < 6:
            phase = "night"
            title = "Agent Simulation"
            desc = "Asynchronous models running background validation."
        elif 6 <= hour < 10:
            phase = "morning"
            title = "Review & Triage"
            desc = "Scenario Strategist reviews overnight conflict reports."
        elif 10 <= hour < 18:
            phase = "day"
            title = "Human-in-the-Loop"
            desc = "Collaborative refinement of integration strategies."
        else: # 18 <= hour < 22
            phase = "evening"
            title = "Objective Setting"
            desc = "Setting parameters for the next overnight cycle."
            
        return {
            "phase": phase,
            "title": title,
            "description": desc,
            "local_time": now.strftime("%H:%M"),
            "timezone": config.dashboard.timezone,
        }

    @app.post("/api/decision")
    async def submit_decision(approved: bool, notes: str = ""):
        """Submit a human approve/veto decision."""
        if dashboard_state.current_state:
            run_id = dashboard_state.current_state.run_id
            dashboard_state.current_state.human_approved = approved
            dashboard_state.current_state.human_notes = notes

            await dashboard_state.event_logger.log_human_decision(
                run_id=run_id, approved=approved, notes=notes
            )

            await dashboard_state._broadcast({
                "type": "decision",
                "data": {"approved": approved, "notes": notes, "run_id": run_id},
            })

            return {"status": "ok", "approved": approved, "run_id": run_id}
        return {"status": "error", "message": "No active pipeline state"}

    @app.post("/api/sandbox")
    async def run_sandbox(conflict_index: int = 0, strategy_index: int = 0):
        """
        Run a What-If simulation for a specific conflict/strategy combination.
        Re-calculates CRR with the selected strategy's effort estimate.
        """
        state = dashboard_state.current_state
        if not state or not state.debt_report:
            return {"status": "error", "message": "No pipeline data available"}

        if conflict_index >= len(state.debt_report.conflicts):
            return {"status": "error", "message": "Invalid conflict index"}

        conflict = state.debt_report.conflicts[conflict_index]

        # Simulate: if this conflict were resolved, how would CRR change?
        remaining_conflicts = [
            c for i, c in enumerate(state.debt_report.conflicts)
            if i != conflict_index
        ]
        remaining_rework = sum(c.estimated_rework_hours for c in remaining_conflicts)
        resolved_rework = conflict.estimated_rework_hours

        # Get strategy effort if proposals exist
        strategy_effort = 0.0
        strategy_title = "Auto-resolve"
        if conflict_index < len(state.proposals):
            proposal = state.proposals[conflict_index]
            if strategy_index < len(proposal.strategies):
                strategy = proposal.strategies[strategy_index]
                strategy_effort = strategy.estimated_effort_hours
                strategy_title = strategy.title

        # Simulated new CRR
        current_crr = state.crr.crr if state.crr else 0.0
        current_ai_cost = state.crr.total_ai_cost_usd if state.crr else 0.0

        sim_rework_cost = remaining_rework * config.crr.developer_hourly_rate
        sim_crr = current_ai_cost / sim_rework_cost if sim_rework_cost > 0 else 0.0

        # Log the sandbox simulation
        await dashboard_state.event_logger.log(PWMEvent(
            event_type=EventType.SANDBOX_SIMULATION,
            run_id=state.run_id,
            actor="human",
            summary=f"What-If: resolved conflict #{conflict_index} via '{strategy_title}'",
            details={
                "conflict_index": conflict_index,
                "strategy_index": strategy_index,
                "strategy_title": strategy_title,
                "original_crr": current_crr,
                "simulated_crr": sim_crr,
                "rework_saved_hours": resolved_rework,
            },
        ))

        return {
            "status": "ok",
            "simulation": {
                "conflict_description": conflict.description[:100],
                "strategy_applied": strategy_title,
                "strategy_effort_hours": strategy_effort,
                "original_crr": round(current_crr, 6),
                "simulated_crr": round(sim_crr, 6),
                "rework_removed_hours": resolved_rework,
                "remaining_debt_items": len(remaining_conflicts),
                "remaining_rework_hours": remaining_rework,
            },
        }

    # ── FTUE & Project Ingestion API ─────────────────────────────

    @app.post("/api/config/mcp")
    async def save_mcp_config(github_owner: str, github_repo: str, linear_team_id: str = ""):
        # Save config
        config.ingestion.github_owner = github_owner
        config.ingestion.github_repo = github_repo
        config.ingestion.linear_team_id = linear_team_id
        
        # Log event
        await dashboard_state.event_logger.log(PWMEvent(
            event_type=EventType.SYSTEM_START,
            run_id="config",
            actor="human",
            summary=f"Configured Git/Linear: {github_owner}/{github_repo}",
            details={"owner": github_owner, "repo": github_repo, "linear_team_id": linear_team_id}
        ))
        
        # Initialize pipeline state from mock data
        import uuid
        from pwm.ingestion.models import ProjectState, SprintState
        from pwm.simulation.debt_detector import DebtDetector
        from pwm.main import _execute_agent_pipeline
        
        state = PWMPipelineState(
            run_id=str(uuid.uuid4())[:8],
            started_at=datetime.now(),
        )
        state.project_state = ProjectState(
            repo_owner=github_owner,
            repo_name=github_repo,
            total_open_prs=3,
            total_active_branches=2
        )
        state.sprint_state = SprintState(
            team_name="Engineering",
            cycle_name="Milestone Alpha",
            total_issues=5
        )
        state.completed_at = datetime.now()
        
        # Detect conflicts & run pipeline
        detector = DebtDetector(config)
        state.debt_report = await detector.analyze(state.project_state, state.sprint_state)
        state.debt_report.compute_stats()
        
        state = await _execute_agent_pipeline(state, config, mode="demo", event_logger=dashboard_state.event_logger)
        
        await dashboard_state.update_state(state)
        return {"status": "ok", "message": "Config saved and project initialized"}

    @app.post("/api/upload/msproject")
    async def upload_msproject(file: UploadFile = File(...)):
        content = await file.read()
        
        from pwm.ingestion.msproject_ingest import MSProjectIngestor
        from pwm.simulation.debt_detector import DebtDetector
        from pwm.main import _execute_agent_pipeline
        import uuid
        
        ingestor = MSProjectIngestor(config)
        sprint_state = ingestor.ingest_xml(content)
        
        state = dashboard_state.current_state or PWMPipelineState(
            run_id=str(uuid.uuid4())[:8],
            started_at=datetime.now(),
        )
        
        if not state.project_state:
            from pwm.ingestion.models import ProjectState
            state.project_state = ProjectState(
                repo_owner="uploaded",
                repo_name=sprint_state.cycle_name or "msproject",
                total_open_prs=2,
                total_active_branches=3
            )
            
        state.sprint_state = sprint_state
        state.completed_at = datetime.now()
        
        # Run simulation/detector
        detector = DebtDetector(config)
        state.debt_report = await detector.analyze(state.project_state, state.sprint_state)
        state.debt_report.compute_stats()
        
        state = await _execute_agent_pipeline(state, config, mode="demo", event_logger=dashboard_state.event_logger)
        
        await dashboard_state.update_state(state)
        
        await dashboard_state.event_logger.log(PWMEvent(
            event_type=EventType.TELEMETRY_INGESTED,
            run_id=state.run_id,
            actor="human",
            summary=f"Ingested MS Project XML: '{sprint_state.cycle_name}' with {len(sprint_state.issues)} tasks.",
            details={"file_name": file.filename}
        ))
        
        return {"status": "ok", "message": "MS Project XML parsed successfully"}

    @app.post("/api/upload/slack")
    async def upload_slack(file: UploadFile = File(...)):
        content = await file.read()
        
        from pwm.ingestion.slack_ingest import SlackIngestor
        import uuid
        
        ingestor = SlackIngestor(config)
        channel_name = file.filename.split(".json")[0]
        slack_state = ingestor.ingest_json(content, channel_name=channel_name)
        
        state = dashboard_state.current_state or PWMPipelineState(
            run_id=str(uuid.uuid4())[:8],
            started_at=datetime.now(),
        )
        state.slack_state = slack_state
        
        await dashboard_state.event_logger.log(PWMEvent(
            event_type=EventType.TELEMETRY_INGESTED,
            run_id=state.run_id,
            actor="human",
            summary=f"Ingested Slack channel '{channel_name}': {slack_state.total_messages} messages.",
            details={"file_name": file.filename, "active_users": slack_state.active_users}
        ))
        
        await dashboard_state.update_state(state)
        return {"status": "ok", "message": "Slack JSON parsed successfully"}

    @app.post("/api/sandbox/load")
    async def load_sandbox_scenario(scenario_id: int):
        from pwm.scenarios import get_scenario
        import uuid
        from pwm.simulation.crr_engine import CRREngine
        
        debt_report, proposals, verdicts = get_scenario(scenario_id)
        
        state = PWMPipelineState(
            run_id=str(uuid.uuid4())[:8],
            started_at=datetime.now(),
        )
        
        from pwm.ingestion.models import ProjectState, SprintState
        state.project_state = ProjectState(
            repo_owner="xprize",
            repo_name=f"scenario-{scenario_id}-sandbox",
            total_open_prs=len(debt_report.conflicts),
            total_active_branches=3
        )
        state.sprint_state = SprintState(
            team_name="XPrize Core Team",
            cycle_name=f"Scenario {scenario_id} Sandbox",
            total_issues=5
        )
        
        from pwm.ingestion.slack_ingest import SlackIngestor
        slack_ingest = SlackIngestor(config)
        state.slack_state = slack_ingest.generate_mock_slack_state()
        
        state.debt_report = debt_report
        state.proposals = proposals
        state.verdicts = verdicts
        state.completed_at = datetime.now()
        
        state.total_input_tokens = 25_000
        state.total_output_tokens = 12_000
        
        crr_engine = CRREngine(config)
        state.crr = crr_engine.calculate(
            debt_report=state.debt_report,
            input_tokens=state.total_input_tokens,
            output_tokens=state.total_output_tokens
        )
        
        await dashboard_state.update_state(state)
        
        await dashboard_state.event_logger.log(PWMEvent(
            event_type=EventType.PIPELINE_START,
            run_id=state.run_id,
            actor="system",
            summary=f"Loaded Sandbox Scenario {scenario_id} for exploration."
        ))
        
        return {"status": "ok", "message": f"Scenario {scenario_id} loaded"}

    # ── WebSocket ───────────────────────────────────────────────

    @app.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket):
        """WebSocket endpoint for real-time state updates."""
        await dashboard_state.connect(websocket)
        try:
            while True:
                # Keep connection alive; handle incoming messages
                data = await websocket.receive_text()
                msg = json.loads(data)

                if msg.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                elif msg.get("type") == "decision":
                    approved = msg.get("approved", False)
                    notes = msg.get("notes", "")
                    if dashboard_state.current_state:
                        run_id = dashboard_state.current_state.run_id
                        dashboard_state.current_state.human_approved = approved
                        await dashboard_state.event_logger.log_human_decision(
                            run_id=run_id, approved=approved, notes=notes
                        )
                        await dashboard_state._broadcast({
                            "type": "decision",
                            "data": {"approved": approved, "run_id": run_id},
                        })
        except WebSocketDisconnect:
            dashboard_state.disconnect(websocket)

    return app


async def start_dashboard(
    config: PWMConfig,
    dashboard_state: DashboardState,
) -> None:
    """Start the web dashboard as an async task."""
    import uvicorn

    app = create_app(config, dashboard_state)

    uv_config = uvicorn.Config(
        app,
        host=config.dashboard.web_host,
        port=config.dashboard.web_port,
        log_level="warning",
    )
    server = uvicorn.Server(uv_config)

    print(
        f"\n🌐 Web Dashboard: http://{config.dashboard.web_host}:{config.dashboard.web_port}\n"
    )
    await server.serve()
