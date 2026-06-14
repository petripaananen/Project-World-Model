"""
PWM Layer 1 Knowledge Base
===========================
Simple local JSON-backed store for indexing historical precedents 
(past proposals and verdicts) to inform current conflict resolution.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from pydantic import BaseModel

from pwm.ingestion.models import CriticVerdict, ResolutionProposal


class KBEntry(BaseModel):
    """An entry in the knowledge base."""
    conflict_type: str
    conflict_description: str
    resolution_title: str
    resolution_steps: list[str]
    critic_verdict: str
    architectural_integrity_score: float


class KnowledgeBase:
    """
    Lightweight local knowledge base for storing and retrieving past precedents.
    """

    def __init__(self, storage_path: str = "output/knowledge_base.json"):
        self.storage_path = Path(storage_path)
        self.entries: list[KBEntry] = []
        self._load()

    def _load(self) -> None:
        """Load entries from disk."""
        if not self.storage_path.exists():
            return
        try:
            with open(self.storage_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.entries = [KBEntry(**e) for e in data]
        except (json.JSONDecodeError, Exception) as e:
            print(f"Failed to load KnowledgeBase from {self.storage_path}: {e}")

    def _save(self) -> None:
        """Save entries to disk."""
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            with open(self.storage_path, "w", encoding="utf-8") as f:
                json.dump([e.model_dump() for e in self.entries], f, indent=2)
        except Exception as e:
            print(f"Failed to save KnowledgeBase to {self.storage_path}: {e}")

    def index_resolution(self, proposal: ResolutionProposal, verdict: CriticVerdict) -> None:
        """Index a completed proposal and its final verdict."""
        if not proposal.target_conflict:
            return

        # Try to find the approved strategy
        strategy_idx = verdict.approved_strategy_index
        if strategy_idx is None:
            strategy_idx = proposal.recommended_strategy_index
            
        if strategy_idx < 0 or strategy_idx >= len(proposal.strategies):
            return

        strategy = proposal.strategies[strategy_idx]

        entry = KBEntry(
            conflict_type=proposal.target_conflict.conflict_type.value,
            conflict_description=proposal.target_conflict.description,
            resolution_title=strategy.title,
            resolution_steps=strategy.steps,
            critic_verdict=verdict.verdict.value,
            architectural_integrity_score=verdict.architectural_integrity_score,
        )
        self.entries.append(entry)
        self._save()

    def find_precedents(self, conflict_type: str, limit: int = 3) -> list[KBEntry]:
        """Find past resolutions for a specific conflict type."""
        # Simple exact match on conflict type, returning highest integrity score first
        matches = [e for e in self.entries if e.conflict_type == conflict_type]
        matches.sort(key=lambda x: x.architectural_integrity_score, reverse=True)
        return matches[:limit]
