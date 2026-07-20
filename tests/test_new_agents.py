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
Tests for Cognitive Budget Guard and Artistic Integrity Agent
==============================================================

Validates the new agents added in the Agent Expansion phase:
  - CognitiveBudgetGuard: graduated budget response (NOMINAL → WARN → DOWNGRADE → THROTTLE → HALT)
  - ArtisticIntegrityAgent: creative quality degradation detection
"""

from __future__ import annotations

import unittest
from unittest.mock import AsyncMock, MagicMock, patch
import pytest

from pwm.config import PWMConfig, ModelConfig
from pwm.agents.budget_guard_agent import CognitiveBudgetGuard, BudgetAction
from pwm.agents.artistic_integrity_agent import ArtisticIntegrityAgent
from pwm.ingestion.models import (
    FileConflict,
    DebtSeverity,
    ConflictType,
    ResolutionProposal,
    ResolutionStrategy,
)


# ── Cognitive Budget Guard Tests ────────────────────────────────


class TestCognitiveBudgetGuard(unittest.TestCase):
    def setUp(self):
        self.config = PWMConfig.from_env()
        self.config.verbose = False
        self.config._cumulative_input_tokens = 0
        self.config._cumulative_output_tokens = 0
        self.config.models.max_run_tokens = 10000
        self.config.models.max_run_cost_usd = 1.00

    def test_budget_nominal(self):
        """At 10% utilization, action should be NOMINAL."""
        self.config._cumulative_input_tokens = 500
        self.config._cumulative_output_tokens = 500
        guard = CognitiveBudgetGuard(self.config)
        self.assertEqual(guard.evaluate_budget(), BudgetAction.NOMINAL)

    def test_budget_warn(self):
        """At 55% utilization, action should be WARN."""
        self.config._cumulative_input_tokens = 3000
        self.config._cumulative_output_tokens = 2500
        guard = CognitiveBudgetGuard(self.config)
        self.assertEqual(guard.evaluate_budget(), BudgetAction.WARN)

    def test_budget_downgrade(self):
        """At 75% utilization, action should be DOWNGRADE."""
        self.config._cumulative_input_tokens = 4000
        self.config._cumulative_output_tokens = 3500
        guard = CognitiveBudgetGuard(self.config)
        self.assertEqual(guard.evaluate_budget(), BudgetAction.DOWNGRADE)

    def test_budget_throttle(self):
        """At 90% utilization, action should be THROTTLE."""
        self.config._cumulative_input_tokens = 5000
        self.config._cumulative_output_tokens = 4000
        guard = CognitiveBudgetGuard(self.config)
        self.assertEqual(guard.evaluate_budget(), BudgetAction.THROTTLE)

    def test_budget_halt(self):
        """At 96% utilization, action should be HALT."""
        self.config._cumulative_input_tokens = 5000
        self.config._cumulative_output_tokens = 4600
        guard = CognitiveBudgetGuard(self.config)
        self.assertEqual(guard.evaluate_budget(), BudgetAction.HALT)

    def test_recommended_model_nominal(self):
        """At NOMINAL, should recommend reasoning_model."""
        self.config._cumulative_input_tokens = 100
        self.config._cumulative_output_tokens = 100
        self.config.models.reasoning_model = "gemini-pro"
        self.config.models.fast_model = "gemini-flash"
        guard = CognitiveBudgetGuard(self.config)
        self.assertEqual(guard.get_recommended_model(), "gemini-pro")

    def test_recommended_model_downgrade(self):
        """At DOWNGRADE, should recommend fast_model."""
        self.config._cumulative_input_tokens = 4000
        self.config._cumulative_output_tokens = 3500
        self.config.models.reasoning_model = "gemini-pro"
        self.config.models.fast_model = "gemini-flash"
        guard = CognitiveBudgetGuard(self.config)
        self.assertEqual(guard.get_recommended_model(), "gemini-flash")

    def test_branch_skip_nominal(self):
        """At NOMINAL, even low-probability branches should NOT be skipped."""
        self.config._cumulative_input_tokens = 100
        self.config._cumulative_output_tokens = 100
        guard = CognitiveBudgetGuard(self.config)
        self.assertFalse(guard.should_skip_branch(0.1))

    def test_branch_skip_throttle_low_probability(self):
        """At THROTTLE, branches below 0.30 probability should be skipped."""
        self.config._cumulative_input_tokens = 5000
        self.config._cumulative_output_tokens = 4000
        guard = CognitiveBudgetGuard(self.config)
        self.assertTrue(guard.should_skip_branch(0.15))

    def test_branch_skip_throttle_high_probability(self):
        """At THROTTLE, branches above 0.30 probability should NOT be skipped."""
        self.config._cumulative_input_tokens = 5000
        self.config._cumulative_output_tokens = 4000
        guard = CognitiveBudgetGuard(self.config)
        self.assertFalse(guard.should_skip_branch(0.50))

    def test_utilization_properties(self):
        """Token and cost utilization properties should compute correctly."""
        self.config._cumulative_input_tokens = 2000
        self.config._cumulative_output_tokens = 3000
        guard = CognitiveBudgetGuard(self.config)
        self.assertAlmostEqual(guard.token_utilization, 0.50, places=2)

    def test_budget_summary(self):
        """Budget summary should return all expected keys."""
        self.config._cumulative_input_tokens = 1000
        self.config._cumulative_output_tokens = 1000
        guard = CognitiveBudgetGuard(self.config)
        summary = guard.get_budget_summary()
        expected_keys = {
            "token_utilization", "cost_utilization", "binding_utilization",
            "action", "input_tokens", "output_tokens", "cumulative_cost_usd",
            "max_run_tokens", "max_run_cost_usd", "recommended_model",
        }
        self.assertEqual(set(summary.keys()), expected_keys)

    def test_reset(self):
        """Reset should clear fired thresholds."""
        self.config._cumulative_input_tokens = 5000
        self.config._cumulative_output_tokens = 4600
        guard = CognitiveBudgetGuard(self.config)
        guard.evaluate_budget()  # fires HALT
        self.assertIn(BudgetAction.HALT, guard._fired_thresholds)

        guard.reset()
        self.assertEqual(len(guard._fired_thresholds), 0)

    def test_threshold_fires_once(self):
        """Each threshold level should only log once (no log spam)."""
        self.config._cumulative_input_tokens = 3000
        self.config._cumulative_output_tokens = 2500
        guard = CognitiveBudgetGuard(self.config)

        # Call multiple times at WARN level
        guard.evaluate_budget()
        guard.evaluate_budget()
        guard.evaluate_budget()

        # WARN should only be in the set once
        self.assertEqual(guard._fired_thresholds, {BudgetAction.WARN})

    def test_cost_utilization_drives_action(self):
        """Cost utilization should drive action when it's the binding constraint."""
        # Set token budget very high so it's not binding
        self.config.models.max_run_tokens = 1_000_000
        # Set cost budget low
        self.config.models.max_run_cost_usd = 0.01
        # Set tokens to cause high cost utilization (> 95% of $0.01)
        # Cost = (input/1M * 1.50) + (output/1M * 9.0)
        # Need cost > 0.0095 (95% of 0.01)
        # 1000 output tokens = (1000/1M * 9.0) = $0.009
        # Plus 1000 input = (1000/1M * 1.50) = $0.0015
        # Total = $0.0105 > $0.0095
        self.config._cumulative_input_tokens = 1000
        self.config._cumulative_output_tokens = 1000
        guard = CognitiveBudgetGuard(self.config)
        action = guard.evaluate_budget()
        # Cost utilization = $0.0105 / $0.01 = 1.05, which is > 0.95 → HALT
        self.assertEqual(action, BudgetAction.HALT)


