"""
PWM Event Logger — Immutable Audit Trail (SAIF Compliance)
============================================================

Append-only event log that records every agent decision, human veto,
and pipeline state change. This is the foundation for:
  - XPRIZE submission evidence (agent execution logs)
  - SAIF compliance (immutable audit trail)
  - Dashboard event feed (CLI + Web)
  - What-If Sandbox replay

Events are stored as JSON Lines (.jsonl) for simplicity and
streamability. Each line is a self-contained JSON object.
"""

from __future__ import annotations

import asyncio
import json
import uuid
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, TYPE_CHECKING

from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from pwm.config import PWMConfig


class EventType(str, Enum):
    """Types of events recorded in the audit trail."""
    PIPELINE_START = "pipeline_start"
    PIPELINE_END = "pipeline_end"
    INGESTION_COMPLETE = "ingestion_complete"
    DEBT_DETECTED = "debt_detected"
    PROPOSAL_GENERATED = "proposal_generated"
    CRITIC_VERDICT = "critic_verdict"
    CRR_CALCULATED = "crr_calculated"
    HUMAN_APPROVED = "human_approved"
    HUMAN_VETOED = "human_vetoed"
    HUMAN_DRILL_DOWN = "human_drill_down"
    SANDBOX_SIMULATION = "sandbox_simulation"
    ERROR = "error"


class PWMEvent(BaseModel):
    """A single immutable event in the PWM audit trail."""
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4())[:12])
    timestamp: datetime = Field(default_factory=datetime.now)
    event_type: EventType
    run_id: str = ""
    actor: str = ""  # "worker_agent", "critic_agent", "human", "system"
    summary: str = ""
    details: Dict[str, Any] = Field(default_factory=dict)

    def to_log_line(self) -> str:
        """Serialize to a single JSON line for append-only storage."""
        return self.model_dump_json() + "\n"


