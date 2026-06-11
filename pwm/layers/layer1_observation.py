import httpx
from typing import Any, Dict
from pwm.config import PWMConfig

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

    async def process_telemetry(self, github_data: Any, linear_data: Any) -> Dict[str, Any]:
        payload = {
            "github": github_data.model_dump() if hasattr(github_data, "model_dump") else github_data,
            "linear": linear_data.model_dump() if hasattr(linear_data, "model_dump") else linear_data,
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
                        "raw_data": payload
                    }
            except Exception as e:
                if self.config.verbose:
                    print(f"[Layer 1] V-JEPA connection failed ({e}). Falling back to raw logs.")
        
        # Fallback: record/return raw data directly
        return {
            "status": "raw_logs",
            "embeddings": None,
            "raw_data": payload
        }
