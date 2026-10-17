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
Tests for Asymmetric Quasimetric Latent Energy & CVaR Risk Pre-Screening (Phase 3)
=================================================================================

Verifies:
1. For gamma_rev = 1.0, quasimetric_latent_energy == euclidean_norm within 10^-6.
2. For gamma_rev = 0.1, a high-lock-in irreversible strategy is rejected in favor
   of a reversible staging strategy even when base Euclidean distances are identical.
3. CVaR_0.95 estimation penalizes distribution tail risk.
4. Generalized CRR engine includes quasimetric irreversible rework friction.
"""

from __future__ import annotations

import unittest
import numpy as np

from pwm.config import PWMConfig
from pwm.ingestion.models import (
    DebtSeverity,
    IntegrationDebtReport,
    ResolutionProposal,
    ResolutionStrategy,
)
from pwm.layers.layer3_orchestration import Layer3Orchestration
from pwm.simulation.calibration import SystemIdentificationVector
from pwm.simulation.crr_engine import (
    CRREngine,
    compute_cvar_95,
    quasimetric_latent_energy,
)


class TestQuasimetricPreScreening(unittest.IsolatedAsyncioTestCase):

    def setUp(self):
        self.config = PWMConfig.from_env()
        self.config.verbose = False
        self.l3 = Layer3Orchestration(self.config)

    def test_quasimetric_matches_euclidean_for_reversible_environment(self):
        """
        Verify that for gamma_rev = 1.0 (pure software/agile),
        quasimetric_latent_energy is strictly identical to Euclidean distance
        within floating point tolerance (< 10^-6).
        """
        np.random.seed(42)
        s = np.random.randn(64)
        s_next = s + np.random.randn(64) * 0.2

        euclidean = float(np.linalg.norm(s_next - s))

        # Test with z_env having gamma_rev = 1.0
        z_env_soft = SystemIdentificationVector(reversibility=1.0)
        q_energy = quasimetric_latent_energy(s, s_next, z_env=z_env_soft)

        self.assertAlmostEqual(q_energy, euclidean, places=6)
        self.assertLess(abs(q_energy - euclidean), 1e-6)

        # Test without z_env (defaults to gamma_rev = 1.0)
        q_energy_default = quasimetric_latent_energy(s, s_next)
        self.assertAlmostEqual(q_energy_default, euclidean, places=6)

    def test_quasimetric_asymmetry_penalizes_irreversible_lock_in(self):
        """
        Verify that transitioning from s to an irreversible locked-in state s_lock
        costs significantly MORE than remaining reversible, when gamma_rev = 0.1.
        """
        s = np.zeros(64)
        # s_rev is reversible (negative or zero lock-in projection)
        s_rev = np.zeros(64)
        s_rev[1] = -0.5

        # s_lock has identical Euclidean norm (0.5), but positive resource lock-in
        s_lock = np.zeros(64)
        s_lock[1] = 0.5

        self.assertAlmostEqual(float(np.linalg.norm(s_rev - s)), float(np.linalg.norm(s_lock - s)))

        z_env_physical = SystemIdentificationVector(reversibility=0.1)

        energy_rev = quasimetric_latent_energy(s, s_rev, z_env=z_env_physical)
        energy_lock = quasimetric_latent_energy(s, s_lock, z_env=z_env_physical)

        # Irreversible lock-in should have strictly higher energy
        self.assertGreater(energy_lock, energy_rev)

    def test_cvar_95_tail_risk_penalization(self):
        """
        Verify that CVaR_0.95 estimates the expected tail risk above VaR_0.95
        and penalizes higher stochasticity sigma_exo.
        """
        mean_risk = 0.35
        # Under zero stochasticity, CVaR_0.95 == mean_risk
        cvar_zero = compute_cvar_95(mean_risk, sigma_exo=0.0)
        self.assertEqual(cvar_zero, mean_risk)

        # Under exogenous stochasticity, tail risk is magnified
        cvar_high_var = compute_cvar_95(mean_risk, sigma_exo=0.25)
        self.assertGreater(cvar_high_var, mean_risk)
        self.assertLessEqual(cvar_high_var, 1.0)

    async def test_layer3_pre_screening_rejects_lock_in_under_low_reversibility(self):
        """
        Verify that in an irreversible environment (gamma_rev = 0.10),
        Layer 3 pre-screening rejects a high-commitment direct merge
        in favor of a reversible buffer/stage strategy.
        """
        z_env_physical = SystemIdentificationVector(
            reversibility=0.10,
            coupling=0.60,
            latency=2.0,
            stochasticity=0.20,
        )

        s_commit = ResolutionStrategy(
            title="Irreversible Direct Committal",
            description="Commit capital and concrete immediately without buffers.",
            risk_level=DebtSeverity.HIGH,
            estimated_effort_hours=8.0,
        )
        s_stage = ResolutionStrategy(
            title="Reversible Staged Verification",
            description="Buffer staging with mock assembly before physical committal.",
            risk_level=DebtSeverity.LOW,
            estimated_effort_hours=12.0,
        )

        proposal = ResolutionProposal(
            strategies=[s_commit, s_stage],
            recommended_strategy_index=0,
        )

        screened = await self.l3.pre_screen_strategies(
            proposal,
            base_state=[0.1] * 64,
            z_env=z_env_physical,
        )

        # Staged strategy must be recommended (index 1)
        self.assertEqual(screened.recommended_strategy_index, 1)
        self.assertIsNotNone(screened.strategies[0].quasimetric_energy)
        self.assertIsNotNone(screened.strategies[1].quasimetric_energy)
        self.assertIsNotNone(screened.strategies[0].cvar_95)
        self.assertIsNotNone(screened.strategies[1].cvar_95)
        self.assertIn("CVaR_0.95", screened.worker_reasoning)
        self.assertIn("quasimetric energy", screened.worker_reasoning)

    def test_crr_engine_quasimetric_friction(self):
        """Verify CRREngine accounts for quasimetric irreversible rework friction."""
        engine = CRREngine(self.config)
        debt = IntegrationDebtReport(total_estimated_rework_hours=10.0)

        # Reversible software case (gamma_rev = 1.0)
        res_soft = engine.calculate(
            debt_report=debt,
            input_tokens=1000,
            output_tokens=1000,
            z_env=SystemIdentificationVector(reversibility=1.0),
            quasimetric_energy=0.25,
        )
        self.assertEqual(res_soft.irreversible_rework_cost_usd, 0.0)

        # Irreversible physical case (gamma_rev = 0.1)
        res_phys = engine.calculate(
            debt_report=debt,
            input_tokens=1000,
            output_tokens=1000,
            z_env=SystemIdentificationVector(reversibility=0.1),
            quasimetric_energy=2.5,
        )
        self.assertGreater(res_phys.irreversible_rework_cost_usd, 0.0)
