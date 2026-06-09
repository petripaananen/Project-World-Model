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
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
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
        data = json.loads(state.model_dump_json())
        data["events"] = [
            json.loads(e.model_dump_json())
            for e in self.event_logger.get_events(run_id=state.run_id, limit=50)
        ]
        data["crr_history"] = self.crr_history[-20:]  # Last 20 CRR values
        return data


# ── FastAPI Application ─────────────────────────────────────────

def create_app(
    config: PWMConfig,
    dashboard_state: DashboardState,
) -> FastAPI:
    """Create the FastAPI web dashboard application."""

    app = FastAPI(
        title="Project World Model — Scenario Strategist",
        description="L3 Causal Digital Twin Dashboard",
        version="0.5.0",
    )

    templates_dir = Path(__file__).parent / "templates"

    # ── Routes ──────────────────────────────────────────────────

    @app.get("/", response_class=HTMLResponse)
    async def index():
        """Serve the main dashboard SPA."""
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
