"""
PWM Configuration Management
=============================

Handles API keys, model selection, MCP endpoints, and runtime settings.
Supports both Google AI Studio (GOOGLE_API_KEY) and Vertex AI (GCP project).
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from pydantic import BaseModel, Field, PrivateAttr


# Load .env from project root
_PROJECT_ROOT = Path(__file__).parent.parent
load_dotenv(_PROJECT_ROOT / ".env")


class GCPConfig(BaseModel):
    """Google Cloud Platform configuration."""
    project_id: str = Field(default="", description="GCP project ID")
    location: str = Field(default="us-central1", description="GCP region")


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
        default=0.50,
        description="Maximum USD cost budget per pipeline run",
    )
    max_run_tokens: int = Field(
        default=100000,
        description="Maximum cumulative tokens budget per pipeline run",
    )


class IngestionConfig(BaseModel):
    """MCP data ingestion configuration."""
    github_owner: str = Field(default="", description="GitHub repo owner")
    github_repo: str = Field(default="", description="GitHub repo name")
    linear_team_id: str = Field(default="", description="Linear team ID")
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

    class Config:
        arbitrary_types_allowed = True

    def validate_api_access(self) -> bool:
        """Check that we have at least one valid API access path."""
        if self.google_api_key:
            return True
        if self.gcp.project_id:
            return True
        return False

    def add_tokens(self, input_tokens: int, output_tokens: int):
        """Accumulate token counts across all agent execution threads."""
        self._cumulative_input_tokens += input_tokens
        self._cumulative_output_tokens += output_tokens

    def get_cumulative_tokens(self) -> dict[str, int]:
        """Get the current run's total token consumption."""
        return {
            "input_tokens": self._cumulative_input_tokens,
            "output_tokens": self._cumulative_output_tokens,
        }

    def get_cumulative_cost_usd(self) -> float:
        """Calculate cumulative run cost based on configured Gemini rates."""
        input_cost = (self._cumulative_input_tokens / 1_000_000) * self.crr.token_cost_per_million_input
        output_cost = (self._cumulative_output_tokens / 1_000_000) * self.crr.token_cost_per_million_output
        return input_cost + output_cost

    def is_budget_exhausted(self) -> bool:
        """Check if token counts or financial costs exceed limits."""
        if self._cumulative_input_tokens + self._cumulative_output_tokens >= self.models.max_run_tokens:
            return True
        if self.get_cumulative_cost_usd() >= self.models.max_run_cost_usd:
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
                project_id=os.getenv("GCP_PROJECT_ID", "project-world-model"),
                location=os.getenv("GCP_LOCATION", "us-central1"),
            ),
            ingestion=IngestionConfig(
                github_owner=os.getenv("PWM_GITHUB_OWNER", ""),
                github_repo=os.getenv("PWM_GITHUB_REPO", ""),
                linear_team_id=os.getenv("PWM_LINEAR_TEAM_ID", ""),
            ),
            **overrides,
        )
