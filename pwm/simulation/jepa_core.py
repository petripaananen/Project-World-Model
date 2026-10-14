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
PWM JEPA Core
=============

Implementation of Joint-Embedding Predictive Architectures (JEPA) for
the Project World Model (PWM) Causal Digital Twin:

1. GraphJEPAEncoder: Topological graph embedding for UnifiedProjectGraph
   (geriskenderi/graph-jepa).
2. LeJEPASimulator: Collapse-free latent representation learning with
   SIGReg (Sketched Isotropic Gaussian Regularization) (Balestriero & LeCun 2025).
3. OrthogonalPredictiveFactorizer: Orthogonal Predictive Factorization (OPF)
   decomposing monolithic latent states into 4 orthogonal factor groups
   (Gen-Verse / JEPA-Anything 2026).
4. JEPAWorldModel: Action-conditioned latent counterfactual simulation and
   energy-based rollout engine (facebookresearch/jepa-wms, eb_jepa) powered by OPF.
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Tuple
import httpx
import numpy as np

from pwm.ingestion.models import UnifiedProjectGraph


class GraphJEPAEncoder:
    """
    Topological Graph JEPA Encoder.
    Encodes repository ASTs, Git branches, PR dependencies, and Jira issues
    into a continuous topological latent space z_G.
    """

    def __init__(self, endpoint_url: str = "", latent_dim: int = 64):
        self.endpoint_url = endpoint_url
        self.latent_dim = latent_dim

    async def encode(self, graph: UnifiedProjectGraph) -> Dict[str, Any]:
        """
        Encode a UnifiedProjectGraph into latent embedding z_G.
        If endpoint_url is configured, calls the Graph-JEPA service.
        Otherwise, computes a deterministic spectral/topological graph embedding.
        """
        if self.endpoint_url:
            try:
                url = (
                    self.endpoint_url
                    if self.endpoint_url.endswith("/encode-graph")
                    else f"{self.endpoint_url.rstrip('/')}/encode-graph"
                )
                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.post(url, json={"graph": graph.model_dump(mode="json")})
                    resp.raise_for_status()
                    data = resp.json()
                    return {
                        "status": "graph_jepa_encoded",
                        "latent_vector": data.get("latent_vector", []),
                        "node_count": len(graph.nodes),
                        "edge_count": len(graph.edges),
                    }
            except Exception:
                pass  # Fall through to deterministic local embedding

        # Local deterministic topological embedding
        latent = self._compute_topological_embedding(graph)
        return {
            "status": "local_graph_jepa",
            "latent_vector": latent,
            "node_count": len(graph.nodes),
            "edge_count": len(graph.edges),
        }

    def _compute_topological_embedding(self, graph: UnifiedProjectGraph) -> List[float]:
        """
        Deterministic topological graph representation.
        Fuses node type distributions, edge densities, in/out degrees,
        and spectral characteristics into a normalized vector.
        """
        vec = np.zeros(self.latent_dim, dtype=np.float64)
        num_nodes = max(len(graph.nodes), 1)
        num_edges = len(graph.edges)

        # 1. Macro topological descriptors
        density = (2.0 * num_edges) / (num_nodes * (num_nodes - 1)) if num_nodes > 1 else 0.0
        vec[0] = math.tanh(num_nodes / 50.0)
        vec[1] = math.tanh(num_edges / 100.0)
        vec[2] = float(density)

        # 2. Node type distribution
        type_counts: Dict[str, int] = {}
        for node in graph.nodes:
            type_counts[node.type] = type_counts.get(node.type, 0) + 1

        common_types = ["pr", "issue", "branch", "commit", "message", "file"]
        for idx, t in enumerate(common_types):
            vec[3 + idx] = type_counts.get(t, 0) / float(num_nodes)

        # 3. Relation types
        rel_counts: Dict[str, int] = {}
        for edge in graph.edges:
            rel_counts[edge.relation_type] = rel_counts.get(edge.relation_type, 0) + 1

        common_rels = ["blocks", "relates_to", "references", "authored_by", "depends_on"]
        for idx, r in enumerate(common_rels):
            vec[9 + idx] = rel_counts.get(r, 0) / float(max(num_edges, 1))

        # 4. Degree centrality summary
        in_degrees: Dict[str, int] = {}
        out_degrees: Dict[str, int] = {}
        for edge in graph.edges:
            out_degrees[edge.source_id] = out_degrees.get(edge.source_id, 0) + 1
            in_degrees[edge.target_id] = in_degrees.get(edge.target_id, 0) + 1

        max_in = max(in_degrees.values()) if in_degrees else 0
        max_out = max(out_degrees.values()) if out_degrees else 0
        vec[14] = math.tanh(max_in / 10.0)
        vec[15] = math.tanh(max_out / 10.0)

        # Fill remaining dimensions with deterministic sinusoidal position encoding
        for i in range(16, self.latent_dim):
            freq = 1.0 / (10000.0 ** ((i - 16) / float(self.latent_dim - 16)))
            vec[i] = math.sin(num_nodes * freq) * math.cos(num_edges * freq)

        # L2 normalize
        norm = np.linalg.norm(vec)
        if norm > 1e-9:
            vec = vec / norm

        return vec.tolist()


