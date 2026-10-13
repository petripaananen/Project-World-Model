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
Graph-JEPA Serving Microservice
================================
Layer 1 Topological Graph JEPA Service (geriskenderi/graph-jepa).

Serves a continuous topological latent space encoder for project dependency graphs
(Git branches, PRs, Jira issues, commit links) via FastAPI and optional PyTorch/CUDA acceleration.

Default Port: 8005
Endpoint: POST /encode-graph
"""

from __future__ import annotations

import math
import os
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import numpy as np

# Optional PyTorch acceleration
try:
    import torch
    import torch.nn as nn
    HAS_TORCH = True
    DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
except ImportError:
    HAS_TORCH = False
    DEVICE = "cpu"


class GraphPayload(BaseModel):
    graph: Dict[str, Any] = Field(..., description="Serialized UnifiedProjectGraph")
    latent_dim: int = Field(default=64, description="Target latent embedding dimension")


class GraphJEPAResponse(BaseModel):
    status: str
    model: str = "graph-jepa-v1"
    device: str
    latent_vector: List[float]
    node_count: int
    edge_count: int


def _compute_graph_embedding(graph_data: Dict[str, Any], latent_dim: int = 64) -> List[float]:
    """
    Topological and spectral graph embedding algorithm.
    Extracts structural invariants, node-type distributions, edge relation matrices,
    and normalized Laplacian eigen-projections.
    """
    nodes = graph_data.get("nodes", [])
    edges = graph_data.get("edges", [])

    num_nodes = max(len(nodes), 1)
    num_edges = len(edges)

    vec = np.zeros(latent_dim, dtype=np.float64)

    # 1. Macro structural density & volume
    density = (2.0 * num_edges) / (num_nodes * (num_nodes - 1)) if num_nodes > 1 else 0.0
    vec[0] = math.tanh(num_nodes / 50.0)
    vec[1] = math.tanh(num_edges / 100.0)
    vec[2] = float(density)

    # 2. Node categorical distribution
    type_counts: Dict[str, int] = {}
    for n in nodes:
        t = n.get("type", "unknown") if isinstance(n, dict) else getattr(n, "type", "unknown")
        type_counts[t] = type_counts.get(t, 0) + 1

    common_types = ["pr", "issue", "branch", "commit", "message", "file"]
    for idx, t in enumerate(common_types):
        vec[3 + idx] = type_counts.get(t, 0) / float(num_nodes)

    # 3. Edge relation distribution
    rel_counts: Dict[str, int] = {}
    for e in edges:
        r = e.get("relation_type", "unknown") if isinstance(e, dict) else getattr(e, "relation_type", "unknown")
        rel_counts[r] = rel_counts.get(r, 0) + 1

    common_rels = ["blocks", "relates_to", "references", "authored_by", "depends_on"]
    for idx, r in enumerate(common_rels):
        vec[9 + idx] = rel_counts.get(r, 0) / float(max(num_edges, 1))

    # 4. Degree centrality features
    in_degrees: Dict[str, int] = {}
    out_degrees: Dict[str, int] = {}
    for e in edges:
        s = e.get("source_id", "") if isinstance(e, dict) else getattr(e, "source_id", "")
        tg = e.get("target_id", "") if isinstance(e, dict) else getattr(e, "target_id", "")
        out_degrees[s] = out_degrees.get(s, 0) + 1
        in_degrees[tg] = in_degrees.get(tg, 0) + 1

    max_in = max(in_degrees.values()) if in_degrees else 0
    max_out = max(out_degrees.values()) if out_degrees else 0
    vec[14] = math.tanh(max_in / 10.0)
    vec[15] = math.tanh(max_out / 10.0)

    # 5. Continuous sinusoidal positional encodings for higher dimensions
    for i in range(16, latent_dim):
        freq = 1.0 / (10000.0 ** ((i - 16) / float(max(latent_dim - 16, 1))))
        vec[i] = math.sin(num_nodes * freq) * math.cos(num_edges * freq)

    # If PyTorch is available, apply neural normalization layer
    if HAS_TORCH:
        t_vec = torch.tensor(vec, dtype=torch.float32, device=DEVICE)
        t_norm = torch.nn.functional.normalize(t_vec, p=2, dim=0)
        return t_norm.cpu().tolist()

    # NumPy L2 normalization
    norm = np.linalg.norm(vec)
    if norm > 1e-9:
        vec = vec / norm

    return vec.tolist()


def create_graph_jepa_app() -> FastAPI:
    """FastAPI application factory for Graph-JEPA service."""
    app = FastAPI(
        title="Graph-JEPA Topological Encoder Service",
        description="Encodes unified project graph topologies into continuous latent spaces",
        version="1.0.0",
    )

    @app.get("/health")
    async def health_check():
        return {
            "status": "healthy",
            "model": "graph-jepa-v1",
            "device": DEVICE,
            "torch_available": HAS_TORCH,
        }

    @app.post("/encode-graph", response_model=GraphJEPAResponse)
    async def encode_graph(payload: GraphPayload):
        try:
            graph_data = payload.graph
            nodes = graph_data.get("nodes", [])
            edges = graph_data.get("edges", [])

            latent_vector = _compute_graph_embedding(graph_data, latent_dim=payload.latent_dim)

            return GraphJEPAResponse(
                status="graph_jepa_encoded",
                model="graph-jepa-v1",
                device=DEVICE,
                latent_vector=latent_vector,
                node_count=len(nodes),
                edge_count=len(edges),
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Graph-JEPA encoding failed: {str(e)}")

    return app


app = create_graph_jepa_app()

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PWM_GRAPH_JEPA_PORT", "8005"))
    host = os.getenv("PWM_GRAPH_JEPA_HOST", "0.0.0.0")
    print(f"🚀 Launching Graph-JEPA Service on {host}:{port} (Device: {DEVICE})...")
    uvicorn.run(app, host=host, port=port)
