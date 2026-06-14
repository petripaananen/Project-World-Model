import httpx
from typing import Any, Dict, Optional
from pwm.config import PWMConfig
from pwm.ingestion.data_fusion import DataFusionEngine
from pwm.ingestion.models import ProjectState, SprintState, SlackState, UnifiedProjectGraph

class Layer1Observation:
    """
    Layer 1: Observation & Ingestion.
    Coordinates telemetry from Git/GitHub, Linear, and stubs for Game Engine.
    If vjepa_endpoint_url is configured, calls the V-JEPA service to encode telemetry states;
    otherwise, it falls back to recording raw logs directly.
    """
    def __init__(self, config: PWMConfig):
        self.config = config
        self.endpoint_url = config.models.vjepa_endpoint_url

    async def process_telemetry(
        self, 
        project_state: Optional[ProjectState] = None, 
        sprint_state: Optional[SprintState] = None,
        slack_state: Optional[SlackState] = None
    ) -> Dict[str, Any]:
        # 1. Fuse data into a UnifiedProjectGraph
        fusion_engine = DataFusionEngine()
        unified_graph = fusion_engine.fuse(project_state, sprint_state, slack_state)
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
                        "unified_graph": unified_graph,
                        "raw_data": payload
                    }
            except Exception as e:
                if self.config.verbose:
                    print(f"[Layer 1] V-JEPA connection failed ({e}). Falling back to raw logs.")
        
        # Fallback: record/return raw data directly
        return {
            "status": "raw_logs",
            "embeddings": None,
            "unified_graph": unified_graph,
            "raw_data": payload
        }
