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

"""Tests for JEPA Core module (GraphJEPAEncoder, LeJEPASimulator, JEPAWorldModel)."""

import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from pwm.config import PWMConfig
from pwm.ingestion.models import UnifiedProjectGraph, FusedNode, FusedEdge
from pwm.simulation.jepa_core import (
    GraphJEPAEncoder,
    LeJEPASimulator,
    JEPAWorldModel,
    OrthogonalPredictiveFactorizer,
)
from pwm.layers.layer1_observation import Layer1Observation


class TestJEPACore(unittest.IsolatedAsyncioTestCase):

    async def test_graph_jepa_local_embedding(self):
        """Verify deterministic local Graph-JEPA topological embedding."""
        graph = UnifiedProjectGraph(
            nodes=[
                FusedNode(id="pr-1", type="pr", name="PR 1", attributes={}),
                FusedNode(id="issue-1", type="issue", name="Issue 1", attributes={}),
                FusedNode(id="commit-1", type="commit", name="Commit 1", attributes={}),
            ],
            edges=[
                FusedEdge(source_id="pr-1", target_id="issue-1", relation_type="blocks"),
                FusedEdge(source_id="commit-1", target_id="pr-1", relation_type="references"),
            ],
        )

        encoder = GraphJEPAEncoder(endpoint_url="", latent_dim=64)
        result = await encoder.encode(graph)

        self.assertEqual(result["status"], "local_graph_jepa")
        self.assertEqual(len(result["latent_vector"]), 64)
        self.assertEqual(result["node_count"], 3)
        self.assertEqual(result["edge_count"], 2)

    async def test_graph_jepa_remote_endpoint(self):
        """Verify Graph-JEPA remote endpoint calling and fallback."""
        graph = UnifiedProjectGraph(nodes=[], edges=[])
        encoder = GraphJEPAEncoder(endpoint_url="http://mock-jepa:8000/encode-graph", latent_dim=64)

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"latent_vector": [0.5] * 64}

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_resp
            result = await encoder.encode(graph)
            self.assertEqual(result["status"], "graph_jepa_encoded")
            self.assertEqual(result["latent_vector"], [0.5] * 64)

    def test_lejepa_sigreg_score_and_divergence(self):
        """Verify Balestriero & LeCun (2025) SIGReg metric and latent divergence."""
        lejepa = LeJEPASimulator(latent_dim=64, collapse_threshold=0.85)

        # 1. Non-collapsed diverse batch
        diverse_batch = [[float(i * 0.1 + j * 0.05) for j in range(64)] for i in range(10)]
        score, is_collapsed = lejepa.calculate_sigreg_score(diverse_batch)
        self.assertIsInstance(score, float)
        self.assertIsInstance(is_collapsed, bool)

        # 2. Latent divergence calculation
        current = [0.2] * 64
        divergence = lejepa.calculate_latent_divergence(current)
        self.assertTrue(0.0 <= divergence <= 1.0)

    def test_orthogonal_predictive_factorizer_geometry(self):
        """Verify OPF decomposition, lossless synthesis, and orthonormal geometry audit."""
        factorizer = OrthogonalPredictiveFactorizer(latent_dim=64, num_factors=4, factor_dim=16)

        # 1. Geometry audit
        audit = factorizer.audit_geometry()
        self.assertEqual(audit["status"], "geometry_audited")
        self.assertTrue(audit["is_orthonormal"])
        self.assertLess(audit["orthogonality_error"], 1e-6)
        self.assertLess(audit["reconstruction_error"], 1e-6)
        self.assertEqual(audit["num_factors"], 4)
        self.assertEqual(audit["factor_dim"], 16)

        # 2. Decompose and compose lossless invertibility
        state = [float(i * 0.05) for i in range(64)]
        coords = factorizer.decompose(state)
        self.assertEqual(coords.shape, (4, 16))

        reconstructed = factorizer.compose(coords)
        for original_val, recon_val in zip(state, reconstructed.tolist()):
            self.assertAlmostEqual(original_val, recon_val, places=6)

        # 3. Factor action simulation with targeted attributions
        sim = factorizer.simulate_factor_action(
            base_state=state,
            action_name="PR Merge",
            action_type="merge",
            risk_modifier=0.1,
        )
        self.assertIn("factor_energies", sim)
        self.assertIn("factor_attributions", sim)
        self.assertIn("topology", sim["factor_attributions"])
        self.assertIn("velocity", sim["factor_attributions"])
        self.assertIn("architecture", sim["factor_attributions"])
        # Merge should have high topology and architecture attribution
        self.assertGreater(sim["factor_attributions"]["topology"], 0.20)
        self.assertGreater(sim["factor_attributions"]["architecture"], 0.10)
        self.assertAlmostEqual(sum(sim["factor_attributions"].values()), 1.0, places=2)

    async def test_jepa_world_model_counterfactual_rollouts(self):
        """Verify action-conditioned latent rollout counterfactuals with OPF."""
        jepa_wm = JEPAWorldModel(endpoint_url="", latent_dim=64)

        base_state = [0.1] * 64
        actions = [
            {"name": "Immediate Merge", "type": "merge", "risk_modifier": 0.2},
            {"name": "Delayed Merge", "type": "delay", "risk_modifier": -0.1},
        ]

        rollouts = await jepa_wm.simulate_counterfactuals(base_state, actions)
        self.assertEqual(len(rollouts), 2)
        self.assertEqual(rollouts[0]["action"], "Immediate Merge")
        self.assertEqual(rollouts[0]["action_type"], "merge")
        self.assertTrue(0.0 <= rollouts[0]["predicted_risk"] <= 1.0)
        self.assertEqual(rollouts[1]["action_type"], "delay")
        self.assertTrue(rollouts[1]["predicted_risk"] < rollouts[0]["predicted_risk"])
        # Verify factor attributions are returned
        self.assertIn("factor_attributions", rollouts[0])
        self.assertIn("topology", rollouts[0]["factor_attributions"])
        self.assertIn("factor_energies", rollouts[0])


if __name__ == "__main__":
    unittest.main()
