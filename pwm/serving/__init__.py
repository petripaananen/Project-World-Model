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
PWM Model Serving Microservices
================================

FastAPI-powered model serving endpoints for GPU/Containerized deployment:
- Graph-JEPA (port 8005): Topological graph encoder for UnifiedProjectGraph
- JEPA-WMs (port 8006): Action-conditioned latent counterfactual rollout engine
- Point-JEPA (port 8007): 3D geometric encoder for DTO Garden digital twin
"""

from pwm.serving.graph_jepa_server import create_graph_jepa_app
from pwm.serving.jepa_wm_server import create_jepa_wm_app
from pwm.serving.point_jepa_server import create_point_jepa_app

__all__ = [
    "create_graph_jepa_app",
    "create_jepa_wm_app",
    "create_point_jepa_app",
]