class EventLogger:
    """
    Append-only event logger for SAIF-compliant audit trails.

    Thread/async-safe via asyncio.Lock. Events are written immediately
    to disk — no buffering, no data loss on crash.
    """

    def __init__(self, log_path: Optional[Path] = None, config: Optional[PWMConfig] = None):
        self._log_path = log_path or Path("output/events.jsonl")
        self.config = config
        self._lock = asyncio.Lock()
        self._in_memory_events: List[PWMEvent] = []

        # Ensure output directory exists
        self._log_path.parent.mkdir(parents=True, exist_ok=True)

        # Initialize Firestore client if project_id is available
        self._db = None
        if config and config.gcp.project_id:
            try:
                from google.cloud import firestore
                self._db = firestore.AsyncClient(project=config.gcp.project_id)
                if config.verbose:
                    print(f"🌲 [EventLogger] Initialized Firestore client for project: {config.gcp.project_id}")
            except Exception as e:
                if config.verbose:
                    print(f"⚠️ [EventLogger] Failed to initialize Firestore client: {e}")

    @property
    def log_path(self) -> Path:
        return self._log_path

    def has_firestore(self) -> bool:
        """Check if Firestore client is initialized and active."""
        return self._db is not None

    async def load_from_firestore(self) -> None:
        """Load existing events from Firestore into the in-memory cache."""
        if not self._db:
            return

        async with self._lock:
            self._in_memory_events.clear()
            try:
                # Retrieve last 500 events ordered by timestamp
                docs = self._db.collection("events").order_by("timestamp", direction="ASCENDING").limit(500)
                async for doc in docs.stream():
                    data = doc.to_dict()
                    # Convert Firestore Timestamp back to Python datetime
                    if "timestamp" in data and not isinstance(data["timestamp"], datetime):
                        try:
                            data["timestamp"] = data["timestamp"].as_datetime()
                        except AttributeError:
                            pass
                    self._in_memory_events.append(PWMEvent(**data))
                
                if self.config and self.config.verbose:
                    print(f"🌲 [EventLogger] Loaded {len(self._in_memory_events)} events from Firestore.")
            except Exception as e:
                if self.config and self.config.verbose:
                    print(f"⚠️ [EventLogger] Failed to load events from Firestore: {e}")

    async def log(self, event: PWMEvent) -> None:
        """
        Append an event to the immutable log.

        Writes to disk immediately, logs to Firestore, and keeps an in-memory copy
        for fast dashboard queries.
        """
        async with self._lock:
            # Append to local file as backup (immutable — never overwrite)
            try:
                with open(self._log_path, "a", encoding="utf-8") as f:
                    f.write(event.to_log_line())
            except Exception as e:
                if self.config and self.config.verbose:
                    print(f"⚠️ [EventLogger] Failed to write local log backup: {e}")

            # Keep in memory for fast access
            self._in_memory_events.append(event)

            # Write to Firestore if client is initialized
            if self._db:
                try:
                    data = json.loads(event.model_dump_json())
                    # Convert timestamp back to datetime so Firestore stores it as Timestamp
                    data["timestamp"] = event.timestamp
                    await self._db.collection("events").document(event.event_id).set(data)
                except Exception as e:
                    if self.config and self.config.verbose:
                        print(f"⚠️ [EventLogger] Failed to write event to Firestore: {e}")

    def log_sync(self, event: PWMEvent) -> None:
        """Synchronous version for non-async contexts."""
        try:
            with open(self._log_path, "a", encoding="utf-8") as f:
                f.write(event.to_log_line())
        except Exception:
            pass
        self._in_memory_events.append(event)

    async def log_pipeline_start(self, run_id: str) -> None:
        """Convenience: log a pipeline start event."""
        await self.log(PWMEvent(
            event_type=EventType.PIPELINE_START,
            run_id=run_id,
            actor="system",
            summary=f"Pipeline run {run_id} started",
        ))

    async def log_pipeline_end(self, run_id: str, crr: float = 0.0) -> None:
        """Convenience: log a pipeline end event."""
        await self.log(PWMEvent(
            event_type=EventType.PIPELINE_END,
            run_id=run_id,
            actor="system",
            summary=f"Pipeline run {run_id} completed (CRR={crr:.4f})",
            details={"crr": crr},
        ))

    async def log_debt_detected(
        self, run_id: str, count: int, total_hours: float
    ) -> None:
        """Convenience: log debt detection results."""
        await self.log(PWMEvent(
            event_type=EventType.DEBT_DETECTED,
            run_id=run_id,
            actor="debt_detector",
            summary=f"Detected {count} integration debt items ({total_hours:.1f}h rework)",
            details={"count": count, "total_rework_hours": total_hours},
        ))

    async def log_proposal(
        self, run_id: str, conflict_desc: str, strategy_count: int
    ) -> None:
        """Convenience: log a worker proposal."""
        await self.log(PWMEvent(
            event_type=EventType.PROPOSAL_GENERATED,
            run_id=run_id,
            actor="worker_agent",
            summary=f"Generated {strategy_count} strategies for: {conflict_desc[:80]}",
            details={
                "conflict": conflict_desc,
                "strategy_count": strategy_count,
            },
        ))

    async def log_verdict(
        self, run_id: str, verdict: str, integrity_score: float
    ) -> None:
        """Convenience: log a critic verdict."""
        await self.log(PWMEvent(
            event_type=EventType.CRITIC_VERDICT,
            run_id=run_id,
            actor="critic_agent",
            summary=f"Verdict: {verdict} (integrity={integrity_score:.0%})",
            details={
                "verdict": verdict,
                "architectural_integrity_score": integrity_score,
            },
        ))

    async def log_human_decision(
        self, run_id: str, approved: bool, notes: str = ""
    ) -> None:
        """Convenience: log a human approve/veto decision."""
        event_type = EventType.HUMAN_APPROVED if approved else EventType.HUMAN_VETOED
        await self.log(PWMEvent(
            event_type=event_type,
            run_id=run_id,
            actor="human",
            summary=f"Scenario Strategist {'APPROVED' if approved else 'VETOED'} proposals",
            details={"notes": notes},
        ))

    async def log_crr(
        self, run_id: str, crr: float, ai_cost: float, rework_saved: float
    ) -> None:
        """Convenience: log CRR calculation."""
        await self.log(PWMEvent(
            event_type=EventType.CRR_CALCULATED,
            run_id=run_id,
            actor="crr_engine",
            summary=f"CRR={crr:.4f} (AI=${ai_cost:.4f} vs Rework=${rework_saved:.2f})",
            details={
                "crr": crr,
                "ai_cost_usd": ai_cost,
                "rework_saved_usd": rework_saved,
            },
        ))

    def get_events(
        self,
        run_id: Optional[str] = None,
        event_type: Optional[EventType] = None,
        limit: int = 100,
    ) -> List[PWMEvent]:
        """
        Query events from the in-memory cache.

        Args:
            run_id: Filter by run ID
            event_type: Filter by event type
            limit: Maximum number of events to return (most recent first)

        Returns:
            List of matching events, most recent first
        """
        events = self._in_memory_events

        if run_id:
            events = [e for e in events if e.run_id == run_id]
        if event_type:
            events = [e for e in events if e.event_type == event_type]

        return list(reversed(events[-limit:]))

    def get_all_run_ids(self) -> List[str]:
        """Get all unique run IDs from the event log."""
        seen = set()
        run_ids = []
        for event in self._in_memory_events:
            if event.run_id and event.run_id not in seen:
                seen.add(event.run_id)
                run_ids.append(event.run_id)
        return run_ids

    def load_from_disk(self) -> None:
        """Load existing events from disk into memory (for startup recovery)."""
        if not self._log_path.exists():
            return

        self._in_memory_events.clear()
        with open(self._log_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    data = json.loads(line)
                    self._in_memory_events.append(PWMEvent(**data))
                except (json.JSONDecodeError, Exception):
                    continue  # Skip corrupted lines gracefully
