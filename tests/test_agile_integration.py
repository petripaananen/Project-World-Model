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
Tests for Agile Framework Integration (Kanban, Scrum, Stakeholders, Portfolio, Planning)
========================================================================================
"""

from __future__ import annotations

import unittest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock
import pytest

from pwm.config import PWMConfig
from pwm.agents.kanban_flow_agent import KanbanFlowAgent
from pwm.agents.scrum_master_agent import ScrumMasterAgent
from pwm.agents.stakeholder_agent import StakeholderAgent
from pwm.agents.portfolio_agent import RiskPortfolioAgent, ProjectSnapshot
from pwm.agents.critic_agent import CriticAgent
from pwm.planning.project_plan_generator import ProjectPlanGenerator
from pwm.analysis.retrospective_engine import RetrospectiveEngine, SprintSnapshot
from pwm.ingestion.models import ResolutionProposal


class TestAgileFrameworkIntegration(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.config = PWMConfig.from_env()
        self.config.verbose = False
        
        # Scrum / Kanban config defaults for testing
        self.config.scrum.sprint_length_days = 14
        self.config.scrum.definition_of_done = ["tests_pass", "code_reviewed", "docs_updated"]
        self.config.kanban.wip_limits = {"backlog": 20, "in_progress": 2, "review": 1}
        self.config.kanban.sle_target_days = 8
        self.config.kanban.sle_percentile = 0.85
        self.config.kanban.aging_warning_threshold_days = 4

    def test_kanban_flow_agent_calculations(self):
        """Test KanbanFlowAgent correctly tracks WIP, cycle time, throughput, and SLE."""
        agent = KanbanFlowAgent(config=self.config)
        
        now = datetime.now()
        mock_items = [
            # In progress items
            {"id": "task-1", "title": "Implement cache", "state": "in_progress", "started_at": (now - timedelta(days=5)).isoformat(), "source": "linear"},
            {"id": "task-2", "title": "Fix buttons", "state": "in_progress", "started_at": (now - timedelta(days=2)).isoformat(), "source": "linear"},
            # In review
            {"id": "task-3", "title": "Code review", "state": "review", "started_at": (now - timedelta(days=9)).isoformat(), "source": "linear"},
            # Completed items (lookback days = 14)
            {"id": "task-4", "title": "Update README", "state": "done", "started_at": (now - timedelta(days=12)).isoformat(), "finished_at": (now - timedelta(days=10)).isoformat(), "source": "linear"},
            {"id": "task-5", "title": "CSS Tokens", "state": "done", "started_at": (now - timedelta(days=5)).isoformat(), "finished_at": (now - timedelta(days=1)).isoformat(), "source": "linear"},
        ]
        
        agent.ingest_work_items(mock_items)
        metrics = agent.calculate_flow_metrics()
        
        # WIP: task-1, task-2, task-3 (started but not finished)
        self.assertEqual(metrics.wip, 3)
        
        # Completed items cycle times: task-4 (2 days), task-5 (4 days)
        # Average cycle time: (2 + 4) / 2 = 3.0 days
        self.assertEqual(metrics.avg_cycle_time, 3.0)
        
        # Throughput: 2 completed in 14 days = 2/14 = 0.14 per day
        self.assertAlmostEqual(metrics.throughput, 2/14, places=2)
        
        # WIP limit violations:
        # State counts in progress: in_progress=2, review=1
        # Limits: in_progress=2, review=1. No excess!
        violations = agent.check_wip_violations()
        self.assertEqual(len(violations), 0)
        
        # Force a violation
        mock_items.append({"id": "task-6", "title": "Violate Limit", "state": "review", "started_at": now.isoformat()})
        agent.ingest_work_items(mock_items)
        violations = agent.check_wip_violations()
        self.assertEqual(len(violations), 1)
        self.assertEqual(violations[0]["state"], "review")
        self.assertEqual(violations[0]["excess"], 1)

        # Aging items: task-3 age = 9 days (exceeds SLE target of 8 days)
        # task-1 age = 5 days (exceeds warning threshold of 4 days)
        aging = agent.get_aging_items()
        self.assertEqual(len(aging), 2)
        self.assertEqual(aging[0]["item_id"], "task-3")
        self.assertTrue(aging[0]["sle_exceeded"])

    def test_scrum_master_agent_dod_validation(self):
        """Test ScrumMasterAgent validation against Definition of Done."""
        agent = ScrumMasterAgent(config=self.config)
        agent.start_sprint(sprint_number=5, sprint_goal="Complete core modules")
        
        # Test item that meets DoD
        item_done = {
            "id": "item-1",
            "title": "Clean codebase",
            "dod_tests_pass": True,
            "dod_code_reviewed": True,
            "dod_docs_updated": True,
        }
        res_done = agent.check_definition_of_done(item_done)
        self.assertTrue(res_done["definition_of_done_met"])
        self.assertEqual(len(res_done["missing"]), 0)
        
        # Test item missing some DoD criteria
        item_pending = {
            "id": "item-2",
            "title": "Draft API",
            "dod_tests_pass": True,
            "dod_code_reviewed": False,
            "dod_docs_updated": False,
        }
        res_pending = agent.check_definition_of_done(item_pending)
        self.assertFalse(res_pending["definition_of_done_met"])
        self.assertEqual(set(res_pending["missing"]), {"code_reviewed", "docs_updated"})

    def test_stakeholder_agent_risk_and_raci(self):
        """Test StakeholderAgent tracks relationships, RACI and engagement risks."""
        agent = StakeholderAgent(config=self.config)
        
        now = datetime.now()
        pr_authors = [
            {"author": "Mikael", "pr_id": "pr-1", "timestamp": now.isoformat()},
            {"author": "Lara", "pr_id": "pr-2", "timestamp": (now - timedelta(days=8)).isoformat()}, # Inactive
        ]
        pr_reviewers = [
            {"reviewer": "Elena", "author": "Mikael", "pr_id": "pr-1", "timestamp": now.isoformat()}
        ]
        issue_assignees = [
            {"assignee": "Dan", "issue_id": "iss-1", "area": "Frontend", "timestamp": now.isoformat()},
            {"assignee": "Mikael", "issue_id": "iss-2", "area": "Backend API", "timestamp": now.isoformat()},
        ]
        
        agent.ingest_from_project_data(pr_authors, pr_reviewers, issue_assignees)
        
        # Lara should be inactive (last activity 8 days ago > inactivity threshold 5)
        risks = agent.detect_risks(inactivity_threshold_days=5.0)
        inactive_ids = [r.stakeholder_id for r in risks if r.risk_type == "inactive"]
        self.assertIn("Lara", inactive_ids)
        
        # RACI matrix generation
        raci = agent.generate_raci_data()
        self.assertEqual(len(raci), 2)  # Frontend, Backend API
        
        # Dan has Frontend
        frontend_entry = next(r for r in raci if r["area"] == "Frontend")
        self.assertEqual(frontend_entry["responsible"], "Dan")
        
        # Communication graph
        graph = agent.get_communication_graph()
        self.assertEqual(len(graph["nodes"]), 4) # Mikael, Lara, Elena, Dan
        # Link between Elena & Mikael (review connection)
        has_link = any(
            (e["source"] == "Elena" and e["target"] == "Mikael") or
            (e["source"] == "Mikael" and e["target"] == "Elena")
            for e in graph["edges"]
        )
        self.assertTrue(has_link)

    def test_risk_portfolio_agent_conflict_detection(self):
        """Test RiskPortfolioAgent aggregates CRRs and flags cross-project conflicts."""
        agent = RiskPortfolioAgent(config=self.config)
        
        # Register two project snapshots
        # Mikael is contributor to both projects
        # Dan is contributor to both projects
        # Elena is contributor only to project A
        proj_a = ProjectSnapshot(
            project_id="proj-a",
            project_name="Project Alpha",
            crr=1.2,
            total_debt_items=10,
            contributors=["Mikael", "Dan", "Elena"],
            wip=3
        )
        proj_b = ProjectSnapshot(
            project_id="proj-b",
            project_name="Project Beta",
            crr=0.6,
            total_debt_items=5,
            contributors=["Mikael", "Dan"],
            wip=2
        )
        
        agent.register_project(proj_a)
        agent.register_project(proj_b)
        
        # Portfolio CRR: weighted average
        # ((1.2 * 10) + (0.6 * 5)) / (10 + 5) = (12.0 + 3.0) / 15 = 1.0x
        portfolio_crr = agent.calculate_portfolio_crr()
        self.assertEqual(portfolio_crr, 1.0)
        
        # Resource conflicts: limit projects to 1 per person (to trigger conflicts)
        conflicts = agent.detect_resource_conflicts(max_projects_per_person=1)
        conflict_contributors = [c.contributor for c in conflicts]
        self.assertIn("Mikael", conflict_contributors)
        self.assertIn("Dan", conflict_contributors)
        self.assertNotIn("Elena", conflict_contributors) # Elena is only in project A

    def test_project_plan_generator_wbs_and_milestones(self):
        """Test ProjectPlanGenerator creates WBS tree hierarchy and risk register."""
        generator = ProjectPlanGenerator()
        
        # 1. WBS building
        issues = [
            {"id": "epic-1", "title": "Auth Suite", "level": 0, "estimated_hours": 100},
            {"id": "story-1.1", "title": "Login page", "parent_id": "epic-1", "level": 1, "estimated_hours": 40},
            {"id": "task-1.1.1", "title": "CSS Tokens", "parent_id": "story-1.1", "level": 2, "estimated_hours": 16},
        ]
        
        wbs_roots = generator.build_wbs_from_issues(issues)
        self.assertEqual(len(wbs_roots), 1)
        self.assertEqual(wbs_roots[0].item_id, "epic-1")
        self.assertEqual(len(wbs_roots[0].children), 1)
        self.assertEqual(wbs_roots[0].children[0].item_id, "story-1.1")
        
        # 2. Milestone generation
        milestones = generator.generate_milestones_from_sprints(sprint_count=4, sprint_length_days=14)
        # 4 sprints completions + 1 midpoint review gate + 1 project handoff = 6 milestones
        self.assertEqual(len(milestones), 6)
        self.assertEqual(milestones[-1].milestone_id, "project-delivery")

    def test_retrospective_engine_trends(self):
        """Test RetrospectiveEngine computes correct trend directions."""
        engine = RetrospectiveEngine()
        
        # Improving velocity: 20 -> 24 -> 28
        engine.add_snapshot(SprintSnapshot(sprint_number=1, velocity=20, avg_cycle_time_days=8.0))
        engine.add_snapshot(SprintSnapshot(sprint_number=2, velocity=24, avg_cycle_time_days=6.0))
        engine.add_snapshot(SprintSnapshot(sprint_number=3, velocity=28, avg_cycle_time_days=4.0))
        
        vel_insight = engine.analyze_velocity()
        self.assertEqual(vel_insight.trend, "improving")
        self.assertEqual(vel_insight.severity, "info")
        
        # Cycle time: 8.0 -> 6.0 -> 4.0 (improving since cycle time decreased)
        ct_insight = engine.analyze_cycle_time()
        self.assertEqual(ct_insight.trend, "improving")

    @pytest.mark.asyncio
    async def test_critic_agent_dod_injection(self):
        """Test that CriticAgent builds prompts featuring DoD constraints."""
        # Mock generating content
        agent = CriticAgent(config=self.config)
        agent.call_gemini = AsyncMock(return_value='{"verdict": "approved"}')
        
        proposal = ResolutionProposal(
            run_id="run-1",
            target_conflict=None,
            strategies=[],
            recommended_strategy_index=0,
            counter_strategies=[],
            worker_reasoning="Reasoning"
        )
        
        prompt = agent._build_prompt(proposal, project_context="Context", round_number=0)
        
        # Verify prompt contains Definition of Done constraints header
        self.assertIn("DEFINITION OF DONE (DoD) CONSTRAINTS", prompt)
        self.assertIn("Tests pass", prompt)
        self.assertIn("Code reviewed", prompt)
        self.assertIn("Docs updated", prompt)