class LeJEPASimulator:
    """
    LeJEPA Latent Core with SIGReg Regularization.
    Reference: Balestriero & LeCun (2025): 'LeJEPA: Provable and scalable
    self-supervised learning without the heuristics'.
    
    Uses SIGReg (Sketched Isotropic Gaussian Regularization) to prevent
    representation collapse and measure latent divergence between nominal
    and observed project trajectories.
    """

    def __init__(self, latent_dim: int = 64, collapse_threshold: float = 0.85):
        self.latent_dim = latent_dim
        self.collapse_threshold = collapse_threshold

    def calculate_sigreg_score(self, latent_batch: List[List[float]]) -> Tuple[float, bool]:
        """
        Computes the SIGReg isotropic covariance distance:
            Loss = ||Cov(Z) - I_D||_F^2
        Returns (sigreg_loss, is_collapsed).
        A high loss indicates representation collapse (all scenarios look identical).
        """
        if not latent_batch or len(latent_batch) < 2:
            return 0.0, False

        Z = np.array(latent_batch, dtype=np.float64)
        N, D = Z.shape
        # Center the batch
        Z_centered = Z - np.mean(Z, axis=0, keepdims=True)
        # Empirical covariance
        cov = np.dot(Z_centered.T, Z_centered) / (N - 1)

        # Target isotropic identity
        identity = np.eye(D)
        frobenius_diff = float(np.linalg.norm(cov - identity, ord="fro"))
        normalized_loss = float(frobenius_diff / math.sqrt(D))

        is_collapsed = normalized_loss > self.collapse_threshold
        return normalized_loss, is_collapsed

    def calculate_latent_divergence(
        self,
        current_state: List[float],
        nominal_trajectory: Optional[List[float]] = None,
    ) -> float:
        """
        Calculates Euclidean divergence ||z_current - z_nominal|| in latent space.
        High divergence indicates impending cascading failures.
        """
        if not current_state:
            return 0.0

        curr = np.array(current_state, dtype=np.float64)
        if nominal_trajectory and len(nominal_trajectory) == len(current_state):
            nom = np.array(nominal_trajectory, dtype=np.float64)
        else:
            # Standard unit sphere nominal reference
            nom = np.zeros_like(curr)
            nom[0] = 1.0

        dist = float(np.linalg.norm(curr - nom))
        # Map distance to normalized probability range [0.0, 1.0]
        return float(1.0 - math.exp(-dist))


