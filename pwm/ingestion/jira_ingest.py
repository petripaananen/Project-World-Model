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
PWM Jira Ingestion — Layer 1: Observation & Ingestion
======================================================

Extracts sprint/cycle state from Jira via the Atlassian MCP server
or direct Jira REST API calls. Produces a SprintState snapshot.
"""

from __future__ import annotations

import base64
import json
import os
from datetime import datetime, timedelta
import requests
import dateutil.parser

from pwm.config import PWMConfig
from pwm.ingestion.models import IssueInfo, SprintState


class JiraIngestor:
    """Layer 1 Jira data ingestor."""

    def __init__(self, config: PWMConfig):
        self.config = config

    async def ingest(self, mode: str = "mock") -> SprintState:
        """
        Ingest sprint state from Jira.

        Args:
            mode: "mock" for synthetic data, "mcp" for MCP server, "api" for direct REST API

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
        """Generate realistic mock project data matching the GitHub mock."""
        now = datetime.now()
        project_key = self.config.ingestion.jira_project_key or "PROJ"
        
        # Split project keys if comma-separated
        if "," in project_key:
            keys = [k.strip() for k in project_key.split(",") if k.strip()]
        else:
            keys = [project_key]

        mock_issues_data = [
            ("Implement GPU instanced particle system", "In Progress", "alice", "high", ["feature", "renderer"], 5),
            ("Extract physics into standalone module", "In Review", "bob", "high", ["refactor", "physics"], 8),
            ("Real-time lighting overhaul (RTX)", "In Progress", "diana", "urgent", ["feature", "renderer"], 10),
            ("Fix audio desync in cutscene playback", "In Progress", "eve", "medium", ["bugfix", "audio"], 2),
            ("AI pathfinding prototype", "Blocked", "frank", "low", ["experiment", "ai"], 20),
            ("Update CI pipeline for new module structure", "Backlog", None, "medium", ["devops"], 1),
        ]

        issues = []
        for i, (title, status, assignee, priority, labels, days_ago) in enumerate(mock_issues_data):
            curr_key = keys[i % len(keys)]
            issues.append(IssueInfo(
                id=f"{curr_key}-{200 + i}",
                title=title,
                status=status,
                assignee=assignee,
                priority=priority,
                labels=labels,
                created_at=now - timedelta(days=days_ago),
            ))

        state = SprintState(
            team_name="Engine Team",
            cycle_name="Sprint 14 — Alpha Milestone",
            tracker_name="Jira",
            issues=issues,
        )

        state.compute_derived_stats()
        state.blocked_issues = [iss.id for iss in issues if iss.status == "Blocked"]
        return state

    async def _ingest_via_mcp(self) -> SprintState:
        """Ingest via Atlassian MCP server using the python mcp client."""
        from mcp.client.session import ClientSession
        from mcp.client.stdio import stdio_client, StdioServerParameters

        cloud_id = self.config.ingestion.jira_cloud_id
        if not cloud_id:
            print("⚠️ PWM_JIRA_CLOUD_ID not set. Falling back to mock data.")
            return self._generate_mock_state()

        env = os.environ.copy()
        # Ensure credentials are in environment variables
        if "JIRA_API_TOKEN" not in env or "JIRA_USER_EMAIL" not in env:
            print("⚠️ JIRA_API_TOKEN or JIRA_USER_EMAIL not set. Falling back to mock data.")
            return self._generate_mock_state()

        server_params = StdioServerParameters(
            command="npx",
            args=["-y", "atlassian-mcp-server"],
            env=env
        )

        jql = self._build_jql_query()

        try:
            async with stdio_client(server_params) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.initialize()
                    
                    # Call searchJiraIssuesUsingJql tool
                    result = await session.call_tool(
                        "searchJiraIssuesUsingJql",
                        {
                            "cloudId": cloud_id,
                            "jql": jql,
                            "maxResults": 50,
                            "fields": ["summary", "status", "assignee", "priority", "labels", "created", "updated"]
                        }
                    )
                    
                    if not result.content:
                        raise ValueError("No content returned from Atlassian MCP server")
                    
                    issues_data = json.loads(result.content[0].text)
                    return self._parse_mcp_data(issues_data)
        except Exception as e:
            print(f"❌ Error communicating with Atlassian MCP server: {e}")
            print("Falling back to mock data for demonstration.")
            return self._generate_mock_state()

    def _parse_mcp_data(self, issues_data: list | dict) -> SprintState:
        """Parse raw MCP JSON into our Pydantic models."""
        issues_list = []
        if isinstance(issues_data, dict):
            # Sometimes Jira API wraps issues in a dictionary with a list key
            issues_list = issues_data.get("issues", [])
        elif isinstance(issues_data, list):
            issues_list = issues_data

        parsed_issues = []
        for issue in issues_list[:50]:
            fields = issue.get("fields", {})
            status_obj = fields.get("status", {})
            status_name = status_obj.get("name", "Unknown") if isinstance(status_obj, dict) else "Unknown"
            
            assignee_obj = fields.get("assignee")
            assignee_name = assignee_obj.get("displayName") if isinstance(assignee_obj, dict) else None
            
            priority_obj = fields.get("priority")
            priority_name = priority_obj.get("name") if isinstance(priority_obj, dict) else None

            created_str = fields.get("created", datetime.now().isoformat())
            updated_str = fields.get("updated", datetime.now().isoformat())
            
            parsed_issues.append(IssueInfo(
                id=issue.get("key", issue.get("id", "UNKNOWN")),
                title=fields.get("summary", "Unknown"),
                status=status_name,
                assignee=assignee_name,
                priority=priority_name,
                labels=fields.get("labels", []),
                created_at=dateutil.parser.parse(created_str).replace(tzinfo=None),
                updated_at=dateutil.parser.parse(updated_str).replace(tzinfo=None)
            ))

        proj_key = self.config.ingestion.jira_project_key or "PROJ"
        state = SprintState(
            team_name=f"{proj_key} Team",
            cycle_name="Jira Board State",
            tracker_name="Jira",
            issues=parsed_issues
        )
        state.compute_derived_stats()
        
        # Check if any issue status indicates it is blocked
        state.blocked_issues = [
            iss.id for iss in parsed_issues 
            if iss.status.lower() in ("blocked", "hold", "impeded")
        ]
        return state

    async def _ingest_via_api(self) -> SprintState:
        """Direct Jira REST API ingestion."""
        cloud_id = self.config.ingestion.jira_cloud_id
        if not cloud_id:
            print("⚠️ PWM_JIRA_CLOUD_ID not set. Falling back to mock data.")
            return self._generate_mock_state()
            
        email = os.environ.get("JIRA_USER_EMAIL")
        token = os.environ.get("JIRA_API_TOKEN")
        if not email or not token:
            print("⚠️ JIRA_USER_EMAIL or JIRA_API_TOKEN not set. Falling back to mock data.")
            return self._generate_mock_state()

        # Format URL: handles raw domain or full https URL
        if not cloud_id.startswith("http"):
            if ".atlassian.net" not in cloud_id:
                url = f"https://{cloud_id}.atlassian.net/rest/api/3/search"
            else:
                url = f"https://{cloud_id}/rest/api/3/search"
        else:
            url = f"{cloud_id}/rest/api/3/search"
            if not url.endswith("/rest/api/3/search"):
                url = url.rstrip("/") + "/rest/api/3/search"

        auth_str = f"{email}:{token}"
        auth_bytes = auth_str.encode("utf-8")
        auth_b64 = base64.b64encode(auth_bytes).decode("utf-8")
        headers = {
            "Authorization": f"Basic {auth_b64}",
            "Accept": "application/json"
        }

        jql = self._build_jql_query()
        params = {
            "jql": jql,
            "maxResults": 50,
            "fields": "summary,status,assignee,priority,labels,created,updated"
        }

        try:
            # Running synchronous requests in executive thread pool to prevent event-loop block
            import asyncio
            loop = asyncio.get_event_loop()
            
            def perform_request():
                return requests.get(url, headers=headers, params=params, timeout=10)
                
            response = await loop.run_in_executor(None, perform_request)
            response.raise_for_status()
            issues_data = response.json()
            return self._parse_mcp_data(issues_data)
        except Exception as e:
            print(f"❌ Error communicating with Jira REST API: {e}")
            print("Falling back to mock data for demonstration.")
            return self._generate_mock_state()

    def _build_jql_query(self) -> str:
        """Construct the JQL query, supporting multiple comma-separated projects."""
        project_key = self.config.ingestion.jira_project_key or "PROJ"
        if "," in project_key:
            keys = [k.strip() for k in project_key.split(",") if k.strip()]
            keys_str = ", ".join(f"'{k}'" for k in keys)
            return f"project IN ({keys_str}) ORDER BY created DESC"
        else:
            return f"project = '{project_key}' ORDER BY created DESC"
