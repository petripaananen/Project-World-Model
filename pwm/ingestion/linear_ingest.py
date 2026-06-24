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
PWM Linear Ingestion — Layer 1: Observation & Ingestion
=========================================================

Extracts sprint/cycle state from Linear via the Linear MCP server.
Produces a SprintState snapshot that enriches the debt analysis.

Current implementation: Stub with mock data for local development.
Week 2 will implement real MCP integration.
"""

from __future__ import annotations

from datetime import datetime, timedelta

from pwm.config import PWMConfig
from pwm.ingestion.models import IssueInfo, SprintState


class LinearIngestor:
    """Layer 1 Linear data ingestor."""

    def __init__(self, config: PWMConfig):
        self.config = config

    async def ingest(self, mode: str = "mock") -> SprintState:
        """
        Ingest sprint state from Linear.

        Args:
            mode: "mock" for synthetic data, "mcp" for MCP server

        Returns:
            SprintState snapshot
        """
        if mode == "mock":
            return self._generate_mock_state()
        elif mode == "mcp":
            return await self._ingest_via_mcp()
        else:
            raise ValueError(f"Unknown ingestion mode: {mode}")

    def _generate_mock_state(self) -> SprintState:
        """Generate realistic mock sprint data matching the GitHub mock."""
        now = datetime.now()

        state = SprintState(
            team_name="Engine Team",
            cycle_name="Sprint 14 — Alpha Milestone",
            issues=[
                IssueInfo(
                    id="ENG-201",
                    title="Implement GPU instanced particle system",
                    status="In Progress",
                    assignee="alice",
                    priority="high",
                    labels=["feature", "renderer"],
                    created_at=now - timedelta(days=5),
                ),
                IssueInfo(
                    id="ENG-198",
                    title="Extract physics into standalone module",
                    status="In Review",
                    assignee="bob",
                    priority="high",
                    labels=["refactor", "physics"],
                    created_at=now - timedelta(days=8),
                ),
                IssueInfo(
                    id="ENG-205",
                    title="Real-time lighting overhaul (RTX)",
                    status="In Progress",
                    assignee="diana",
                    priority="urgent",
                    labels=["feature", "renderer"],
                    created_at=now - timedelta(days=10),
                ),
                IssueInfo(
                    id="ENG-210",
                    title="Fix audio desync in cutscene playback",
                    status="In Progress",
                    assignee="eve",
                    priority="medium",
                    labels=["bugfix", "audio"],
                    created_at=now - timedelta(days=2),
                ),
                IssueInfo(
                    id="ENG-195",
                    title="AI pathfinding prototype",
                    status="Blocked",
                    assignee="frank",
                    priority="low",
                    labels=["experiment", "ai"],
                    created_at=now - timedelta(days=20),
                ),
                IssueInfo(
                    id="ENG-212",
                    title="Update CI pipeline for new module structure",
                    status="Backlog",
                    assignee=None,
                    priority="medium",
                    labels=["devops"],
                    created_at=now - timedelta(days=1),
                ),
            ],
        )

        state.compute_derived_stats()
        state.blocked_issues = ["ENG-195"]
        return state

    async def _ingest_via_mcp(self) -> SprintState:
        """Ingest via Linear MCP server using the python mcp client."""
        import os
        import json
        from mcp.client.session import ClientSession
        from mcp.client.stdio import stdio_client, StdioServerParameters

        linear_token = os.environ.get("LINEAR_API_KEY")
        if not linear_token:
            print("⚠️ LINEAR_API_KEY not set. Falling back to mock data.")
            return self._generate_mock_state()

        env = os.environ.copy()
        env["LINEAR_API_KEY"] = linear_token

        server_params = StdioServerParameters(
            command="npx",
            args=["-y", "@modelcontextprotocol/server-linear"],
            env=env
        )

        try:
            async with stdio_client(server_params) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.initialize()
                    
                    # Fetch Issues
                    # Note: Using list_issues tool without args to get recent ones
                    issues_result = await session.call_tool("list_issues", {})
                    issues_data = json.loads(issues_result.content[0].text) if issues_result.content else []

                    return self._parse_mcp_data(issues_data)
        except Exception as e:
            print(f"❌ Error communicating with Linear MCP server: {e}")
            print("Falling back to mock data for demonstration.")
            return self._generate_mock_state()

    def _parse_mcp_data(self, issues_data: list) -> SprintState:
        """Parse raw MCP JSON into our Pydantic models."""
        from datetime import datetime
        import dateutil.parser # type: ignore
        
        parsed_issues = []
        for issue in issues_data[:20]:  # Limit for demo
            status_obj = issue.get("state", {})
            status_name = status_obj.get("name", "Unknown") if isinstance(status_obj, dict) else "Unknown"
            
            assignee_obj = issue.get("assignee", {})
            assignee_name = assignee_obj.get("name", "Unassigned") if isinstance(assignee_obj, dict) else "Unassigned"
            
            parsed_issues.append(IssueInfo(
                id=issue.get("identifier", issue.get("id", "UNKNOWN")),
                title=issue.get("title", "Unknown"),
                status=status_name,
                assignee=assignee_name,
                priority=str(issue.get("priority", "none")),
                labels=[l.get("name") for l in issue.get("labels", {}).get("nodes", [])] if isinstance(issue.get("labels"), dict) else [],
                created_at=dateutil.parser.parse(issue.get("createdAt", datetime.now().isoformat())).replace(tzinfo=None)
            ))

        state = SprintState(
            team_name=self.config.ingestion.linear_team_id or "Default Team",
            cycle_name="Current Cycle",
            issues=parsed_issues
        )
        state.compute_derived_stats()
        return state
