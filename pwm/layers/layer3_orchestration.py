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
from typing import Any, Dict, List
from pwm.config import PWMConfig
from pwm.ingestion.models import PWMPipelineState, ResolutionProposal
from pwm.agents.worker_agent import WorkerAgentFactory
from pwm.agents.planner_agent import GoalPlannerAgent

class Layer3Orchestration:
    """
    Layer 3: Agentic Orchestration.
    Manages specialized Worker agents (QA, Build, Art Integration).
    If lmms_engine_endpoint_url is configured, feeds visual layouts (dependency charts)
    for visual task planning.
    """
    def __init__(self, config: PWMConfig):
        self.config = config
        self.endpoint_url = config.models.lmms_engine_endpoint_url
        self._token_usage = {"input_tokens": 0, "output_tokens": 0}

    @property
    def token_usage(self) -> Dict[str, int]:
        return self._token_usage

    async def orchestrate_resolution(
        self,
        state: PWMPipelineState,
        project_context: str,
        mode: str = "analyze",
    ) -> List[ResolutionProposal]:
        self._token_usage = {"input_tokens": 0, "output_tokens": 0}
        
        visual_analysis = None
        if self.endpoint_url and mode == "analyze":
            if self.config.verbose:
                print(f"[Layer 3] Calling LMMs-Engine visual service at {self.endpoint_url}...")
            try:
                url = self.endpoint_url if self.endpoint_url.endswith("/parse-layout") else f"{self.endpoint_url.rstrip('/')}/parse-layout"
                # Pass a layout image placeholder (base64)
                payload = {
                    "image_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
                }
                async with httpx.AsyncClient(timeout=5.0) as client:
                    response = await client.post(url, json=payload)
                    response.raise_for_status()
                    visual_analysis = response.json()
            except Exception as e:
                if self.config.verbose:
                    print(f"[Layer 3] LMMs-Engine connection failed ({e}). Proceeding without visual context.")

        if mode == "analyze":
            # 1. Ask GoalPlannerAgent for directives
            planner = GoalPlannerAgent(self.config)
            directives_result = await planner.generate_plan(state.strategic_objective, project_context)
            planner_usage = planner.token_usage
            self._token_usage["input_tokens"] += planner_usage["input_tokens"]
            self._token_usage["output_tokens"] += planner_usage["output_tokens"]
            
            planner_context = (
                f"\n\n## STRATEGIC DIRECTIVES (from Scenario Strategist)\n"
                f"Primary Optimization: {directives_result['primary_optimization']}\n"
                f"Risk Tolerance: {directives_result['risk_tolerance']}\n"
                f"Directives:\n" + "\n".join(f"- {d}" for d in directives_result['worker_directives'])
            )

            all_proposals = []
            for conflict in state.debt_report.conflicts:
                agent, agent_type = WorkerAgentFactory.create(conflict, self.config)
                
                # Enrich context with planner directives and visual analysis
                enriched_context = project_context + planner_context
                if visual_analysis:
                    enriched_context += (
                        f"\n\n[Visual Task Planning Context from LMMs-Engine]\n"
                        f"Detected Milestones: {', '.join(visual_analysis.get('detected_milestones', []))}\n"
                        f"Critical Conflicts: {', '.join(visual_analysis.get('critical_path_conflicts', []))}\n"
                        f"Estimated Rework: {visual_analysis.get('estimated_rework_hours')} hours\n"
                    )
                
                proposal = await agent.resolve_conflict(
                    conflict=conflict,
                    project_context=enriched_context,
                )
                proposal.agent_type = agent_type
                all_proposals.append(proposal)
                
                # Accumulate token usage
                usage = agent.token_usage
                self._token_usage["input_tokens"] += usage["input_tokens"]
                self._token_usage["output_tokens"] += usage["output_tokens"]
            
            return all_proposals
        else:
            # Fallback to importing generate_demo_proposals dynamically
            from pwm.scenarios import generate_demo_proposals
            proposals, _ = generate_demo_proposals(state)
            return proposals
