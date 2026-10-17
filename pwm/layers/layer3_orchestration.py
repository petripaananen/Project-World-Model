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
from typing import Any, Dict, List, Optional
from pwm.config import PWMConfig
from pwm.ingestion.models import PWMPipelineState, ResolutionProposal
from pwm.agents.worker_agent import WorkerAgentFactory
from pwm.agents.planner_agent import GoalPlannerAgent
from pwm.simulation.jepa_core import JEPAWorldModel

class Layer3Orchestration:
    """
    Layer 3: Agentic Orchestration.
    Manages specialized Worker agents (QA, Build, Art Integration) with
    RSI-Anything Phase 1 'Predict-Before-Evaluate' latent pre-screening.
    If lmms_engine_endpoint_url is configured, feeds visual layouts (dependency charts)
    for visual task planning.
    """
    def __init__(self, config: PWMConfig):
        self.config = config
        self.endpoint_url = config.models.lmms_engine_endpoint_url
        self._token_usage = {"input_tokens": 0, "output_tokens": 0}
        self.jepa_wm = JEPAWorldModel(
            endpoint_url=config.models.jepa_wm_endpoint_url,
            latent_dim=64,
        )

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

                # RSI Phase 1: Predict-Before-Evaluate Pre-Screening Filter
                base_latent = (
                    state.debt_report.latent_state
                    if state.debt_report and state.debt_report.latent_state
                    else None
                )
                proposal = await self.pre_screen_strategies(proposal, base_state=base_latent, z_env=state.z_env)
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

    async def pre_screen_strategies(
        self,
        proposal: ResolutionProposal,
        base_state: Optional[List[float]] = None,
        z_env: Optional[Any] = None,
    ) -> ResolutionProposal:
        """
        RSI-Anything Phase 1: Predict-Before-Evaluate Pre-Screening Filter.
        Takes candidate strategies, simulates each in OPF latent space conditioned on z_env,
        computes Quasimetric Latent Energy and CVaR_0.95 tail risk, and objectively
        selects the strategy with optimal composite risk and irreversibility profile.
        """
        if not proposal.strategies or len(proposal.strategies) <= 1:
            return proposal

        from pwm.simulation.crr_engine import quasimetric_latent_energy, compute_cvar_95

        base = base_state or [0.1] * 64
        candidate_actions = []
        for s in proposal.strategies:
            title_lower = s.title.lower() + " " + s.description.lower()
            if "delay" in title_lower or "stage" in title_lower or "buffer" in title_lower:
                act_type = "delay"
            elif "revert" in title_lower or "rollback" in title_lower:
                act_type = "revert"
            elif "reallocate" in title_lower or "handoff" in title_lower:
                act_type = "reallocate"
            elif "merge" in title_lower or "integrate" in title_lower:
                act_type = "merge"
            else:
                act_type = "general"

            risk_mod = (
                0.15 if getattr(s.risk_level, "value", str(s.risk_level)) in ["high", "critical"]
                else (-0.10 if getattr(s.risk_level, "value", str(s.risk_level)) == "low" else 0.0)
            )
            candidate_actions.append({
                "name": s.title,
                "type": act_type,
                "risk_modifier": risk_mod,
            })

        try:
            rollouts = await self.jepa_wm.simulate_counterfactuals(base, candidate_actions, z_env=z_env)
            sigma_exo = float(getattr(z_env, "stochasticity", z_env.get("stochasticity", 0.1) if isinstance(z_env, dict) else 0.1))

            for s, r in zip(proposal.strategies, rollouts):
                s.predicted_risk = r.get("predicted_risk")
                s.latent_energy = r.get("latent_energy")
                s.factor_attributions = r.get("factor_attributions")
                s.factor_energies = r.get("factor_energies")

                pred_state = r.get("predicted_state", base)
                # Compute Quasimetric Latent Energy
                q_energy = quasimetric_latent_energy(base, pred_state, z_env=z_env)
                s.quasimetric_energy = round(q_energy, 4)

                # Compute CVaR_0.95 tail risk
                risk_val = s.predicted_risk if s.predicted_risk is not None else 0.3
                cvar = compute_cvar_95(risk_val, sigma_exo=sigma_exo)
                s.cvar_95 = round(cvar, 4)

            # Predict-Before-Evaluate Selection:
            # Rank by CVaR_0.95 risk, then quasimetric energy
            best_idx = min(
                range(len(proposal.strategies)),
                key=lambda i: (
                    proposal.strategies[i].cvar_95 if proposal.strategies[i].cvar_95 is not None else (
                        proposal.strategies[i].predicted_risk if proposal.strategies[i].predicted_risk is not None else 999.0
                    ),
                    proposal.strategies[i].quasimetric_energy if proposal.strategies[i].quasimetric_energy is not None else (
                        proposal.strategies[i].latent_energy if proposal.strategies[i].latent_energy is not None else 999.0
                    ),
                ),
            )
            proposal.recommended_strategy_index = best_idx

            # Enrich worker reasoning with RSI selection justification
            chosen = proposal.strategies[best_idx]
            if chosen.predicted_risk is not None:
                energy_disp = chosen.quasimetric_energy if chosen.quasimetric_energy is not None else chosen.latent_energy
                cvar_disp = chosen.cvar_95 if chosen.cvar_95 is not None else chosen.predicted_risk
                proposal.worker_reasoning += (
                    f"\n[RSI Predict-Before-Evaluate]: Strategy '{chosen.title}' objectively selected "
                    f"via OPF simulation (predicted risk: {chosen.predicted_risk:.2f}, "
                    f"CVaR_0.95: {cvar_disp:.2f}, quasimetric energy: {energy_disp:.4f})."
                )
        except Exception as e:
            if self.config.verbose:
                print(f"[Layer 3] RSI Pre-screening simulation note: {e}")

        return proposal
