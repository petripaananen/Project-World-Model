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
Tests for Universal Causal Tuple & Zero-Shot Hypergraph Inducer (Phase 1)
========================================================================

Verifies that two completely different project logs (a software sprint log
and a physical construction schedule) serialize into valid UniversalEventTuple
hypergraphs, generate valid UnifiedProjectGraph embeddings, and produce
tamper-evident Merkle roots via EventLogger.
"""

from __future__ import annotations

import shutil
import tempfile
import unittest
from datetime import datetime
from pathlib import Path

from pwm.config import PWMConfig
from pwm.ingestion.hypergraph_inducer import HypergraphInducer
from pwm.ingestion.models import (
    ActorType,
    CommitInfo,
    IssueInfo,
    OperationType,
    ProjectState,
    PullRequestInfo,
    SprintState,
)
from pwm.layers.layer1_observation import Layer1Observation
from pwm.logging.event_logger import EventLogger


class TestUniversalIngestion(unittest.IsolatedAsyncioTestCase):

    def setUp(self):
        self.config = PWMConfig.from_env()
        self.config.verbose = False
        self.test_dir = Path(tempfile.mkdtemp())
        self.config.output_dir = self.test_dir
        self.log_path = self.test_dir / "events.jsonl"
        self.logger = EventLogger(log_path=self.log_path, config=self.config)
        self.inducer = HypergraphInducer(event_logger=self.logger)

    def tearDown(self):
        if self.test_dir.exists():
            shutil.rmtree(self.test_dir)

    async def test_software_sprint_log_hypergraph_and_merkle_root(self):
        """
        Verify that software sprint telemetry (Git commits, PRs, Linear issues)
        is induced into UniversalEventTuples and yields a valid Merkle root.
        """
        now = datetime.now()
        project_state = ProjectState(
            repo_owner="test-org",
            repo_name="core-service",
            recent_commits=[
                CommitInfo(
                    sha="abc1234",
                    author="Mikael",
                    message="feat: add database migration",
                    timestamp=now,
                    files_changed=["migrations/001_init.sql", "src/db.py"],
                )
            ],
            open_pull_requests=[
                PullRequestInfo(
                    id=101,
                    title="PR #101: Unified schema overhaul",
                    author="Mikael",
                    branch="feat/schema",
                    created_at=now,
                    files_changed=["migrations/001_init.sql", "src/api.py"],
                )
            ],
        )
        sprint_state = SprintState(
            team_name="Backend Core",
            cycle_name="Sprint 42",
            issues=[
                IssueInfo(
                    id="LIN-501",
                    title="Implement audit log integrity check",
                    status="In Progress",
                    assignee="Mikael",
                    created_at=now,
                ),
                IssueInfo(
                    id="LIN-502",
                    title="Resolve schema migration lock",
                    status="Blocked",
                    assignee="Elena",
                    created_at=now,
                ),
            ],
            blocked_issues=["LIN-502"],
        )

        tuples = self.inducer.from_software_telemetry(project_state, sprint_state)
        self.assertGreater(len(tuples), 0)

        # Check tuple schema compliance
        for tup in tuples:
            self.assertIsInstance(tup.actor.actor_type, ActorType)
            self.assertIsInstance(tup.operation, OperationType)
            self.assertTrue(0.0 <= tup.artifact.reversibility_weight <= 1.0)
            self.assertIsInstance(tup.dependencies, list)
            self.assertIsInstance(tup.constraints, list)

        # Synthesize UnifiedProjectGraph and check nodes/edges
        graph = self.inducer.to_unified_project_graph(tuples)
        self.assertGreater(len(graph.nodes), 0)
        self.assertGreater(len(graph.edges), 0)

        # Commit to Merkle-Chained Audit Log
        merkle_root = await self.inducer.commit_to_audit_log(tuples, run_id="run-soft-1")
        self.assertNotEqual(merkle_root, "UNCOMMITTED_NO_LOGGER")
        self.assertEqual(len(merkle_root), 64)  # Valid SHA-256 hex string

        # Validate Merkle chain integrity
        chain_audit = self.logger.verify_chain()
        self.assertTrue(chain_audit["valid"])
        self.assertEqual(chain_audit["verified_events"], len(tuples))

    async def test_physical_construction_schedule_hypergraph_and_merkle_root(self):
        """
        Verify that a physical construction schedule with irreversible operations
        (e.g., pouring concrete, steel framing, electrical inspection) induces into
        UniversalEventTuples, creates a valid UnifiedProjectGraph, and seals a Merkle chain.
        """
        construction_schedule = [
            {
                "id": "TASK-001",
                "contractor": "Subterranean_Works_LLC",
                "action": "POUR_FOUNDATION",
                "deliverable": "Poured Reinforced Concrete Slab",
                "reversibility_weight": 0.0,  # Irreversible physical commitment
                "dependencies": [],
                "rules": ["soil_compaction_verified", "permit_issued"],
            },
            {
                "id": "TASK-002",
                "contractor": "Apex_Steel_Fab",
                "action": "ERECT_STRUCTURAL_STEEL",
                "deliverable": "Structural Steel Frame",
                "reversibility_weight": 0.1,  # Heavy structural commitment
                "dependencies": ["art-poured_reinforced_concrete_slab"],
                "rules": ["cure_days_elapsed >= 14"],
            },
            {
                "id": "TASK-003",
                "contractor": "City_Building_Inspector",
                "action": "INSPECT",
                "deliverable": "Rough Structural Clearance Certificate",
                "reversibility_weight": 0.9,
                "dependencies": ["art-structural_steel_frame"],
                "rules": ["ansi_structural_code_2026"],
            },
        ]

        tuples = self.inducer.from_generic_records(construction_schedule, domain="physical_construction")
        self.assertEqual(len(tuples), 3)

        # Check operations & reversibility
        self.assertEqual(tuples[0].operation, OperationType.CREATE)
        self.assertEqual(tuples[0].artifact.reversibility_weight, 0.0)
        self.assertEqual(tuples[1].operation, OperationType.CREATE)
        self.assertEqual(tuples[1].artifact.reversibility_weight, 0.1)
        self.assertEqual(tuples[2].operation, OperationType.VERIFY)
        self.assertEqual(tuples[2].artifact.reversibility_weight, 0.9)

        # Test graph generation and GraphJEPA topological encoding
        graph = self.inducer.to_unified_project_graph(tuples)
        self.assertEqual(len(graph.nodes), 6)  # 3 artifacts + 3 contractor actors
        self.assertGreaterEqual(len(graph.edges), 5)  # 3 actor edges + 2 dependency edges

        l1 = Layer1Observation(self.config)
        l1_result = await l1.process_telemetry(universal_events=tuples)
        self.assertEqual(l1_result["status"], "raw_logs")
        self.assertEqual(len(l1_result["graph_embeddings"]), 64)

        # Commit to audit log and verify Merkle root
        merkle_root = await self.inducer.commit_to_audit_log(tuples, run_id="run-construction-1")
        self.assertEqual(len(merkle_root), 64)

        audit = self.logger.verify_chain()
        self.assertTrue(audit["valid"])
        self.assertEqual(audit["verified_events"], 3)
