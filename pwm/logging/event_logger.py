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

Cryptographic Chaining (Thesis §5.2 — "muuttumaton liikkuja"):
  Every event is chained to its predecessor via SHA-256 hash,
  creating a tamper-evident Merkle chain. If any historical event
  is modified, verify_chain() will detect the break.
"""

from __future__ import annotations

import asyncio
import warnings
import hashlib
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
    SYSTEM_START = "system_start"
    TELEMETRY_INGESTED = "telemetry_ingested"
    GROUNDING_CALIBRATED = "grounding_calibrated"
    CALIBRATION_UPDATED = "calibration_updated"
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

    # Cryptographic chain fields (Thesis §5.2 — "muuttumaton liikkuja")
    previous_hash: str = Field(
        default="",
        description="SHA-256 hash of the previous event's canonical JSON",
    )
    event_hash: str = Field(
        default="",
        description="SHA-256 hash of this event (computed after serialization)",
    )

    def to_log_line(self) -> str:
        """Serialize to a single JSON line for append-only storage."""
        return self.model_dump_json() + "\n"

    def compute_hash(self) -> str:
        """
        Compute the SHA-256 hash of this event's canonical content.

        The hash covers all fields EXCEPT event_hash itself (to avoid
        circular dependency). This is the value that the NEXT event
        will store as its previous_hash.
        """
        # Serialize without the event_hash field to get canonical content
        data = self.model_dump()
        data.pop("event_hash", None)
        canonical = json.dumps(data, sort_keys=True, default=str)
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


class EventLogger:
    """
    Append-only event logger for SAIF-compliant audit trails.

    Thread/async-safe via asyncio.Lock. Events are written immediately
    to disk — no buffering, no data loss on crash.

    Implements SHA-256 Merkle chaining (Thesis §5.2) — each event
    stores the hash of the previous event, creating a tamper-evident
    chain. Call verify_chain() to validate integrity.
    """

    # The genesis hash — used as previous_hash for the first event in the chain
    GENESIS_HASH = "GENESIS"

    def __init__(self, log_path: Optional[Path] = None, config: Optional[PWMConfig] = None):
        self._log_path = log_path or Path("output/events.jsonl")
        self.config = config
        self._lock = asyncio.Lock()
        self._in_memory_events: List[PWMEvent] = []
        self._last_event_hash: str = self.GENESIS_HASH

        # Ensure output directory exists
        self._log_path.parent.mkdir(parents=True, exist_ok=True)

        # Initialize Firestore client if project_id is available
        self._db = None
        if config and config.gcp.project_id and config.gcp.project_id != "project-world-model":
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

    async def load_from_firestore(self, limit: int = 500) -> None:
        """Load existing events from Firestore into the in-memory cache.
        
        Note: This query requires a Firestore composite index on the 'events'
        collection ordered by 'timestamp' ASC. Create it via:
            gcloud firestore indexes composite create --collection-group=events \
                --field-config field-path=timestamp,order=ASCENDING
        
        Args:
            limit: Maximum number of events to load (default 500).
        """
        if not self._db:
            return

        async with self._lock:
            self._in_memory_events.clear()
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    # Retrieve last N events ordered by timestamp
                    docs = self._db.collection("events").order_by("timestamp", direction="ASCENDING").limit(limit)
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
                    break  # Success
                except Exception as e:
                    if attempt == max_retries - 1:
                        if self.config and self.config.verbose:
                            print(f"⚠️ [EventLogger] Failed to load events from Firestore after {max_retries} attempts: {e}")
                    else:
                        backoff = 0.5 * (2 ** attempt)
                        if self.config and self.config.verbose:
                            print(f"⚠️ [EventLogger] Firestore load attempt {attempt + 1} failed: {e}. Retrying in {backoff}s...")
                        await asyncio.sleep(backoff)

    def _chain_event(self, event: PWMEvent) -> None:
        """
        Chain an event to the Merkle chain by setting its previous_hash
        and computing its own event_hash. Must be called under _lock.
        """
        event.previous_hash = self._last_event_hash
        event.event_hash = event.compute_hash()
        self._last_event_hash = event.event_hash

    async def log(self, event: PWMEvent) -> None:
        """
        Append an event to the immutable log.

        Chains the event to the Merkle chain, writes to disk immediately,
        logs to Firestore, and keeps an in-memory copy for fast dashboard queries.
        """
        async with self._lock:
            # Chain to previous event (Thesis §5.2 — Merkle chain)
            self._chain_event(event)

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
                max_retries = 3
                for attempt in range(max_retries):
                    try:
                        data = json.loads(event.model_dump_json())
                        # Convert timestamp back to datetime so Firestore stores it as Timestamp
                        data["timestamp"] = event.timestamp
                        await self._db.collection("events").document(event.event_id).set(data)
                        break  # Success
                    except Exception as e:
                        if attempt == max_retries - 1:
                            if self.config and self.config.verbose:
                                print(f"⚠️ [EventLogger] Failed to write event to Firestore after {max_retries} attempts: {e}")
                        else:
                            backoff = 0.5 * (2 ** attempt)
                            if self.config and self.config.verbose:
                                print(f"⚠️ [EventLogger] Firestore write attempt {attempt + 1} failed: {e}. Retrying in {backoff}s...")
                            await asyncio.sleep(backoff)

    def log_sync(self, event: PWMEvent) -> None:
        """Synchronous version for non-async contexts."""
        # Chain to previous event
        self._chain_event(event)
        try:
            with open(self._log_path, "a", encoding="utf-8") as f:
                f.write(event.to_log_line())
        except Exception as e:
            warnings.warn(
                f"[EventLogger] SAIF audit trail write failed: {e}. "
                f"Event {event.event_id} kept in memory only.",
                RuntimeWarning,
                stacklevel=2,
            )
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

    async def log_grounding_calibrated(
        self, run_id: str, error: float, calibration_factor: float
    ) -> None:
        """Convenience: log a world model grounding calibration event."""
        await self.log(PWMEvent(
            event_type=EventType.GROUNDING_CALIBRATED,
            run_id=run_id,
            actor="calibration_engine",
            summary=f"LeWM Grounding Calibrated: L2 Error={error:.4f}, Weight Adjustment={calibration_factor:.4f}",
            details={
                "prediction_error": error,
                "calibration_factor": calibration_factor,
            },
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

    async def log_error(self, run_id: str, error_msg: str) -> None:
        """Convenience: log a pipeline error (e.g. budget exceeded or loop detected)."""
        await self.log(PWMEvent(
            event_type=EventType.ERROR,
            run_id=run_id,
            actor="system",
            summary=f"Error: {error_msg}",
            details={"error": error_msg},
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
                    event = PWMEvent(**data)
                    self._in_memory_events.append(event)
                    # Restore chain state from the last event's hash
                    if event.event_hash:
                        self._last_event_hash = event.event_hash
                except (json.JSONDecodeError, Exception):
                    continue  # Skip corrupted lines gracefully

    def verify_chain(self) -> dict:
        """
        Verify the integrity of the entire Merkle chain.

        Walks every event in order and checks:
        1. Each event's event_hash matches its recomputed hash
        2. Each event's previous_hash matches the prior event's event_hash

        Returns:
            dict with 'valid' (bool), 'total_events', 'verified_events',
            'legacy_events' (pre-chain), 'broken_at_index' (if invalid),
            and 'integrity_score' (0.0–1.0).
        """
        total = len(self._in_memory_events)
        if total == 0:
            return {
                "valid": True,
                "total_events": 0,
                "verified_events": 0,
                "legacy_events": 0,
                "broken_at_index": None,
                "integrity_score": 1.0,
            }

        verified = 0
        legacy = 0
        expected_prev_hash = self.GENESIS_HASH

        for i, event in enumerate(self._in_memory_events):
            # Legacy events (pre-chain) have no hashes — skip gracefully
            if not event.event_hash and not event.previous_hash:
                legacy += 1
                continue

            # Check that previous_hash matches what we expect
            if event.previous_hash != expected_prev_hash:
                return {
                    "valid": False,
                    "total_events": total,
                    "verified_events": verified,
                    "legacy_events": legacy,
                    "broken_at_index": i,
                    "integrity_score": verified / max(total - legacy, 1),
                }

            # Recompute hash and verify
            recomputed = event.compute_hash()
            if recomputed != event.event_hash:
                return {
                    "valid": False,
                    "total_events": total,
                    "verified_events": verified,
                    "legacy_events": legacy,
                    "broken_at_index": i,
                    "integrity_score": verified / max(total - legacy, 1),
                }

            verified += 1
            expected_prev_hash = event.event_hash

        chained_total = total - legacy
        return {
            "valid": True,
            "total_events": total,
            "verified_events": verified,
            "legacy_events": legacy,
            "broken_at_index": None,
            "integrity_score": verified / max(chained_total, 1),
        }
