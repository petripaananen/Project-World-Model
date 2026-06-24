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
Tests for Compute Budgeting and Worker-Critic Critique Loop Detection (Phase 6)
==============================================================================
"""

from __future__ import annotations

import unittest
from unittest.mock import AsyncMock, MagicMock
import pytest

from pwm.config import PWMConfig, ModelConfig
from pwm.agents.base_agent import BaseAgent
from pwm.agents.critic_agent import CriticAgent
from pwm.agents.worker_agent import WorkerAgent
from pwm.ingestion.models import (
    FileConflict,
    DebtSeverity,
    ResolutionProposal,
    ResolutionStrategy,
    ConflictType,
    CriticVerdictStatus,
)


class TestBudgetAndLoopControl(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.config = PWMConfig.from_env()
        self.config.verbose = False
        
        # Reset private variables
        self.config._cumulative_input_tokens = 0
        self.config._cumulative_output_tokens = 0

    @pytest.mark.asyncio
    async def test_budget_exhaustion_token_limit(self):
        """Test that base agent call_gemini blocks calls when token budget is exceeded."""
        self.config.models.max_run_tokens = 1000
        
        class DummyAgent(BaseAgent):
            async def process(self, data, **kwargs):
                return data

        agent = DummyAgent(config=self.config)
        agent._client = MagicMock()
        
        # Mock generate_content to return usage metadata
        mock_response = MagicMock()
        mock_response.usage_metadata = MagicMock()
        mock_response.usage_metadata.prompt_token_count = 600
        mock_response.usage_metadata.candidates_token_count = 500
        mock_response.text = "Hello world"
        
        agent._client.aio.models.generate_content = AsyncMock(return_value=mock_response)

        # First call: under limit (total tokens = 0)
        res = await agent.call_gemini("test prompt")
        self.assertEqual(res, "Hello world")
        self.assertEqual(self.config._cumulative_input_tokens, 600)
        self.assertEqual(self.config._cumulative_output_tokens, 500)
        
        # Second call: total tokens is 1100, which exceeds max_run_tokens (1000). Should raise RuntimeError.
        with self.assertRaises(RuntimeError) as context:
            await agent.call_gemini("another prompt")
        
        self.assertIn("Compute budget exhausted", str(context.exception))

    @pytest.mark.asyncio
    async def test_budget_exhaustion_cost_limit(self):
        """Test that base agent call_gemini blocks calls when cost budget is exceeded."""
        # Cost is calculated based on CRR config: input $1.25/M, output $10.00/M
        # With 10,000 output tokens: cost = (10,000 / 1,000,000) * 10 = $0.10.
        # Let's set budget to $0.05.
        self.config.models.max_run_cost_usd = 0.05
        self.config.models.max_run_tokens = 1000000
        
        class DummyAgent(BaseAgent):
            async def process(self, data, **kwargs):
                return data

        agent = DummyAgent(config=self.config)
        agent._client = MagicMock()
        
        mock_response = MagicMock()
        mock_response.usage_metadata = MagicMock()
        mock_response.usage_metadata.prompt_token_count = 0
        mock_response.usage_metadata.candidates_token_count = 6000 # 6000 * $10/M = $0.06
        mock_response.text = "Hello cost limit"
        
        agent._client.aio.models.generate_content = AsyncMock(return_value=mock_response)

        # First call: cumulative cost goes to $0.06 (exceeds $0.05)
        res = await agent.call_gemini("test cost")
        self.assertEqual(res, "Hello cost limit")
        
        # Second call: should fail because budget is exhausted
        with self.assertRaises(RuntimeError) as context:
            await agent.call_gemini("another cost")
            
        self.assertIn("Compute budget exhausted", str(context.exception))

    @pytest.mark.asyncio
    async def test_critic_loop_detection(self):
        """Test that loop-detection in CriticAgent triggers when critiques are too similar."""
        critic = CriticAgent(config=self.config)
        critic.max_rounds = 3
        
        conflict = FileConflict(
            conflict_type=ConflictType.FILE_COLLISION,
            severity=DebtSeverity.HIGH,
            description="Merge conflict in app.py",
            affected_files=["app.py"],
        )
        
        initial_proposal = ResolutionProposal(
            target_conflict=conflict,
            strategies=[
                ResolutionStrategy(
                    title="Fix app.py",
                    description="Resolve the conflict manually.",
                )
            ],
            worker_reasoning="Manual merge.",
        )
        
        # Mock WorkerAgent
        worker_agent = MagicMock(spec=WorkerAgent)
        worker_agent.resolve_conflict = AsyncMock(return_value=initial_proposal)
        
        # Mock the audit_proposal calls
        # In Round 1, Critic asks for revisions
        round_1_verdict = """
        {
            "verdict": "needs_revision",
            "architectural_integrity_score": 0.6,
            "strategic_dishonesty_detected": false,
            "test_coverage_adequate": true,
            "scope_assessment": "appropriate",
            "critique": "Please refine the description and explain the exact git commands you are going to use.",
            "suggested_revisions": ["Provide git merge commands"]
        }
        """
        
        # In Round 2, Critic produces a critique that is 95%+ similar (identical)
        round_2_verdict = """
        {
            "verdict": "needs_revision",
            "architectural_integrity_score": 0.6,
            "strategic_dishonesty_detected": false,
            "test_coverage_adequate": true,
            "scope_assessment": "appropriate",
            "critique": "Please refine the description and explain the exact git commands you are going to use.",
            "suggested_revisions": ["Provide git merge commands"]
        }
        """
        
        # Setup AsyncMock for call_gemini
        critic.call_gemini = AsyncMock()
        critic.call_gemini.side_effect = [round_1_verdict, round_2_verdict]
        
        final_proposal, final_verdict = await critic.run_critique_loop(
            proposal=initial_proposal,
            worker_agent=worker_agent,
            conflict=conflict,
            project_context="Test context",
        )
        
        # Verify that loop detection terminated the loop in Round 2
        # verdict status must be REJECTED and critique should contain the loop message
        self.assertEqual(final_verdict.verdict, CriticVerdictStatus.REJECTED)
        self.assertIn("Loop Detected", final_verdict.critique)
        self.assertIn("100.0% similarity", final_verdict.critique)
        
        # worker_agent.resolve_conflict should only be called once (to transition from round 1 to round 2,
        # but in round 2 loop detection stops before running a third round)
        self.assertEqual(worker_agent.resolve_conflict.call_count, 1)


if __name__ == "__main__":
    unittest.main()
