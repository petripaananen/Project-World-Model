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
Unit & Integration Tests for RSI-Anything Framework in PWM
==========================================================
Validates:
1. Layer 3 Predict-Before-Evaluate Pre-Screening Filter
2. Layer 4 Gated Retain Firewall (Dishonesty, Sandbox, Latent Risk, CRR Budget)
3. Layer 2 Factorized Calibration & Trajectory Experience Buffer
4. Complete RSI Closed-Loop Cycle: Propose -> Predict -> Select -> Evaluate -> Learn -> Retain
"""

import unittest
from pathlib import Path
import tempfile
import shutil
import pytest

from pwm.config import PWMConfig
from pwm.ingestion.models import (
    ResolutionProposal,
    ResolutionStrategy,
    CriticVerdict,
    CriticVerdictStatus,
    RetainGateStatus,
    CRRResult,
    PWMPipelineState,
    DebtSeverity,
)
from pwm.layers.layer3_orchestration import Layer3Orchestration
from pwm.layers.layer4_validation import Layer4Validation
from pwm.simulation.calibration import WorldModelCalibrator


class TestRSIIntegration(unittest.IsolatedAsyncioTestCase):

    def setUp(self):
        self.config = PWMConfig.from_env()
        self.config.verbose = False
        self.test_dir = Path(tempfile.mkdtemp())
        self.config.output_dir = self.test_dir
        self.state_file = self.test_dir / "calibration_state.json"
        self.calibrator = WorldModelCalibrator(self.config, state_path=self.state_file)

    def tearDown(self):
        if self.test_dir.exists():
            shutil.rmtree(self.test_dir)

    async def test_layer3_predict_before_evaluate_pre_screening(self):
        """
        Verify that Layer 3 objectively selects the strategy with lowest predicted
        latent risk via OPF simulation before human or critic evaluation.
        """
        l3 = Layer3Orchestration(self.config)

        # Create proposal with two strategies:
        # 1. High risk direct merge
        # 2. Low risk delay/buffer staging
        s1 = ResolutionStrategy(
            title="Fast Merge Master",
            description="Directly integrate and merge without staging buffers.",
            risk_level=DebtSeverity.CRITICAL,
            estimated_effort_hours=4.0,
        )
        s2 = ResolutionStrategy(
            title="Buffer and Staged Rollout",
            description="Buffer PR and delay deployment with staged rollback checkpoints.",
            risk_level=DebtSeverity.LOW,
            estimated_effort_hours=12.0,
        )

        proposal = ResolutionProposal(
            agent_type="MergeConflictWorker",
            worker_reasoning="Initial worker thought.",
            strategies=[s1, s2],
            recommended_strategy_index=0,  # Initially points to s1
        )

        # Execute pre-screening
        screened = await l3.pre_screen_strategies(proposal, base_state=[0.1] * 64)

        # Verify OPF rollout metrics populated
        for s in screened.strategies:
            self.assertIsNotNone(s.predicted_risk)
            self.assertIsNotNone(s.latent_energy)
            self.assertIsNotNone(s.factor_attributions)
            self.assertIn("topology", s.factor_attributions)
            self.assertIn("velocity", s.factor_attributions)

        # Staged buffer (s2) should have lower predicted risk than critical direct merge (s1)
        self.assertLess(screened.strategies[1].predicted_risk, screened.strategies[0].predicted_risk)
        # Verify recommended strategy index updated to lowest risk strategy (index 1)
        self.assertEqual(screened.recommended_strategy_index, 1)
        # Verify RSI explanation in worker reasoning
        self.assertIn("[RSI Predict-Before-Evaluate]", screened.worker_reasoning)

    def test_layer4_retain_gate_clean_pass(self):
        """Verify that a compliant, low-risk proposal passes the Retain Gate."""
        l4 = Layer4Validation(self.config)

        s = ResolutionStrategy(
            title="Clean Fix",
            description="Safe refactor",
            risk_level=DebtSeverity.LOW,
            estimated_effort_hours=2.0,
            predicted_risk=0.25,
            latent_energy=0.10,
        )
        proposal = ResolutionProposal(
            agent_type="CodeConflictWorker",
            worker_reasoning="Valid solution",
            strategies=[s],
            recommended_strategy_index=0,
        )
        verdict = CriticVerdict(
            verdict=CriticVerdictStatus.APPROVED,
            critique="Everything looks solid and well documented.",
            architectural_integrity_score=0.95,
            strategic_dishonesty_detected=False,
        )

        proposals, verdicts = l4.apply_retain_gate([proposal], [verdict])

        self.assertEqual(verdicts[0].verdict, CriticVerdictStatus.APPROVED)
        self.assertIsNotNone(verdicts[0].retain_gate_report)
        self.assertEqual(verdicts[0].retain_gate_report.status, RetainGateStatus.PASSED)
        self.assertTrue(verdicts[0].retain_gate_report.sandbox_cleared)
        self.assertFalse(verdicts[0].retain_gate_report.dishonesty_detected)

    def test_layer4_retain_gate_dishonesty_veto(self):
        """Verify that strategic dishonesty triggers RETAIN_VETOED."""
        l4 = Layer4Validation(self.config)

        s = ResolutionStrategy(
            title="Sneaky Workaround",
            description="Skip testing",
            risk_level=DebtSeverity.MEDIUM,
            estimated_effort_hours=1.0,
            predicted_risk=0.30,
        )
        proposal = ResolutionProposal(
            strategies=[s],
            recommended_strategy_index=0,
        )
        verdict = CriticVerdict(
            verdict=CriticVerdictStatus.APPROVED,  # Critic had approved before dishonesty scan
            critique="Looks okay on surface.",
            architectural_integrity_score=0.8,
            strategic_dishonesty_detected=True,  # Dishonesty detected!
        )

        proposals, verdicts = l4.apply_retain_gate([proposal], [verdict])

        self.assertEqual(verdicts[0].verdict, CriticVerdictStatus.RETAIN_VETOED)
        self.assertEqual(verdicts[0].retain_gate_report.status, RetainGateStatus.FAILED_DISHONESTY)
        self.assertTrue(verdicts[0].retain_gate_report.dishonesty_detected)
        self.assertIn("[🛑 RSI Retain Gate Veto]", verdicts[0].critique)

    def test_layer4_retain_gate_sandbox_alert_veto(self):
        """Verify that a NemoClaw sandbox violation triggers RETAIN_VETOED."""
        l4 = Layer4Validation(self.config)

        s = ResolutionStrategy(
            title="Sandbox Breaker",
            description="Accesses unauthorized file descriptor",
            risk_level=DebtSeverity.HIGH,
            estimated_effort_hours=3.0,
            predicted_risk=0.45,
        )
        proposal = ResolutionProposal(
            strategies=[s],
            recommended_strategy_index=0,
        )
        verdict = CriticVerdict(
            verdict=CriticVerdictStatus.APPROVED,
            critique="[🚨 NVIDIA NemoClaw Sandbox Alert] Unauthorized syscall flagged.",
            architectural_integrity_score=0.7,
            strategic_dishonesty_detected=False,
        )

        proposals, verdicts = l4.apply_retain_gate([proposal], [verdict])

        self.assertEqual(verdicts[0].verdict, CriticVerdictStatus.RETAIN_VETOED)
        self.assertEqual(verdicts[0].retain_gate_report.status, RetainGateStatus.FAILED_SANDBOX)
        self.assertFalse(verdicts[0].retain_gate_report.sandbox_cleared)

    def test_layer4_retain_gate_latent_energy_veto(self):
        """Verify that predicted latent risk >= 0.90 triggers RETAIN_VETOED."""
        l4 = Layer4Validation(self.config)

        s = ResolutionStrategy(
            title="High Energy Disruption",
            description="Re-architects entire core engine",
            risk_level=DebtSeverity.CRITICAL,
            estimated_effort_hours=40.0,
            predicted_risk=0.94,  # Exceeds 0.90 threshold
        )
        proposal = ResolutionProposal(
            strategies=[s],
            recommended_strategy_index=0,
        )
        verdict = CriticVerdict(
            verdict=CriticVerdictStatus.APPROVED,
            critique="Conceptually approved by human engineer.",
            architectural_integrity_score=0.9,
            strategic_dishonesty_detected=False,
        )

        proposals, verdicts = l4.apply_retain_gate([proposal], [verdict])

        self.assertEqual(verdicts[0].verdict, CriticVerdictStatus.RETAIN_VETOED)
        self.assertEqual(verdicts[0].retain_gate_report.status, RetainGateStatus.FAILED_ENERGY)
        self.assertIn("exceeds safe tolerance threshold", verdicts[0].retain_gate_report.reason)

    def test_layer4_retain_gate_crr_budget_veto(self):
        """Verify that CRR ratio > 0.30 triggers RETAIN_VETOED."""
        l4 = Layer4Validation(self.config)

        s = ResolutionStrategy(
            title="Expensive Refactor",
            description="Costly rework",
            risk_level=DebtSeverity.MEDIUM,
            estimated_effort_hours=5.0,
            predicted_risk=0.40,
        )
        proposal = ResolutionProposal(
            strategies=[s],
            recommended_strategy_index=0,
        )
        verdict = CriticVerdict(
            verdict=CriticVerdictStatus.APPROVED,
            critique="Approved.",
            architectural_integrity_score=0.9,
            strategic_dishonesty_detected=False,
        )

        state = PWMPipelineState()
        state.crr = CRRResult(
            crr=0.42,  # > 0.30 ceiling!
            estimated_rework_hours=100.0,
        )

        proposals, verdicts = l4.apply_retain_gate([proposal], [verdict], state=state)

        self.assertEqual(verdicts[0].verdict, CriticVerdictStatus.RETAIN_VETOED)
        self.assertEqual(verdicts[0].retain_gate_report.status, RetainGateStatus.FAILED_CRR_BUDGET)
        self.assertIn("CRR economic ceiling exceeded", verdicts[0].retain_gate_report.reason)

    def test_closed_loop_rsi_experience_cycle(self):
        """
        Verify the full closed-loop RSI cycle:
        Propose -> Predict -> Select -> Evaluate -> Learn -> Retain
        """
        # 1. Propose & Predict
        s1 = ResolutionStrategy(
            title="A", description="merge", risk_level=DebtSeverity.HIGH, predicted_risk=0.75
        )
        s2 = ResolutionStrategy(
            title="B", description="buffer", risk_level=DebtSeverity.LOW, predicted_risk=0.20
        )
        proposal = ResolutionProposal(
            strategies=[s1, s2],
            recommended_strategy_index=1,  # Predict-Before-Evaluate selected s2
        )

        # 2. Evaluate & Retain Gate
        l4 = Layer4Validation(self.config)
        verdict = CriticVerdict(
            verdict=CriticVerdictStatus.APPROVED,
            critique="Passed all checks.",
        )
        proposals, verdicts = l4.apply_retain_gate([proposal], [verdict])
        self.assertEqual(verdicts[0].verdict, CriticVerdictStatus.APPROVED)

        # 3. Learn & Calibrate
        pred_state = [0.1] * 64
        act_state = [0.12] * 64
        act_state[16] += 0.3  # Perturb velocity factor

        factor_errors = self.calibrator.calculate_factorized_grounding_error(pred_state, act_state)
        self.assertGreater(factor_errors["velocity"], 0.0)

        updated_weights = self.calibrator.update_factor_weights(factor_errors)
        self.assertIn("velocity", updated_weights)

        # 4. Retain experience in trajectory buffer
        self.calibrator.record_trajectory_experience(
            action_name=s2.title,
            predicted_risk=s2.predicted_risk,
            actual_state=act_state,
            outcome_verdict=verdicts[0].verdict.value,
        )

        self.assertEqual(len(self.calibrator.trajectory_buffer), 1)
        entry = self.calibrator.trajectory_buffer[0]
        self.assertEqual(entry["action_name"], "B")
        self.assertEqual(entry["outcome_verdict"], "approved")
        self.assertTrue(entry["has_actual_state"])


if __name__ == "__main__":
    unittest.main()
