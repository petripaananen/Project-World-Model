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
            mode: "mock" for synthetic data, "mcp" for MCP server, "api" for direct API

        Returns:
            SprintState snapshot
        """
        if mode == "mock":
            return self._generate_mock_state()
        elif mode == "mcp":
            return await self._ingest_via_mcp()
        elif mode == "api":
            return await self._ingest_via_api()
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

    async def _ingest_via_api(self) -> SprintState:
        """Ingest directly via Linear's GraphQL API using personal access token."""
        import os
        import requests
        import asyncio
        from datetime import datetime
        import dateutil.parser # type: ignore

        linear_token = os.environ.get("LINEAR_API_KEY")
        if not linear_token:
            print("⚠️ LINEAR_API_KEY not set. Falling back to mock data.")
            return self._generate_mock_state()

        url = "https://api.linear.app/v1/graphql"
        headers = {
            "Authorization": f"Bearer {linear_token}",
            "Content-Type": "application/json"
        }

        # GraphQL Query to fetch active cycle and issues
        team_id = self.config.ingestion.linear_team_id
        if team_id:
            query = """
            query($teamId: String!) {
              team(id: $teamId) {
                name
                issues(first: 50) {
                  nodes {
                    id
                    identifier
                    title
                    priority
                    createdAt
                    state {
                      name
                    }
                    assignee {
                      name
                    }
                    labels {
                      nodes {
                        name
                      }
                    }
                  }
                }
                activeCycle {
                  name
                }
              }
            }
            """
            variables = {"teamId": team_id}
        else:
            query = """
            query {
              issues(first: 50) {
                nodes {
                  id
                  identifier
                  title
                  priority
                  createdAt
                  state {
                    name
                  }
                  assignee {
                    name
                  }
                  labels {
                    nodes {
                      name
                    }
                  }
                }
              }
            }
            """
            variables = {}

        try:
            payload = {"query": query, "variables": variables}
            
            def make_request():
                return requests.post(url, json=payload, headers=headers, timeout=15)
            
            response = await asyncio.to_thread(make_request)
            
            if response.status_code != 200:
                print(f"⚠️ Linear API returned status code {response.status_code}: {response.text}")
                return self._generate_mock_state()

            res_data = response.json()
            if "errors" in res_data:
                print(f"⚠️ Linear GraphQL errors: {res_data['errors']}")
                return self._generate_mock_state()

            data = res_data.get("data", {})
            parsed_issues = []
            team_name = team_id or "Default Team"
            cycle_name = "Current Cycle"

            if team_id:
                team_data = data.get("team") or {}
                team_name = team_data.get("name") or team_name
                active_cycle = team_data.get("activeCycle") or {}
                cycle_name = active_cycle.get("name") or cycle_name
                issues_list = (team_data.get("issues") or {}).get("nodes") or []
            else:
                issues_list = (data.get("issues") or {}).get("nodes") or []

            for issue in issues_list[:50]:
                status_obj = issue.get("state") or {}
                status_name = status_obj.get("name") or "Unknown"

                assignee_obj = issue.get("assignee") or {}
                assignee_name = assignee_obj.get("name") or "Unassigned"

                # Parse labels
                labels_nodes = (issue.get("labels") or {}).get("nodes") or []
                labels = [l.get("name") for l in labels_nodes if l.get("name")]

                # Parse priority string representation (Linear returns numeric priorities)
                priority_val = issue.get("priority", 0)
                priority_map = {
                    0: "none",
                    1: "urgent",
                    2: "high",
                    3: "medium",
                    4: "low"
                }
                priority_name = priority_map.get(priority_val, "none")

                parsed_issues.append(IssueInfo(
                    id=issue.get("identifier", issue.get("id", "UNKNOWN")),
                    title=issue.get("title", "Unknown"),
                    status=status_name,
                    assignee=assignee_name,
                    priority=priority_name,
                    labels=labels,
                    created_at=dateutil.parser.parse(issue.get("createdAt", datetime.now().isoformat())).replace(tzinfo=None)
                ))

            # Populate SprintState
            state = SprintState(
                team_name=team_name,
                cycle_name=cycle_name,
                issues=parsed_issues
            )
            state.compute_derived_stats()
            
            # Detect blocked issues (typically with Blocked status or label)
            blocked = []
            for issue in parsed_issues:
                if issue.status.lower() in ["blocked", "impeded"] or "blocked" in [l.lower() for l in issue.labels]:
                    blocked.append(issue.id)
            state.blocked_issues = blocked
            
            return state

        except Exception as e:
            print(f"❌ Error communicating with Linear API: {e}")
            print("Falling back to mock data.")
            return self._generate_mock_state()