# ── Artistic Integrity Agent Tests ──────────────────────────────


class TestArtisticIntegrityAgent(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.config = PWMConfig.from_env()
        self.config.verbose = False

    def test_art_relevant_shader_file(self):
        """Conflicts involving shader files should be art-relevant."""
        agent = ArtisticIntegrityAgent(self.config)
        conflict = FileConflict(
            affected_files=["engine/renderer/shaders.glsl"],
            conflict_type=ConflictType.FILE_COLLISION,
            description="Shader modification conflict",
            severity=DebtSeverity.HIGH,
        )
        self.assertTrue(agent.is_art_relevant(conflict=conflict))

    def test_art_relevant_texture_file(self):
        """Conflicts involving texture files should be art-relevant."""
        agent = ArtisticIntegrityAgent(self.config)
        conflict = FileConflict(
            affected_files=["assets/textures/hero_diffuse.png"],
            conflict_type=ConflictType.FILE_COLLISION,
            description="Texture update conflict",
            severity=DebtSeverity.MEDIUM,
        )
        self.assertTrue(agent.is_art_relevant(conflict=conflict))

    def test_art_relevant_ui_component(self):
        """Conflicts involving UI components should be art-relevant."""
        agent = ArtisticIntegrityAgent(self.config)
        conflict = FileConflict(
            affected_files=["src/ui/inventory_widget.tsx"],
            conflict_type=ConflictType.FILE_COLLISION,
            description="UI widget refactor",
            severity=DebtSeverity.LOW,
        )
        self.assertTrue(agent.is_art_relevant(conflict=conflict))

    def test_not_art_relevant_backend(self):
        """Pure backend conflicts should NOT be art-relevant."""
        agent = ArtisticIntegrityAgent(self.config)
        conflict = FileConflict(
            affected_files=["server/database/migrations.py", "server/auth/jwt_handler.py"],
            conflict_type=ConflictType.FILE_COLLISION,
            description="Database migration conflict",
            severity=DebtSeverity.MEDIUM,
        )
        self.assertFalse(agent.is_art_relevant(conflict=conflict))

    def test_art_relevant_proposal_affected_files(self):
        """Proposals touching art files via strategy.affected_files should be detected."""
        agent = ArtisticIntegrityAgent(self.config)
        conflict = FileConflict(
            affected_files=["config.json"],
            conflict_type=ConflictType.FILE_COLLISION,
            description="Config merge",
            severity=DebtSeverity.LOW,
        )
        proposal = ResolutionProposal(
            strategies=[
                ResolutionStrategy(
                    title="Merge config",
                    description="Merge the config files",
                    steps=["step 1"],
                    estimated_effort_hours=1.0,
                    risk_level=DebtSeverity.LOW,
                    affected_files=["assets/models/character.fbx"],
                )
            ],
            recommended_strategy_index=0,
        )
        self.assertTrue(agent.is_art_relevant(conflict=conflict, proposal=proposal))

    def test_art_relevant_empty_files(self):
        """Conflicts with no files should default to art-relevant (let LLM decide)."""
        agent = ArtisticIntegrityAgent(self.config)
        conflict = FileConflict(
            affected_files=[],
            conflict_type=ConflictType.FILE_COLLISION,
            description="Generic conflict",
            severity=DebtSeverity.LOW,
        )
        self.assertTrue(agent.is_art_relevant(conflict=conflict))

    async def test_audit_proposal_clean_pass(self):
        """A clean proposal should return high fidelity score and no degradation."""
        agent = ArtisticIntegrityAgent(self.config)
        agent._client = MagicMock()

        mock_response = MagicMock()
        mock_response.text = '{"creative_fidelity_score": 0.95, "quality_degradation_detected": false, "degradation_details": "No concerns.", "affected_creative_areas": [], "recommendation": "pass"}'
        mock_response.usage_metadata = MagicMock()
        mock_response.usage_metadata.prompt_token_count = 500
        mock_response.usage_metadata.candidates_token_count = 200
        agent._client.aio.models.generate_content = AsyncMock(return_value=mock_response)

        conflict = FileConflict(
            affected_files=["engine/renderer/lighting.glsl"],
            conflict_type=ConflictType.FILE_COLLISION,
            description="Lighting shader update",
            severity=DebtSeverity.MEDIUM,
        )
        proposal = ResolutionProposal(
            strategies=[
                ResolutionStrategy(
                    title="Merge lighting changes",
                    description="Sequentially merge both lighting improvements",
                    steps=["Merge shader A", "Test lighting", "Merge shader B"],
                    estimated_effort_hours=3.0,
                    risk_level=DebtSeverity.LOW,
                    affected_files=["engine/renderer/lighting.glsl"],
                )
            ],
            recommended_strategy_index=0,
        )

        verdict = await agent.audit_proposal(conflict, proposal, "Test project context")
        self.assertGreaterEqual(verdict["creative_fidelity_score"], 0.90)
        self.assertFalse(verdict["quality_degradation_detected"])
        self.assertEqual(verdict["recommendation"], "pass")

    async def test_audit_proposal_degradation_detected(self):
        """A degrading proposal should be flagged with low fidelity score."""
        agent = ArtisticIntegrityAgent(self.config)
        agent._client = MagicMock()

        mock_response = MagicMock()
        mock_response.text = '{"creative_fidelity_score": 0.35, "quality_degradation_detected": true, "degradation_details": "Proposal downgrades shader from PBR to flat lighting, removing specular highlights and normal mapping.", "affected_creative_areas": ["shaders", "materials"], "recommendation": "reject"}'
        mock_response.usage_metadata = MagicMock()
        mock_response.usage_metadata.prompt_token_count = 600
        mock_response.usage_metadata.candidates_token_count = 300
        agent._client.aio.models.generate_content = AsyncMock(return_value=mock_response)

        conflict = FileConflict(
            affected_files=["engine/renderer/shaders.glsl"],
            conflict_type=ConflictType.FILE_COLLISION,
            description="Shader simplification conflict",
            severity=DebtSeverity.HIGH,
        )
        proposal = ResolutionProposal(
            strategies=[
                ResolutionStrategy(
                    title="Simplify shader pipeline",
                    description="Replace PBR shaders with flat lighting for faster rendering",
                    steps=["Remove normal mapping", "Disable specular", "Switch to flat shader"],
                    estimated_effort_hours=2.0,
                    risk_level=DebtSeverity.MEDIUM,
                    affected_files=["engine/renderer/shaders.glsl"],
                    trade_offs="Visual quality significantly reduced",
                )
            ],
            recommended_strategy_index=0,
        )

        verdict = await agent.audit_proposal(conflict, proposal, "Test project context")
        self.assertLessEqual(verdict["creative_fidelity_score"], 0.50)
        self.assertTrue(verdict["quality_degradation_detected"])
        self.assertEqual(verdict["recommendation"], "reject")
        self.assertIn("shaders", verdict["affected_creative_areas"])


# ── Event Type Registration Tests ───────────────────────────────


class TestEventTypeRegistration(unittest.TestCase):
    def test_budget_alert_event_type_exists(self):
        """BUDGET_ALERT should be a valid EventType."""
        from pwm.logging.event_logger import EventType
        self.assertEqual(EventType.BUDGET_ALERT.value, "budget_alert")

    def test_artistic_integrity_event_type_exists(self):
        """ARTISTIC_INTEGRITY_CHECK should be a valid EventType."""
        from pwm.logging.event_logger import EventType
        self.assertEqual(EventType.ARTISTIC_INTEGRITY_CHECK.value, "artistic_integrity_check")


# ── Agent Registration Tests ────────────────────────────────────


class TestAgentRegistration(unittest.TestCase):
    def test_budget_guard_importable(self):
        """CognitiveBudgetGuard should be importable from pwm.agents."""
        from pwm.agents import CognitiveBudgetGuard, BudgetAction
        self.assertTrue(CognitiveBudgetGuard is not None)
        self.assertTrue(BudgetAction is not None)

    def test_artistic_integrity_importable(self):
        """ArtisticIntegrityAgent should be importable from pwm.agents."""
        from pwm.agents import ArtisticIntegrityAgent
        self.assertTrue(ArtisticIntegrityAgent is not None)


if __name__ == "__main__":
    unittest.main()
