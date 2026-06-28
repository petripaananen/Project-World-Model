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
PWM Configuration Management
=============================

Handles API keys, model selection, MCP endpoints, and runtime settings.
Supports both Google AI Studio (GOOGLE_API_KEY) and Vertex AI (GCP project).
"""

from __future__ import annotations

import asyncio
import os
import threading
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from pydantic import BaseModel, ConfigDict, Field, PrivateAttr


# Load .env from project root
_PROJECT_ROOT = Path(__file__).parent.parent
load_dotenv(_PROJECT_ROOT / ".env")


class GCPConfig(BaseModel):
    """Google Cloud Platform configuration."""
    project_id: str = Field(default="", description="GCP project ID")
    location: str = Field(default="us-central1", description="GCP region")
    gce_instance_name: str = Field(default="pwm-gpu-host", description="GCE VM instance name for GPU models")
    gce_zone: str = Field(default="us-central1-a", description="GCE VM zone")


class ModelConfig(BaseModel):
    """LLM model configuration."""
    # Primary reasoning model (for Worker/Critic agents)
    reasoning_model: str = Field(
        default="gemini-2.5-pro",
        description="Model for deep causal reasoning tasks",
    )
    # Fast model (for data processing, summarization)
    fast_model: str = Field(
        default="gemini-2.5-flash",
        description="Model for quick processing tasks",
    )
    temperature: float = Field(default=0.2, description="Generation temperature")
    max_output_tokens: int = Field(default=8192, description="Max output tokens")
    max_critic_rounds: int = Field(
        default=3, description="Max Worker→Critic iteration rounds"
    )
    max_run_cost_usd: float = Field(
        default=2.50,
        description="Maximum USD cost budget per pipeline run",
    )
    max_run_tokens: int = Field(
        default=100000,
        description="Maximum cumulative tokens budget per pipeline run",
    )
    # Demo mode token counts (for CRR calculation in demo mode)
    demo_input_tokens: int = Field(
        default=15_000,
        description="Simulated input token count for demo mode CRR",
    )
    demo_output_tokens: int = Field(
        default=8_000,
        description="Simulated output token count for demo mode CRR",
    )
    # External model service endpoints
    vjepa_endpoint_url: str = Field(default="", description="Layer 1 V-JEPA service endpoint")
    lewm_endpoint_url: str = Field(default="", description="Layer 2 LeWM service endpoint")
    lmms_engine_endpoint_url: str = Field(default="", description="Layer 3 LMMs-Engine service endpoint")
    nemoclaw_endpoint_url: str = Field(default="", description="Layer 4 NemoClaw service endpoint")


class IngestionConfig(BaseModel):
    """MCP data ingestion configuration."""
    github_owner: str = Field(default="", description="GitHub repo owner")
    github_repo: str = Field(default="", description="GitHub repo name")
    linear_team_id: str = Field(default="", description="Linear team ID")
    issue_tracker: str = Field(default="linear", description="Active issue tracker: 'linear' or 'jira'")
    jira_project_key: str = Field(default="", description="Jira project key")
    jira_cloud_id: str = Field(default="", description="Jira Cloud ID (site URL or UUID)")
    # How far back to look for activity
    lookback_days: int = Field(
        default=14, description="Days of history to ingest"
    )


class DashboardConfig(BaseModel):
    """Web dashboard configuration."""
    web_host: str = Field(
        default_factory=lambda: os.getenv("HOST", "0.0.0.0"),
        description="Dashboard bind host",
    )
    web_port: int = Field(
        default_factory=lambda: int(os.getenv("PORT", "8765")),
        description="Dashboard port",
    )
    event_log_path: Path = Field(
        default_factory=lambda: Path("output/events.jsonl"),
        description="Path to immutable event log",
    )
    timezone: str = Field(
        default_factory=lambda: os.getenv("PWM_TIMEZONE", "Europe/Helsinki"),
        description="Timezone for 24h async cycle (Thesis Kuvio 8)",
    )


class CRRConfig(BaseModel):
    """Compute-to-Rework Ratio calculation parameters."""
    # Cost assumptions
    token_cost_per_million_input: float = Field(
        default=1.25, description="USD per 1M input tokens (Gemini 2.5 Pro)"
    )
    token_cost_per_million_output: float = Field(
        default=10.0, description="USD per 1M output tokens (Gemini 2.5 Pro)"
    )
    # Human cost assumptions
    developer_hourly_rate: float = Field(
        default=75.0, description="USD per hour for developer rework"
    )
    # Severity-to-hours mapping (how many hours of rework each severity level represents)
    severity_hours: dict[str, float] = Field(
        default={
            "critical": 16.0,   # 2 developer-days
            "high": 8.0,        # 1 developer-day
            "medium": 4.0,      # half day
            "low": 1.0,         # quick fix
        },
        description="Estimated rework hours per debt severity level",
    )
    # GPU & infrastructure costs (Thesis §5.8.2 — "tokens per watt")
    gpu_hourly_rate: float = Field(
        default=0.35, description="USD/hour for GPU compute (e.g., GCP T4)",
    )
    gpu_hours_per_run: float = Field(
        default=0.0, description="GPU hours consumed per pipeline run (0 = CPU-only)",
    )
    electricity_rate_kwh: float = Field(
        default=0.12, description="USD per kWh (average commercial rate)",
    )
    gpu_power_watts: float = Field(
        default=70.0, description="GPU TDP in watts (T4 = 70W, A100 = 250W)",
    )
    # Jevons Paradox detection (Thesis §5.8.1)
    jevons_paradox_threshold: float = Field(
        default=0.80,
        description="CRR threshold above which Jevons Paradox alert fires",
    )


class ScrumConfig(BaseModel):
    """Scrum framework configuration."""
    sprint_length_days: int = Field(
        default=14, description="Sprint duration in days"
    )
    sprint_goal: Optional[str] = Field(
        default=None, description="Current Sprint Goal statement"
    )
    definition_of_done: list[str] = Field(
        default=["tests_pass", "code_reviewed", "docs_updated"],
        description="Criteria that must be met for an Increment to be Done",
    )
    sprint_planning_timebox_hours: float = Field(
        default=4.0, description="Sprint Planning timebox in hours"
    )
    daily_scrum_timebox_minutes: int = Field(
        default=15, description="Daily Scrum timebox in minutes"
    )
    sprint_review_timebox_hours: float = Field(
        default=2.0, description="Sprint Review timebox in hours"
    )
    sprint_retrospective_timebox_hours: float = Field(
        default=1.5, description="Sprint Retrospective timebox in hours"
    )


class KanbanConfig(BaseModel):
    """Kanban framework configuration — flow optimization."""
    wip_limits: dict[str, int] = Field(
        default={
            "backlog": 20,
            "in_progress": 5,
            "review": 3,
            "done": 0,  # 0 = unlimited
        },
        description="Work-in-Progress limits per workflow state",
    )
    sle_percentile: float = Field(
        default=0.85,
        description="Service Level Expectation percentile (e.g., 0.85 = 85th percentile)",
    )
    sle_target_days: int = Field(
        default=8,
        description="Target days for SLE (e.g., 85% of items finish in 8 days)",
    )
    workflow_states: list[str] = Field(
        default=["backlog", "in_progress", "review", "done"],
        description="Ordered workflow states from started to finished",
    )
    aging_warning_threshold_days: int = Field(
        default=5,
        description="Days after which a work item is flagged as aging",
    )


class PortfolioConfig(BaseModel):
    """Multi-project portfolio management configuration."""
    portfolio_mode: bool = Field(
        default=False,
        description="Enable multi-project portfolio aggregation",
    )
    stakeholder_tracking_enabled: bool = Field(
        default=True,
        description="Enable stakeholder activity tracking and risk analysis",
    )
    project_lifecycle_phase: str = Field(
        default="execution",
        description="Current project lifecycle phase "
        "(ideation, preparation, initiation, planning, execution, closure, support)",
    )
    cross_project_resource_alert: bool = Field(
        default=True,
        description="Alert when a contributor is overloaded across projects",
    )


class PWMConfig(BaseModel):
    """
    Master configuration for the PWM framework.

    Loads from environment variables and .env file, with sensible defaults
    for local development. Override via .env or direct instantiation.
    """
    # API access
    google_api_key: str = Field(
        default_factory=lambda: os.getenv("GOOGLE_API_KEY", ""),
        description="Google AI Studio API key",
    )
    # Sub-configs
    gcp: GCPConfig = Field(default_factory=GCPConfig)
    models: ModelConfig = Field(default_factory=ModelConfig)
    ingestion: IngestionConfig = Field(default_factory=IngestionConfig)
    crr: CRRConfig = Field(default_factory=CRRConfig)
    dashboard: DashboardConfig = Field(default_factory=DashboardConfig)
    # Agile framework configs
    scrum: ScrumConfig = Field(default_factory=ScrumConfig)
    kanban: KanbanConfig = Field(default_factory=KanbanConfig)
    portfolio: PortfolioConfig = Field(default_factory=PortfolioConfig)

    # Runtime
    project_root: Path = Field(
        default_factory=lambda: _PROJECT_ROOT,
        description="Project root directory",
    )
    output_dir: Path = Field(
        default_factory=lambda: _PROJECT_ROOT / "output",
        description="Output directory for reports and logs",
    )
    verbose: bool = Field(default=True, description="Enable verbose logging")

    # Private attributes for tracking compute usage
    _cumulative_input_tokens: int = PrivateAttr(default=0)
    _cumulative_output_tokens: int = PrivateAttr(default=0)
    _token_lock: threading.Lock = PrivateAttr(default_factory=threading.Lock)

    model_config = ConfigDict(arbitrary_types_allowed=True)

    def validate_api_access(self) -> bool:
        """Check that we have at least one valid API access path."""
        if self.google_api_key:
            return True
        if self.gcp.project_id:
            return True
        return False

    def add_tokens(self, input_tokens: int, output_tokens: int) -> None:
        """Accumulate token counts across all agent execution threads.

        Thread-safe via threading.Lock to support concurrent async/sync contexts.
        """
        with self._token_lock:
            self._cumulative_input_tokens += input_tokens
            self._cumulative_output_tokens += output_tokens

    def get_cumulative_tokens(self) -> dict[str, int]:
        """Get the current run's total token consumption."""
        with self._token_lock:
            return {
                "input_tokens": self._cumulative_input_tokens,
                "output_tokens": self._cumulative_output_tokens,
            }

    def get_cumulative_cost_usd(self) -> float:
        """Calculate cumulative run cost based on configured Gemini rates."""
        with self._token_lock:
            input_cost = (self._cumulative_input_tokens / 1_000_000) * self.crr.token_cost_per_million_input
            output_cost = (self._cumulative_output_tokens / 1_000_000) * self.crr.token_cost_per_million_output
            return input_cost + output_cost

    def is_budget_exhausted(self) -> bool:
        """Check if token counts or financial costs exceed limits."""
        with self._token_lock:
            if self._cumulative_input_tokens + self._cumulative_output_tokens >= self.models.max_run_tokens:
                return True
            if (self._cumulative_input_tokens / 1_000_000) * self.crr.token_cost_per_million_input + \
               (self._cumulative_output_tokens / 1_000_000) * self.crr.token_cost_per_million_output >= self.models.max_run_cost_usd:
                return True
        return False

    @classmethod
    def from_env(cls, **overrides) -> "PWMConfig":
        """
        Create config from environment variables with optional overrides.

        Usage:
            config = PWMConfig.from_env(
                ingestion=IngestionConfig(github_owner="myorg", github_repo="myrepo")
            )
        """
        return cls(
            google_api_key=os.getenv("GOOGLE_API_KEY", ""),
            gcp=GCPConfig(
                project_id=os.getenv("GCP_PROJECT_ID", ""),
                location=os.getenv("GCP_LOCATION", "us-central1"),
                gce_instance_name=os.getenv("GCP_GCE_INSTANCE_NAME", "pwm-gpu-host"),
                gce_zone=os.getenv("GCP_GCE_ZONE", "us-central1-a"),
            ),
            models=ModelConfig(
                vjepa_endpoint_url=os.getenv("PWM_VJEPA_ENDPOINT_URL", ""),
                lewm_endpoint_url=os.getenv("PWM_LEWM_ENDPOINT_URL", ""),
                lmms_engine_endpoint_url=os.getenv("PWM_LMMS_ENGINE_ENDPOINT_URL", ""),
                nemoclaw_endpoint_url=os.getenv("PWM_NEMOCLAW_ENDPOINT_URL", ""),
            ),
            ingestion=IngestionConfig(
                github_owner=os.getenv("PWM_GITHUB_OWNER", ""),
                github_repo=os.getenv("PWM_GITHUB_REPO", ""),
                linear_team_id=os.getenv("PWM_LINEAR_TEAM_ID", ""),
                issue_tracker=os.getenv("PWM_ISSUE_TRACKER", "linear"),
                jira_project_key=os.getenv("PWM_JIRA_PROJECT_KEY", ""),
                jira_cloud_id=os.getenv("PWM_JIRA_CLOUD_ID", ""),
            ),
            **overrides,
        )
