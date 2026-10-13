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
PWM Multi-Model Serving Runner
==============================
Spawns and manages all JEPA microservice endpoints concurrently:
- Graph-JEPA: http://localhost:8005
- JEPA-WMs:   http://localhost:8006
- Point-JEPA: http://localhost:8007

Usage:
    python -m pwm.serving.runner
"""

from __future__ import annotations

import asyncio
import os
import signal
import sys
import uvicorn

from pwm.serving.graph_jepa_server import create_graph_jepa_app
from pwm.serving.jepa_wm_server import create_jepa_wm_app
from pwm.serving.point_jepa_server import create_point_jepa_app


async def start_servers(host: str = "0.0.0.0"):
    port_graph = int(os.getenv("PWM_GRAPH_JEPA_PORT", "8005"))
    port_wm = int(os.getenv("PWM_JEPA_WM_PORT", "8006"))
    port_point = int(os.getenv("PWM_POINT_JEPA_PORT", "8007"))

    app_graph = create_graph_jepa_app()
    app_wm = create_jepa_wm_app()
    app_point = create_point_jepa_app()

    config_graph = uvicorn.Config(app_graph, host=host, port=port_graph, log_level="warning")
    config_wm = uvicorn.Config(app_wm, host=host, port=port_wm, log_level="warning")
    config_point = uvicorn.Config(app_point, host=host, port=port_point, log_level="warning")

    server_graph = uvicorn.Server(config_graph)
    server_wm = uvicorn.Server(config_wm)
    server_point = uvicorn.Server(config_point)

    print("\n" + "=" * 65)
    print("🧠 Project World Model — JEPA Model Serving Cluster")
    print("=" * 65)
    print(f"  • Graph-JEPA (L1 Graph Topology): http://{host}:{port_graph}")
    print(f"  • JEPA-WMs   (L2 Latent Rollout): http://{host}:{port_wm}")
    print(f"  • Point-JEPA (L4 3D Geometry):    http://{host}:{port_point}")
    print("=" * 65 + "\n")

    await asyncio.gather(
        server_graph.serve(),
        server_wm.serve(),
        server_point.serve(),
    )


def main():
    host = os.getenv("HOST", "0.0.0.0")
    try:
        asyncio.run(start_servers(host=host))
    except (KeyboardInterrupt, SystemExit):
        print("\n[Serving Cluster] Stopped by user.")


if __name__ == "__main__":
    main()
