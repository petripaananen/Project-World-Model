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
from pwm.ingestion.models import ProjectState, SprintState, IntegrationDebtReport, SlackState, UnifiedProjectGraph
from pwm.simulation.debt_detector import DebtDetector

class Layer2Simulation:
    """
    Layer 2: Latent Simulation Core.
    Predicts cascading integration failures and calculates causal risk probabilities.
    If lewm_endpoint_url is configured, calls the LeWM service;
    otherwise, it falls back to the Gemini-based DebtDetector.
    """
    def __init__(self, config: PWMConfig):
        self.config = config
        self.endpoint_url = config.models.lewm_endpoint_url
        self.detector = DebtDetector(config)

    @property
    def token_usage(self) -> Dict[str, int]:
        return self.detector.token_usage

    async def run_simulation(
        self,
        project_state: ProjectState,
        sprint_state: Optional[SprintState] = None,
        slack_state: Optional[SlackState] = None,
        unified_graph: Optional[UnifiedProjectGraph] = None,
        mode: str = "analyze",
    ) -> IntegrationDebtReport:
        if self.endpoint_url and mode == "analyze":
            if self.config.verbose:
                print(f"[Layer 2] Calling LeWM service at {self.endpoint_url}...")
            try:
                # 1. Generate text embedding from the multi-modal state context
                from google import genai
                from google.genai import types
                
                # Fuses Textual state, Graph topology, and Visual/structural summaries (Phase 8)
                context_str = f"Project: {project_state.repo_name} owned by {project_state.repo_owner}\n"
                context_str += f"Telemetry Text - PRs: {project_state.total_open_prs}, Branches: {project_state.total_active_branches}\n"
                if sprint_state:
                    context_str += f"Telemetry Text - Sprint Cycle: {sprint_state.cycle_name}, Issues: {sprint_state.total_issues}\n"
                if slack_state:
                    context_str += f"Telemetry Text - Slack Channels: {len(slack_state.channels)}, Messages: {slack_state.total_messages}\n"
                
                # Graph topology features
                if unified_graph:
                    context_str += f"Graph Topology - Nodes: {len(unified_graph.nodes)}, Edges: {len(unified_graph.edges)}\n"
                    # Include key graph dependencies/edges (first 5 for dense summary representation)
                    for edge in unified_graph.edges[:5]:
                        context_str += f"Graph Relation - {edge.source_id} [{edge.relation_type}] {edge.target_id}\n"

                # Visual project management timeline summary (if present in sprint task dates or milestones)
                if sprint_state:
                    blocked_list = ", ".join(sprint_state.blocked_issues) if sprint_state.blocked_issues else "None"
                    context_str += f"Visual Timeline - Sprint Milestones/Critical Blockers: {blocked_list}\n"
                    
                # Use the detector's client to avoid duplicate initialization logic
                client = self.detector._client
                    
                response = client.models.embed_content(
                    model='text-embedding-004',
                    contents=context_str,
                )
                embedding_768d = response.embeddings[0].values
                
                # 2. Project down to 64d using deterministic random projection matrix
                try:
                    import numpy as np
                    # For demo purposes, we will use a deterministic random projection matrix
                    np.random.seed(42)
                    projection_matrix = np.random.randn(768, 64) / np.sqrt(64)
                    embedding_64d = np.dot(np.array(embedding_768d), projection_matrix).tolist()
                except ImportError:
                    # Fallback to slicing if numpy isn't available
                    embedding_64d = embedding_768d[:64]
                
                url = self.endpoint_url if self.endpoint_url.endswith("/simulate") else f"{self.endpoint_url.rstrip('/')}/simulate"
                # Post real latent state representation to simulation engine
                payload = {
                    "action": "simulate_conflict_propagation",
                    "state_vector": embedding_64d
                }
                async with httpx.AsyncClient(timeout=5.0) as client:
                    response = await client.post(url, json=payload)
                    response.raise_for_status()
                    result = response.json()
                    
                    # Call detector in analyze mode to parse deterministic items, but
                    # we can override/augment semantic risk with LeWM outputs.
                    report = await self.detector.analyze(project_state, sprint_state, mode="analyze")
                    
                    # Update report conflicts with LeWM causal risk prediction if applicable
                    causal_risk = result.get("causal_risk", 0.5)
                    confidence = result.get("confidence", 0.8)
                    for conflict in report.conflicts:
                        if conflict.causal_evidence:
                            conflict.causal_evidence.confidence = confidence
                            conflict.causal_evidence.probability = causal_risk
                            conflict.causal_evidence.causal_chain.append(
                                f"Refined via LeWorldModel (LeWM) action-conditioned simulation: predicted risk {causal_risk:.2f}"
                            )
                    
                    # Save latent state vectors in report for Phase 8 grounding/calibration
                    report.latent_state = embedding_64d
                    report.predicted_next_latent_state = result.get("next_state_prediction")

                    # Apply calibration factor scaling (Phase 8 Grounding)
                    try:
                        from pwm.simulation.calibration import WorldModelCalibrator
                        calibrator = WorldModelCalibrator(self.config)
                        calibrator.load_state()
                        factor = calibrator.calibration_factor
                    except Exception:
                        factor = 1.0

                    if report.latent_state:
                        report.latent_state = [val * factor for val in report.latent_state]
                    if report.predicted_next_latent_state:
                        report.predicted_next_latent_state = [val * factor for val in report.predicted_next_latent_state]
                    
                    return report
            except Exception as e:
                if self.config.verbose:
                    print(f"[Layer 2] LeWM connection failed ({e}). Falling back to Gemini DebtDetector.")
        
        # Fallback to local/Gemini detector
        report = await self.detector.analyze(project_state, sprint_state, mode=mode)
        # Generate a deterministic mock embedding if LeWM is skipped
        try:
            import numpy as np
            np.random.seed(42)
            mock_embedding = (np.random.randn(64) * 0.1).tolist()
            mock_predicted = [val * 0.95 for val in mock_embedding]
            report.latent_state = mock_embedding
            report.predicted_next_latent_state = mock_predicted
        except ImportError:
            report.latent_state = [0.0] * 64
            report.predicted_next_latent_state = [0.0] * 64

        # Apply calibration factor scaling (Phase 8 Grounding)
        try:
            from pwm.simulation.calibration import WorldModelCalibrator
            calibrator = WorldModelCalibrator(self.config)
            calibrator.load_state()
            factor = calibrator.calibration_factor
        except Exception:
            factor = 1.0

        if report.latent_state:
            report.latent_state = [val * factor for val in report.latent_state]
        if report.predicted_next_latent_state:
            report.predicted_next_latent_state = [val * factor for val in report.predicted_next_latent_state]

        return report
