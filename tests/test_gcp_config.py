"""
Unit and Integration Tests for GCP Integration & Modular Model Layers
======================================================================
"""

from __future__ import annotations

import unittest
from unittest.mock import AsyncMock, MagicMock, patch
import httpx
import pytest

from pwm.config import PWMConfig
from pwm.agents.base_agent import BaseAgent
from pwm.ingestion.models import (
    PWMPipelineState,
    ProjectState,
    SprintState,
    FileConflict,
    ConflictType,
    DebtSeverity,
    CriticVerdictStatus,
)
from pwm.layers.layer1_observation import Layer1Observation
from pwm.layers.layer2_simulation import Layer2Simulation
from pwm.layers.layer3_orchestration import Layer3Orchestration
from pwm.layers.layer4_validation import Layer4Validation


class TestGCPConfigAndLayers(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        # Create a fresh test config
        self.config = PWMConfig.from_env()
        self.config.verbose = False
        self.config.gcp.project_id = "test-project-123"
        self.config.gcp.location = "us-east4"
        self.config.gcp.gce_instance_name = "test-gpu-host"
        self.config.gcp.gce_zone = "us-east4-a"

    def test_config_parsing(self):
        """Test that configuration successfully parses GCE settings and model endpoints."""
        self.assertEqual(self.config.gcp.project_id, "test-project-123")
        self.assertEqual(self.config.gcp.location, "us-east4")
        self.assertEqual(self.config.gcp.gce_instance_name, "test-gpu-host")
        self.assertEqual(self.config.gcp.gce_zone, "us-east4-a")

        # Set endpoints custom values
        self.config.models.vjepa_endpoint_url = "http://10.0.0.1:8001"
        self.config.models.lewm_endpoint_url = "http://10.0.0.1:8002"
        self.config.models.lmms_engine_endpoint_url = "http://10.0.0.1:8003"
        self.config.models.nemoclaw_endpoint_url = "http://10.0.0.1:8004"

        self.assertEqual(self.config.models.vjepa_endpoint_url, "http://10.0.0.1:8001")
        self.assertEqual(self.config.models.lewm_endpoint_url, "http://10.0.0.1:8002")
        self.assertEqual(self.config.models.lmms_engine_endpoint_url, "http://10.0.0.1:8003")
        self.assertEqual(self.config.models.nemoclaw_endpoint_url, "http://10.0.0.1:8004")

    @patch("pwm.agents.base_agent.genai.Client")
    def test_base_agent_vertex_initialization(self, mock_genai_client):
        """Test that BaseAgent uses Vertex AI initialization when project_id is set."""
        class MockAgent(BaseAgent):
            async def process(self, data, **kwargs):
                return data

        agent = MockAgent(config=self.config)
        mock_genai_client.assert_called_once_with(
            vertexai=True,
            project="test-project-123",
            location="us-east4"
        )

    @pytest.mark.asyncio
    async def test_layer1_observation_vjepa_and_fallback(self):
        """Test Layer 1 Observation V-JEPA URL calling and fallback logic."""
        # Setup mock telemetry data
        github_data = ProjectState(repo_owner="test", repo_name="repo")
        linear_data = SprintState(team_name="QA", cycle_name="Sprint 1")

        # 1. Fallback case: blank endpoint URL
        self.config.models.vjepa_endpoint_url = ""
        layer1 = Layer1Observation(self.config)
        result = await layer1.process_telemetry(github_data, linear_data)
        
        self.assertEqual(result["status"], "raw_logs")
        self.assertIsNone(result["embeddings"])
        self.assertEqual(result["raw_data"]["github"], github_data.model_dump())

        # 2. Configured URL case: mock post request
        self.config.models.vjepa_endpoint_url = "http://localhost:8001/encode"
        layer1 = Layer1Observation(self.config)
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"embeddings": [0.1, 0.2, 0.3]}
        
        # Patch httpx.AsyncClient.post
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response
            result = await layer1.process_telemetry(github_data, linear_data)
            
            mock_post.assert_called_once_with(
                "http://localhost:8001/encode",
                json={"data": {
                    "github": github_data.model_dump(),
                    "linear": linear_data.model_dump(),
                    "slack": None,
                    "unified_graph": result["unified_graph"].model_dump(),
                    "game_engine_stub": {
                        "active_scene": "main_menu",
                        "fps": 60,
                        "draw_calls": 120,
                        "memory_used_mb": 512
                    }
                }}
            )
            self.assertEqual(result["status"], "vjepa_encoded")
            self.assertEqual(result["embeddings"], [0.1, 0.2, 0.3])

        # 3. Connection failed case: error handling
        with patch("httpx.AsyncClient.post", side_effect=httpx.ConnectError("Connection refused")):
            result = await layer1.process_telemetry(github_data, linear_data)
            self.assertEqual(result["status"], "raw_logs")
            self.assertIsNone(result["embeddings"])

    @pytest.mark.asyncio
    async def test_layer2_simulation_lewm_and_fallback(self):
        """Test Layer 2 Simulation LeWM service calling and fallback logic."""
        project_state = ProjectState(repo_owner="test", repo_name="repo")
        sprint_state = SprintState(team_name="test", cycle_name="Sprint 1")
        
        conflict = FileConflict(
            conflict_type=ConflictType.FILE_COLLISION,
            severity=DebtSeverity.HIGH,
            description="Merge conflict",
            estimated_rework_hours=5.0
        )
        from pwm.ingestion.models import IntegrationDebtReport, CausalEvidence
        mock_report = IntegrationDebtReport(
            repo="repo",
            total_debt_items=1,
            total_estimated_rework_hours=5.0,
            conflicts=[conflict]
        )

        # Patch DebtDetector.analyze and genai.Client
        with patch("pwm.simulation.debt_detector.DebtDetector.analyze", new_callable=AsyncMock) as mock_analyze, \
             patch("google.genai.Client") as mock_genai_client:
            
            # Setup mock embedding
            mock_client_instance = MagicMock()
            mock_response_embed = MagicMock()
            mock_response_embed.embeddings = [MagicMock(values=[0.1]*768)]
            mock_client_instance.models.embed_content.return_value = mock_response_embed
            mock_genai_client.return_value = mock_client_instance

            mock_analyze.return_value = mock_report
            
            # 1. Fallback case: blank endpoint URL
            self.config.models.lewm_endpoint_url = ""
            layer2 = Layer2Simulation(self.config)
            result = await layer2.run_simulation(project_state, sprint_state)
            
            self.assertEqual(result.total_debt_items, 1)
            mock_analyze.assert_called_once_with(project_state, sprint_state, mode="analyze")
            
            # 2. Configured URL case: mock post request
            self.config.models.lewm_endpoint_url = "http://localhost:8002/simulate"
            layer2 = Layer2Simulation(self.config)
            mock_analyze.reset_mock()
            
            # Initialize causal evidence to simulate update
            conflict.causal_evidence = CausalEvidence(
                probability=0.2,
                confidence=0.5,
                counterfactual="If...",
                causal_chain=["A -> B"]
            )
            
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "causal_risk": 0.85,
                "confidence": 0.95
            }
            
            with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
                mock_post.return_value = mock_response
                result = await layer2.run_simulation(project_state, sprint_state)
                
                mock_post.assert_called_once()
                call_kwargs = mock_post.call_args.kwargs
                self.assertIn("json", call_kwargs)
                self.assertEqual(call_kwargs["json"]["action"], "simulate_conflict_propagation")
                self.assertEqual(len(call_kwargs["json"]["state_vector"]), 64)
                self.assertEqual(result.conflicts[0].causal_evidence.probability, 0.85)
                self.assertEqual(result.conflicts[0].causal_evidence.confidence, 0.95)
                self.assertIn("Refined via LeWorldModel (LeWM)", result.conflicts[0].causal_evidence.causal_chain[-1])

    @pytest.mark.asyncio
    async def test_layer3_orchestration_lmms_and_fallback(self):
        """Test Layer 3 Orchestration LMMs-Engine visual task planning and fallback."""
        state = PWMPipelineState(run_id="run123")
        from pwm.ingestion.models import IntegrationDebtReport
        conflict = FileConflict(
            conflict_type=ConflictType.FILE_COLLISION,
            severity=DebtSeverity.HIGH,
            description="Merge conflict"
        )
        state.debt_report = IntegrationDebtReport(conflicts=[conflict])

        # 1. Fallback case: blank endpoint URL
        self.config.models.lmms_engine_endpoint_url = ""
        layer3 = Layer3Orchestration(self.config)
        
        # Patch WorkerAgentFactory and main demo proposals
        from pwm.ingestion.models import ResolutionProposal
        mock_proposal = ResolutionProposal(
            target_conflict=conflict,
            agent_type="qa_agent",
            worker_reasoning="Manual merge required."
        )
        
        # 2. Custom endpoint: mock post request and verify enriched context
        self.config.models.lmms_engine_endpoint_url = "http://localhost:8003/parse-layout"
        layer3 = Layer3Orchestration(self.config)
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "detected_milestones": ["Milestone A", "Milestone B"],
            "critical_path_conflicts": ["ENG-404"],
            "estimated_rework_hours": 10.5
        }
        
        mock_worker = MagicMock()
        mock_worker.token_usage = {"input_tokens": 100, "output_tokens": 50}
        mock_worker.process = AsyncMock(return_value={"proposals": [mock_proposal]})
        
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response
            with patch("pwm.agents.worker_agent.WorkerAgentFactory.create", return_value=(mock_worker, "qa_agent")):
                result = await layer3.orchestrate_resolution(state, "Base Context", mode="analyze")
                
                mock_post.assert_called_once_with(
                    "http://localhost:8003/parse-layout",
                    json={"image_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="}
                )
                self.assertEqual(len(result), 1)
                self.assertEqual(layer3.token_usage["input_tokens"], 100)
                self.assertEqual(layer3.token_usage["output_tokens"], 50)

    @pytest.mark.asyncio
    async def test_layer4_validation_nemoclaw_and_fallback(self):
        """Test Layer 4 Validation NVIDIA NemoClaw sandbox checks and fallback."""
        state = PWMPipelineState(run_id="run123")
        from pwm.ingestion.models import IntegrationDebtReport, ResolutionProposal, ResolutionStrategy, CriticVerdict
        conflict = FileConflict(
            conflict_type=ConflictType.FILE_COLLISION,
            severity=DebtSeverity.HIGH,
            description="Merge conflict"
        )
        state.debt_report = IntegrationDebtReport(conflicts=[conflict])
        
        proposal = ResolutionProposal(
            target_conflict=conflict,
            strategies=[ResolutionStrategy(title="Fix it", description="Steps", steps=["rm -rf /"])]
        )
        state.proposals = [proposal]

        # Patch CriticAgent.process
        mock_verdict = CriticVerdict(
            verdict=CriticVerdictStatus.APPROVED,
            architectural_integrity_score=0.9,
            critique="Looks solid."
        )
        
        # 1. Fallback case: blank endpoint URL
        self.config.models.nemoclaw_endpoint_url = ""
        layer4 = Layer4Validation(self.config)
        layer4.critic.process = AsyncMock(return_value={"proposals": [proposal], "verdicts": [mock_verdict]})
        layer4.opponent.generate_counter_proposal = AsyncMock(return_value=ResolutionStrategy(title="Opponent Strategy", description="Opponent"))
        
        props, verdicts = await layer4.validate_proposals(state, "Base Context", mode="analyze")
        self.assertEqual(verdicts[0].verdict, CriticVerdictStatus.APPROVED)

        # 2. Configured URL case: NemoClaw rejects
        self.config.models.nemoclaw_endpoint_url = "http://localhost:8004/audit"
        layer4 = Layer4Validation(self.config)
        layer4.critic.process = AsyncMock(return_value={"proposals": [proposal], "verdicts": [mock_verdict]})
        layer4.opponent.generate_counter_proposal = AsyncMock(return_value=ResolutionStrategy(title="Opponent Strategy", description="Opponent"))
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "verdict": "REJECTED",
            "flagged_issues": ["Malicious command found"],
            "details": "Nvidia NemoClaw Sandbox blocked execution because of risky commands."
        }
        
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response
            props, verdicts = await layer4.validate_proposals(state, "Base Context", mode="analyze")
            
            mock_post.assert_called_once()
            self.assertEqual(verdicts[0].verdict, CriticVerdictStatus.REJECTED)
            self.assertEqual(verdicts[0].architectural_integrity_score, 0.40)
            self.assertIn("NVIDIA NemoClaw Sandbox Alert", verdicts[0].critique)


if __name__ == "__main__":
    unittest.main()
