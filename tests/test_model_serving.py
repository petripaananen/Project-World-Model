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

"""Tests for JEPA Model Serving Microservices (Graph-JEPA, JEPA-WMs, Point-JEPA)."""

import unittest
from httpx import AsyncClient, ASGITransport

from pwm.ingestion.models import UnifiedProjectGraph, FusedNode, FusedEdge
from pwm.serving.graph_jepa_server import create_graph_jepa_app
from pwm.serving.jepa_wm_server import create_jepa_wm_app
from pwm.serving.point_jepa_server import create_point_jepa_app
from pwm.simulation.jepa_core import GraphJEPAEncoder, JEPAWorldModel


class TestModelServing(unittest.IsolatedAsyncioTestCase):

    async def test_graph_jepa_service(self):
        """Test Graph-JEPA service endpoints."""
        app = create_graph_jepa_app()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Health check
            resp = await client.get("/health")
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertEqual(data["status"], "healthy")
            self.assertEqual(data["model"], "graph-jepa-v1")

            # 2. Encode graph
            graph = UnifiedProjectGraph(
                nodes=[
                    FusedNode(id="pr-1", type="pr", name="PR 1", attributes={}),
                    FusedNode(id="issue-1", type="issue", name="Issue 1", attributes={}),
                ],
                edges=[
                    FusedEdge(source_id="pr-1", target_id="issue-1", relation_type="blocks"),
                ],
            )
            encode_resp = await client.post(
                "/encode-graph",
                json={"graph": graph.model_dump(mode="json"), "latent_dim": 64},
            )
            self.assertEqual(encode_resp.status_code, 200)
            encode_data = encode_resp.json()
            self.assertEqual(encode_data["status"], "graph_jepa_encoded")
            self.assertEqual(len(encode_data["latent_vector"]), 64)
            self.assertEqual(encode_data["node_count"], 2)
            self.assertEqual(encode_data["edge_count"], 1)

    async def test_jepa_wm_service(self):
        """Test JEPA-WMs service endpoints (with OPF)."""
        app = create_jepa_wm_app()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Health check
            resp = await client.get("/health")
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertEqual(data["status"], "healthy")
            self.assertIn("jepa-wm-v1", data["model"])
            self.assertTrue(data.get("opf_enabled", False))

            # 2. Geometry audit
            audit_resp = await client.get("/audit-geometry")
            self.assertEqual(audit_resp.status_code, 200)
            audit_data = audit_resp.json()
            self.assertEqual(audit_data["status"], "geometry_audited")
            self.assertTrue(audit_data["is_orthonormal"])

            # 3. Simulate actions
            base_state = [0.1] * 64
            actions = [
                {"name": "Immediate Integration", "type": "merge", "risk_modifier": 0.25},
                {"name": "Buffered Staging", "type": "delay", "risk_modifier": -0.15},
            ]
            sim_resp = await client.post(
                "/simulate-actions",
                json={"base_state": base_state, "actions": actions, "latent_dim": 64},
            )
            self.assertEqual(sim_resp.status_code, 200)
            sim_data = sim_resp.json()
            self.assertEqual(sim_data["status"], "rollouts_simulated")
            rollouts = sim_data["rollouts"]
            self.assertEqual(len(rollouts), 2)
            self.assertEqual(rollouts[0]["action"], "Immediate Integration")
            self.assertGreater(rollouts[0]["predicted_risk"], rollouts[1]["predicted_risk"])
            self.assertIn("latent_energy", rollouts[0])
            self.assertIn("factor_attributions", rollouts[0])
            self.assertIn("topology", rollouts[0]["factor_attributions"])

    async def test_point_jepa_service(self):
        """Test Point-JEPA 3D geometry service endpoints."""
        app = create_point_jepa_app()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/health")
            self.assertEqual(resp.status_code, 200)

            # Sample 3D tetrahedron vertices
            points = [
                [0.0, 0.0, 0.0],
                [1.0, 0.0, 0.0],
                [0.5, 0.866, 0.0],
                [0.5, 0.288, 0.816],
            ]
            geom_resp = await client.post(
                "/encode-geometry",
                json={"points": points, "latent_dim": 32},
            )
            self.assertEqual(geom_resp.status_code, 200)
            geom_data = geom_resp.json()
            self.assertEqual(geom_data["status"], "point_jepa_encoded")
            self.assertEqual(len(geom_data["latent_vector"]), 32)
            self.assertEqual(geom_data["point_count"], 4)
            self.assertGreater(geom_data["bounding_radius"], 0.0)


if __name__ == "__main__":
    unittest.main()