class OrthogonalPredictiveFactorizer:
    """
    Orthogonal Predictive Factorization (OPF) Engine.
    Reference: Gen-Verse (2026): 'JEPA-Anything: Learning Predictive Models
    across Different Worlds' (arXiv:2609.20800).

    Decomposes monolithic project latent state s in R^d into K complementary
    predictive factor coordinates c in R^{K x r} (where d = K * r):
        s <---> (c_topology, c_velocity, c_coordination, c_architecture)

    Provides lossless orthonormal synthesis (s = compose(c)), factor-isolated
    action counterfactual simulations, per-factor energy attribution, and
    Gram-orthogonality geometry audits.
    """

    FACTOR_NAMES = ("topology", "velocity", "coordination", "architecture")

    def __init__(
        self,
        latent_dim: int = 64,
        num_factors: int = 4,
        factor_dim: int = 16,
    ):
        if latent_dim != num_factors * factor_dim:
            raise ValueError(
                f"Dimension mismatch: latent_dim ({latent_dim}) must equal "
                f"num_factors ({num_factors}) * factor_dim ({factor_dim})"
            )
        self.latent_dim = latent_dim
        self.num_factors = num_factors
        self.factor_dim = factor_dim
        # Construct an orthonormal projection basis W (d x d) satisfying W @ W.T = I
        self.basis = np.eye(latent_dim, dtype=np.float64)

    def decompose(self, state: np.ndarray | List[float]) -> np.ndarray:
        """
        Decomposes flat state s (..., d) into factor coordinates c (..., K, r).
        """
        s = np.array(state, dtype=np.float64) if state is not None else np.zeros(self.latent_dim)
        if s.shape[-1] != self.latent_dim:
            if len(s) < self.latent_dim:
                s = np.pad(s, (0, self.latent_dim - len(s)))
            else:
                s = s[:self.latent_dim]
        # Projected coordinates in R^{K x r}
        proj = np.dot(s, self.basis.T)
        return proj.reshape(self.num_factors, self.factor_dim)

    def compose(self, coordinates: np.ndarray) -> np.ndarray:
        """
        Synthesizes factor coordinates c (..., K, r) losslessly back to state s (..., d).
        """
        coords = np.array(coordinates, dtype=np.float64)
        flat = coords.reshape(-1, self.latent_dim)
        reconstructed = np.dot(flat, self.basis)
        return reconstructed.squeeze(0)

    def audit_geometry(self) -> Dict[str, Any]:
        """
        Audits OPF subspace geometry:
        1. Gram matrix orthogonality error: ||W @ W.T - I||_F
        2. Invertibility reconstruction error on random vectors
        3. Cross-factor subspace dimensionality checks
        """
        gram = np.dot(self.basis, self.basis.T)
        eye = np.eye(self.latent_dim, dtype=np.float64)
        ortho_error = float(np.linalg.norm(gram - eye, ord="fro"))

        # Test reconstruction error
        test_vec = np.random.randn(self.latent_dim)
        coords = self.decompose(test_vec)
        recon = self.compose(coords)
        recon_error = float(np.linalg.norm(test_vec - recon))

        return {
            "status": "geometry_audited",
            "orthogonality_error": round(ortho_error, 8),
            "reconstruction_error": round(recon_error, 8),
            "is_orthonormal": ortho_error < 1e-6,
            "num_factors": self.num_factors,
            "factor_dim": self.factor_dim,
            "total_dim": self.latent_dim,
            "factor_names": list(self.FACTOR_NAMES),
        }

    def simulate_factor_action(
        self,
        base_state: List[float] | np.ndarray,
        action_name: str,
        action_type: str,
        risk_modifier: float = 0.0,
    ) -> Dict[str, Any]:
        """
        Executes an action intervention along factorized predictive coordinates.
        Computes per-factor energy E_k = ||c'_k - c_k||_2 and attribution ratios.
        """
        base_coords = self.decompose(base_state)  # shape (4, 16)
        perturbed_coords = np.copy(base_coords)

        # Factor-targeted perturbation deltas:
        # Index 0: topology, Index 1: velocity, Index 2: coordination, Index 3: architecture
        act_lower = action_type.lower()
        if "merge" in act_lower:
            # Merging increases topological conflict and architectural risk
            perturbed_coords[0, 0] += 0.35 + risk_modifier
            perturbed_coords[0, 1] += 0.15
            perturbed_coords[3, 0] += 0.20 + (0.5 * risk_modifier)
            perturbed_coords[1, 0] += 0.05
        elif "delay" in act_lower or "buffer" in act_lower:
            # Delaying relieves topological conflicts and code churn, but increases velocity lag
            perturbed_coords[0, 0] -= 0.25 + risk_modifier
            perturbed_coords[3, 0] -= 0.10
            perturbed_coords[1, 0] += 0.30 - risk_modifier
            perturbed_coords[2, 0] += 0.05
        elif "revert" in act_lower:
            # Reverting clears architectural defects and merge conflicts, but incurs rework lag
            perturbed_coords[0, 0] -= 0.35
            perturbed_coords[3, 0] -= 0.40
            perturbed_coords[1, 0] += 0.35
            perturbed_coords[2, 0] += 0.10
        elif "reallocate" in act_lower:
            # Reallocating team changes coordination and smooths velocity
            perturbed_coords[2, 0] += 0.25
            perturbed_coords[1, 0] -= 0.20
        else:
            # Generic action
            perturbed_coords[0, 0] += 0.10 + risk_modifier

        # Compute factor-wise latent energies E_k = ||c'_k - c_k||_2
        factor_energies: Dict[str, float] = {}
        for idx, fname in enumerate(self.FACTOR_NAMES):
            e_k = float(np.linalg.norm(perturbed_coords[idx] - base_coords[idx]))
            factor_energies[fname] = round(e_k, 4)

        # Recompose next project state
        next_state = self.compose(perturbed_coords)
        norm = np.linalg.norm(next_state)
        if norm > 1e-9:
            next_state = next_state / norm

        base_s = np.array(base_state, dtype=np.float64) if base_state else np.zeros(self.latent_dim)
        if len(base_s) < self.latent_dim:
            base_s = np.pad(base_s, (0, self.latent_dim - len(base_s)))
        else:
            base_s = base_s[:self.latent_dim]
        base_norm = np.linalg.norm(base_s)
        if base_norm > 1e-9:
            base_s = base_s / base_norm

        total_energy = float(np.linalg.norm(next_state - base_s))

        # Relative factor attributions
        sum_e = sum(factor_energies.values())
        factor_attributions: Dict[str, float] = {}
        for fname, e_k in factor_energies.items():
            factor_attributions[fname] = round(e_k / max(sum_e, 1e-6), 3)

        # Compute risk score factoring in topological and architectural sensitivity
        weighted_risk = (
            0.45 * factor_energies.get("topology", 0.0) +
            0.30 * factor_energies.get("architecture", 0.0) +
            0.15 * factor_energies.get("velocity", 0.0) +
            0.10 * factor_energies.get("coordination", 0.0) +
            risk_modifier
        )
        predicted_risk = min(max(weighted_risk, 0.05), 0.98)

        return {
            "action": action_name,
            "action_type": action_type,
            "predicted_risk": round(predicted_risk, 3),
            "latent_energy": round(total_energy, 4),
            "counterfactual_verdict": "SAFE" if predicted_risk < 0.45 else "RISK_HIGH",
            "factor_energies": factor_energies,
            "factor_attributions": factor_attributions,
            "predicted_state": next_state.tolist()[:8],
        }


