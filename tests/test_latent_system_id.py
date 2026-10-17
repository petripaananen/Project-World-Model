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
Tests for Continuous Latent System Identification (z_env) & Intrinsic Event-Clock (Phase 2)
===========================================================================================

Verifies:
1. Low-reversibility / high-lock-in telemetry drives gamma_rev -> 0.
2. Gram matrix orthogonality check ||W W^T - I||_F < 10^-6 strictly holds after z_env conditioning.
3. TimeWarpedClock triggers accurately on high-entropy state flux and stagnation anomalies.
"""

from __future__ import annotations

import shutil
import tempfile
import unittest
from pathlib import Path
import numpy as np

from pwm.config import PWMConfig
from pwm.ingestion.models import (
    ActorNode,
    ActorType,
    ArtifactNode,
    OperationType,
    UniversalEventTuple,
)
from pwm.simulation.calibration import (
    SystemIdentificationVector,
    TimeWarpedClock,
    WorldModelCalibrator,
)
from pwm.simulation.jepa_core import OrthogonalPredictiveFactorizer, JEPAWorldModel


class TestLatentSystemIdentification(unittest.IsolatedAsyncioTestCase):

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

    def test_irreversible_logs_drive_gamma_rev_to_zero(self):
        """
        Verify that physical/capital irreversible mutation logs
        (reversibility_weight = 0.05, OperationType.COMMIT_RESOURCE)
        automatically drive gamma_rev close to zero.
        """
        actor = ActorNode(actor_id="act-epc", name="EPC Lead Contractor", actor_type=ActorType.CONTRACTOR)
        irreversible_events = [
            UniversalEventTuple(
                actor=actor,
                operation=OperationType.COMMIT_RESOURCE,
                artifact=ArtifactNode(
                    artifact_id=f"art-concrete-pour-{i}",
                    name=f"Foundation Pour Zone {i}",
                    reversibility_weight=0.02,
                ),
                dependencies=[f"art-concrete-pour-{i-1}"] if i > 0 else [],
                constraints=["precedence: foundation -> framing"],
            )
            for i in range(10)
        ]

        z_env = self.calibrator.infer_system_identification(event_tuples=irreversible_events)
        self.assertIsInstance(z_env, SystemIdentificationVector)
        # Low reversibility should be driven <= 0.10
        self.assertLessEqual(z_env.reversibility, 0.10)
        self.assertGreaterEqual(z_env.reversibility, 0.0)

        # In contrast, pure software reversible tuples drive gamma_rev close to 1.0
        soft_actor = ActorNode(actor_id="act-dev", name="Backend Dev", actor_type=ActorType.HUMAN)
        software_events = [
            UniversalEventTuple(
                actor=soft_actor,
                operation=OperationType.MUTATE,
                artifact=ArtifactNode(
                    artifact_id=f"file-{i}.py",
                    name=f"file_{i}.py",
                    reversibility_weight=1.0,
                ),
            )
            for i in range(10)
        ]
        z_env_soft = self.calibrator.infer_system_identification(event_tuples=software_events)
        self.assertGreaterEqual(z_env_soft.reversibility, 0.90)

    def test_gram_matrix_orthogonality_invariant_preserved(self):
        """
        Verify that conditioning on z_env preserves the strict Gram matrix
        orthonormality invariant ||W W^T - I||_F < 10^-6 across the 4 subspaces.
        """
        factorizer = OrthogonalPredictiveFactorizer(latent_dim=64, num_factors=4, factor_dim=16)

        # Baseline geometry check
        audit_initial = factorizer.audit_geometry()
        self.assertTrue(audit_initial["is_orthonormal"])
        self.assertLess(audit_initial["orthogonality_error"], 1e-6)

        # Simulate actions under extreme physical z_env (gamma_rev=0.05, coupling=0.8, latency=5.0)
        z_env_extreme = SystemIdentificationVector(
            reversibility=0.05,
            coupling=0.80,
            latency=5.0,
            stochasticity=0.40,
        )

        base_state = [0.1] * 64
        rollout = factorizer.simulate_factor_action(
            base_state=base_state,
            action_name="Poured Concrete Committal",
            action_type="merge",
            risk_modifier=0.1,
            z_env=z_env_extreme,
        )

        self.assertIn("predicted_risk", rollout)
        self.assertIn("latent_energy", rollout)
        self.assertIn("factor_energies", rollout)
        self.assertEqual(len(rollout["factor_energies"]), 4)

        # Post-rollout geometry check — basis W must remain strictly orthonormal
        audit_post = factorizer.audit_geometry()
        self.assertTrue(audit_post["is_orthonormal"])
        self.assertLess(audit_post["orthogonality_error"], 1e-6)

    def test_time_warped_clock_entropy_flux_and_stagnation(self):
        """
        Verify that TimeWarpedClock steps on high state flux (||s_t - s_{t-1}||_2 >= theta_flux)
        and detects stagnation anomalies (TimeSinceLastStep > tau_max).
        """
        clock = TimeWarpedClock(theta_flux=0.15, tau_max=100.0)

        # 1. First step always initializes and triggers
        s0 = [0.0] * 64
        t0 = 1000.0
        self.assertTrue(clock.step(s0, current_time=t0))
        self.assertEqual(clock.step_count, 1)

        # 2. Sub-threshold flux (< 0.15) and fresh time (< 100s) -> False
        s_small_delta = [0.01] * 64  # Norm difference = sqrt(64 * 0.0001) = 0.08 < 0.15
        self.assertFalse(clock.step(s_small_delta, current_time=t0 + 10.0))
        self.assertEqual(clock.step_count, 1)

        # 3. High-entropy flux burst (>= 0.15) -> True
        s_burst = [0.05] * 64  # Norm difference = sqrt(64 * 0.0025) = 0.40 >= 0.15
        self.assertTrue(clock.step(s_burst, current_time=t0 + 20.0))
        self.assertEqual(clock.step_count, 2)

        # 4. Stagnation trigger: zero flux delta but TimeSinceLastStep exceeds tau_max (100.0s) -> True
        self.assertTrue(clock.step(s_burst, current_time=t0 + 20.0 + 105.0))
        self.assertEqual(clock.step_count, 3)

    def test_calibrator_z_env_persistence(self):
        """Verify saving and loading z_env in calibration_state.json."""
        self.calibrator.z_env = SystemIdentificationVector(
            reversibility=0.33,
            coupling=0.77,
            latency=2.5,
            stochasticity=0.15,
        )
        self.calibrator.save_state()

        new_calibrator = WorldModelCalibrator(self.config, state_path=self.state_file)
        new_calibrator.load_state()

        self.assertAlmostEqual(new_calibrator.z_env.reversibility, 0.33, places=2)
        self.assertAlmostEqual(new_calibrator.z_env.coupling, 0.77, places=2)
        self.assertAlmostEqual(new_calibrator.z_env.latency, 2.5, places=2)
        self.assertAlmostEqual(new_calibrator.z_env.stochasticity, 0.15, places=2)
