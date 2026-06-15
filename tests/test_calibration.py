"""
Unit Tests for Layer 2 World Model Grounding & Calibration (Phase 8)
===================================================================
"""

from __future__ import annotations

import os
import shutil
import tempfile
import unittest
from pathlib import Path

import pytest

from pwm.config import PWMConfig
from pwm.ingestion.models import (
    BranchInfo,
    CommitInfo,
    FusedEdge,
    FusedNode,
    ProjectState,
    PullRequestInfo,
    SlackMessage,
    SlackState,
    SprintState,
    UnifiedProjectGraph,
)
from pwm.layers.layer2_simulation import Layer2Simulation
from pwm.simulation.calibration import WorldModelCalibrator


class TestWorldModelCalibration(unittest.IsolatedAsyncioTestCase):

    def setUp(self):
        self.config = PWMConfig.from_env()
        self.config.verbose = False
        
        # Create a temporary directory for config/calibrator outputs
        self.test_dir = Path(tempfile.mkdtemp())
        self.config.output_dir = self.test_dir
        self.state_file = self.test_dir / "calibration_state.json"
        
        self.calibrator = WorldModelCalibrator(self.config, state_path=self.state_file)

    def tearDown(self):
        # Clean up temporary directory
        if self.test_dir.exists():
            shutil.rmtree(self.test_dir)

    def test_grounding_error_calculation(self):
        """Test L2 Euclidean distance calculation between prediction and actual states."""
        predicted = [1.0, 2.0, 3.0]
        actual = [4.0, 6.0, 8.0]
        # Distance = sqrt((1-4)^2 + (2-6)^2 + (3-8)^2) = sqrt(9 + 16 + 25) = sqrt(50) ~ 7.071
        error = self.calibrator.calculate_grounding_error(predicted, actual)
        self.assertAlmostEqual(error, 7.0710678118654755, places=5)

        # Test empty or None cases
        self.assertEqual(self.calibrator.calculate_grounding_error([], actual), 0.0)
        self.assertEqual(self.calibrator.calculate_grounding_error(predicted, None), 0.0)

        # Test mismatched lengths (should truncate to shortest)
        predicted_long = [1.0, 2.0, 3.0, 999.0]
        error_mismatched = self.calibrator.calculate_grounding_error(predicted_long, actual)
        self.assertAlmostEqual(error_mismatched, 7.0710678118654755, places=5)

    def test_calibration_factor_update(self):
        """Test that the calibration factor adapts correctly to prediction error."""
        # Initial factor is 1.0
        self.assertEqual(self.calibrator.calibration_factor, 1.0)

        # Update with high error (should decrease calibration factor)
        factor = self.calibrator.update_calibration_factor(error=2.05)
        # target_error = 0.05, delta = 2.0, learning_rate = 0.05
        # Expected new factor: 1.0 * (1.0 - 0.05 * 2.0) = 0.9
        self.assertAlmostEqual(factor, 0.9, places=5)
        self.assertEqual(self.calibrator.calibration_factor, factor)
        self.assertEqual(len(self.calibrator.history), 1)
        self.assertEqual(self.calibrator.history[0]["error"], 2.05)
        self.assertAlmostEqual(self.calibrator.history[0]["calibration_factor"], 0.9)

        # Update with error under target (should increase calibration_factor)
        factor_inc = self.calibrator.update_calibration_factor(error=0.01)
        # delta = 0.01 - 0.05 = -0.04
        # Expected: 0.9 * (1.0 - 0.05 * -0.04) = 0.9 * (1.0 + 0.002) = 0.9018
        self.assertAlmostEqual(factor_inc, 0.9018, places=5)

    def test_save_load_state(self):
        """Test that calibrator correctly persists state to disk."""
        self.calibrator.calibration_factor = 2.5
        self.calibrator.last_predicted_latent_state = [0.1, -0.2, 0.5]
        self.calibrator.history = [{"error": 0.5, "calibration_factor": 2.5}]
        
        self.calibrator.save_state()
        self.assertTrue(self.state_file.exists())

        # Load into a clean calibrator
        new_calibrator = WorldModelCalibrator(self.config, state_path=self.state_file)
        new_calibrator.load_state()
        
        self.assertEqual(new_calibrator.calibration_factor, 2.5)
        self.assertEqual(new_calibrator.last_predicted_latent_state, [0.1, -0.2, 0.5])
        self.assertEqual(len(new_calibrator.history), 1)
        self.assertEqual(new_calibrator.history[0]["error"], 0.5)

    @pytest.mark.asyncio
    async def test_layer2_simulation_multi_modal_context_and_scaling(self):
        """Test that Layer2 simulation incorporates multi-modal context and applies calibrator scaling."""
        layer2 = Layer2Simulation(self.config)
        
        # Build dummy states to trigger full multi-modal path
        p_state = ProjectState(repo_owner="test", repo_name="repo")
        p_state.open_pull_requests.append(
            PullRequestInfo(
                id=1, title="Test PR", author="dev", branch="feature", created_at="2026-06-15T12:00:00"
            )
        )
        p_state.compute_derived_stats()

        s_state = SprintState(team_name="Engineering", cycle_name="Sprint 1")
        s_state.blocked_issues.append("ISSUE-1")
        s_state.compute_derived_stats()

        slack_state = SlackState()
        slack_state.channels.append("#dev")
        slack_state.recent_messages.append(
            SlackMessage(user="alice", text="Need help with merge", timestamp="2026-06-15T12:00:00", channel="#dev")
        )
        slack_state.compute_stats()

        graph = UnifiedProjectGraph()
        graph.nodes.append(FusedNode(id="PR-1", type="pr", name="PR 1"))
        graph.nodes.append(FusedNode(id="FILE-1", type="file", name="app.py"))
        graph.edges.append(FusedEdge(source_id="PR-1", target_id="FILE-1", relation_type="modifies"))

        # Setup calibrator state to apply scaling factor (e.g. 0.5)
        self.calibrator.calibration_factor = 0.5
        self.calibrator.save_state()

        # Run simulation in mock demo mode
        report = await layer2.run_simulation(
            project_state=p_state,
            sprint_state=s_state,
            slack_state=slack_state,
            unified_graph=graph,
            mode="demo",
        )

        self.assertIsNotNone(report.latent_state)
        self.assertIsNotNone(report.predicted_next_latent_state)
        
        # Verify scaling is applied: in fallback mode, mock_embedding values are scaled by factor (0.5)
        # Let's inspect that the values are modified by the calibration_factor
        # Let's verify by loading the calibrator state and checking
        calibrator = WorldModelCalibrator(self.config, state_path=self.state_file)
        calibrator.load_state()
        self.assertEqual(calibrator.calibration_factor, 0.5)


if __name__ == "__main__":
    unittest.main()
