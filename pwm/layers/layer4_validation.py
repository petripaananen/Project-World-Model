import httpx
from typing import Any, Dict, List, Tuple
from pwm.config import PWMConfig
from pwm.ingestion.models import PWMPipelineState, ResolutionProposal, CriticVerdict, CriticVerdictStatus
from pwm.agents.critic_agent import CriticAgent
from pwm.agents.opponent_agent import OpponentAgent

class WorkerAgentDispatcher:
    def __init__(self, config: PWMConfig):
        self.config = config
        self._token_usage = {"input_tokens": 0, "output_tokens": 0}

    @property
    def token_usage(self) -> Dict[str, int]:
        return self._token_usage

    async def resolve_conflict(self, conflict: Any, project_context: str) -> Any:
        from pwm.agents.worker_agent import WorkerAgentFactory
        agent, _ = WorkerAgentFactory.create(conflict, self.config)
        res = await agent.resolve_conflict(conflict, project_context)
        self._token_usage["input_tokens"] += agent.token_usage["input_tokens"]
        self._token_usage["output_tokens"] += agent.token_usage["output_tokens"]
        return res

class Layer4Validation:
    """
    Layer 4: Validation / Auditor Firewall.
    Connects to the NVIDIA NemoClaw service to perform security sandbox audits on proposed strategies.
    Fallback uses prompt-isolated safety critique loops (Gemini CriticAgent).
    """
    def __init__(self, config: PWMConfig):
        self.config = config
        self.endpoint_url = config.models.nemoclaw_endpoint_url
        self.opponent = OpponentAgent(config)
        self.critic = CriticAgent(config)
        self._worker_dispatcher = WorkerAgentDispatcher(config)

    @property
    def token_usage(self) -> Dict[str, int]:
        c_usage = self.critic.token_usage
        o_usage = self.opponent.token_usage
        w_usage = self._worker_dispatcher.token_usage
        return {
            "input_tokens": c_usage["input_tokens"] + o_usage["input_tokens"] + w_usage["input_tokens"],
            "output_tokens": c_usage["output_tokens"] + o_usage["output_tokens"] + w_usage["output_tokens"],
        }

    async def validate_proposals(
        self,
        state: PWMPipelineState,
        project_context: str,
        mode: str = "analyze",
    ) -> Tuple[List[ResolutionProposal], List[CriticVerdict]]:
        if self.endpoint_url and mode == "analyze":
            if self.config.verbose:
                print(f"[Layer 4] Calling NVIDIA NemoClaw service at {self.endpoint_url}...")
            
            # Run the local critic loop first to refine/critique proposals semantically
            proposals, verdicts = await self._run_gemini_validation(state, project_context)
            
            # Now run NemoClaw sandbox audit on the final strategies
            try:
                url = self.endpoint_url if self.endpoint_url.endswith("/audit") else f"{self.endpoint_url.rstrip('/')}/audit"
                async with httpx.AsyncClient(timeout=5.0) as client:
                    for proposal, verdict in zip(proposals, verdicts):
                        # Construct a code representation of the proposed strategies
                        proposed_code = "\n".join([
                            f"Strategy: {s.title}\n" + "\n".join(s.steps)
                            for s in proposal.strategies
                        ])
                        
                        response = await client.post(url, json={"code_proposal": proposed_code})
                        response.raise_for_status()
                        result = response.json()
                        
                        # If NemoClaw rejected it, update verdict and critique
                        if result.get("verdict") == "REJECTED":
                            verdict.verdict = CriticVerdictStatus.REJECTED
                            verdict.architectural_integrity_score = min(verdict.architectural_integrity_score, 0.40)
                            flagged = result.get("flagged_issues", [])
                            verdict.critique += (
                                f"\n\n[🚨 NVIDIA NemoClaw Sandbox Alert]\n"
                                f"Proposal was REJECTED by the secure validation sandbox.\n"
                                f"Flagged security issues: {', '.join(flagged)}\n"
                                f"Details: {result.get('details')}"
                            )
                            verdict.suggested_revisions.append("Remove suspicious commands/operations flagged by NemoClaw sandbox.")
                        else:
                            verdict.critique += (
                                f"\n\n[✅ NVIDIA NemoClaw Sandbox Audit]\n"
                                f"Proposal passed isolated sandbox checks: {result.get('details')}"
                            )
                return proposals, verdicts
            except Exception as e:
                if self.config.verbose:
                    print(f"[Layer 4] NemoClaw connection failed ({e}). Using Gemini Critic validation only.")
                return proposals, verdicts
        
        if mode == "analyze":
            return await self._run_gemini_validation(state, project_context)
        else:
            # Fallback to importing generate_demo_proposals dynamically
            from pwm.scenarios import generate_demo_proposals
            proposals, verdicts = generate_demo_proposals(state)
            return proposals, verdicts

    async def _run_gemini_validation(
        self,
        state: PWMPipelineState,
        project_context: str,
    ) -> Tuple[List[ResolutionProposal], List[CriticVerdict]]:
        
        # 1. Run Opponent Agent on all proposals to generate counter-strategies
        for proposal in state.proposals:
            if proposal.target_conflict:
                counter_strategy = await self.opponent.generate_counter_proposal(
                    conflict=proposal.target_conflict,
                    worker_proposal=proposal,
                    project_context=project_context,
                )
                proposal.counter_strategies.append(counter_strategy)
                
        # 2. Run Critic Agent as Consensus Builder
        critic_data = {
            "proposals": state.proposals,
            "debt_report": state.debt_report,
            "project_context": project_context,
            "worker_agent": self._worker_dispatcher,
        }
        critic_data = await self.critic.process(critic_data)
        return critic_data.get("proposals", []), critic_data.get("verdicts", [])