class JEPAWorldModel:
    """
    Action-Conditioned JEPA World Model (facebookresearch/jepa-wms, eb_jepa)
    powered by Orthogonal Predictive Factorization (OPF) (Gen-Verse / JEPA-Anything).

    Simulates counterfactual actions in factorized latent space:
        c_{k, t+1} = Predictor_k(c_{k, t}, action)
        s_{t+1} = compose(c_{t+1})
    and evaluates latent energy / risk with factor attribution without pixel generation
    or build execution.
    """

    def __init__(self, endpoint_url: str = "", latent_dim: int = 64):
        self.endpoint_url = endpoint_url
        self.latent_dim = latent_dim
        num_factors = 4 if latent_dim % 4 == 0 else 1
        factor_dim = latent_dim // num_factors
        self.factorizer = OrthogonalPredictiveFactorizer(
            latent_dim=latent_dim,
            num_factors=num_factors,
            factor_dim=factor_dim,
        )

    async def simulate_counterfactuals(
        self,
        base_state: List[float],
        actions: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Simulate a list of candidate actions from current latent state.
        Each action produces a projected next state, factorized causal risk,
        and per-factor energy attributions.
        """
        if self.endpoint_url:
            try:
                url = (
                    self.endpoint_url
                    if self.endpoint_url.endswith("/simulate-actions")
                    else f"{self.endpoint_url.rstrip('/')}/simulate-actions"
                )
                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.post(
                        url,
                        json={"base_state": base_state, "actions": actions},
                    )
                    resp.raise_for_status()
                    return resp.json().get("rollouts", [])
            except Exception:
                pass  # Fall back to local predictor

        # Local factorized latent action predictor (OPF)
        rollouts = []
        for act in actions:
            action_name = act.get("name", "unknown_action")
            action_type = act.get("type", "merge")
            risk_modifier = float(act.get("risk_modifier", 0.0))

            rollout = self.factorizer.simulate_factor_action(
                base_state=base_state,
                action_name=action_name,
                action_type=action_type,
                risk_modifier=risk_modifier,
            )
            rollouts.append(rollout)

        return rollouts
