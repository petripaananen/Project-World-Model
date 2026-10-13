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

import httpx
from typing import Any, Dict, Optional
from pwm.config import PWMConfig
from pwm.ingestion.data_fusion import DataFusionEngine
from pwm.ingestion.models import ProjectState, SprintState, SlackState, UnifiedProjectGraph
from pwm.simulation.jepa_core import GraphJEPAEncoder

class Layer1Observation:
    """
    Layer 1: Observation & Ingestion.
    Coordinates telemetry from Git/GitHub, Linear, Slack, and Game Engine.
    Uses Graph-JEPA to encode project graph topology and V-JEPA to encode
    video/runtime state. Falls back cleanly to deterministic local graph
    representation and raw event logs.
    """
    def __init__(self, config: PWMConfig):
        self.config = config
        self.endpoint_url = config.models.vjepa_endpoint_url
        self.graph_encoder = GraphJEPAEncoder(
            endpoint_url=config.models.graph_jepa_endpoint_url,
            latent_dim=64,
        )

    async def process_telemetry(
        self, 
        project_state: Optional[ProjectState] = None, 
        sprint_state: Optional[SprintState] = None,
        slack_state: Optional[SlackState] = None
    ) -> Dict[str, Any]:
        # 1. Fuse data into a UnifiedProjectGraph
        fusion_engine = DataFusionEngine()
        unified_graph = fusion_engine.fuse(project_state, sprint_state, slack_state)
        
        # 2. Encode graph topology via Graph-JEPA
        graph_jepa_result = await self.graph_encoder.encode(unified_graph)

        payload = {
            "github": project_state.model_dump() if project_state else None,
            "linear": sprint_state.model_dump() if sprint_state else None,
            "slack": slack_state.model_dump() if slack_state else None,
            "unified_graph": unified_graph.model_dump(),
            "game_engine_stub": {
                "active_scene": "main_menu",
                "fps": 60,
                "draw_calls": 120,
                "memory_used_mb": 512
            }
        }
        
        if self.endpoint_url:
            if self.config.verbose:
                print(f"[Layer 1] Calling V-JEPA service at {self.endpoint_url}...")
            try:
                # Append /encode if not present in endpoint URL
                url = self.endpoint_url if self.endpoint_url.endswith("/encode") else f"{self.endpoint_url.rstrip('/')}/encode"
                async with httpx.AsyncClient(timeout=5.0) as client:
                    response = await client.post(url, json={"data": payload})
                    response.raise_for_status()
                    result = response.json()
                    return {
                        "status": "vjepa_encoded",
                        "embeddings": result.get("embeddings"),
                        "graph_embeddings": graph_jepa_result.get("latent_vector"),
                        "graph_jepa_status": graph_jepa_result.get("status"),
                        "unified_graph": unified_graph,
                        "raw_data": payload
                    }
            except Exception as e:
                if self.config.verbose:
                    print(f"[Layer 1] V-JEPA connection failed ({e}). Falling back to raw logs.")
        
        # Fallback: record/return raw data directly with Graph-JEPA representation
        return {
            "status": "raw_logs",
            "embeddings": None,
            "graph_embeddings": graph_jepa_result.get("latent_vector"),
            "graph_jepa_status": graph_jepa_result.get("status"),
            "unified_graph": unified_graph,
            "raw_data": payload
        }
