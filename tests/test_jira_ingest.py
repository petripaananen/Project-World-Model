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
Unit Tests for Jira Ingestion Module
====================================
"""

from __future__ import annotations

import json
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from pwm.config import PWMConfig
from pwm.ingestion.jira_ingest import JiraIngestor
from pwm.ingestion.models import SprintState


class TestJiraIngest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.config = PWMConfig.from_env()
        self.config.ingestion.issue_tracker = "jira"
        self.config.ingestion.jira_project_key = "TEST"
        self.config.ingestion.jira_cloud_id = "test-site.atlassian.net"
        self.ingestor = JiraIngestor(self.config)

    async def test_mock_ingest(self):
        """Test mock mode produces structured SprintState and issues."""
        state = await self.ingestor.ingest(mode="mock")
        self.assertIsInstance(state, SprintState)
        self.assertEqual(state.team_name, "Engine Team")
        self.assertGreater(len(state.issues), 0)
        
        # Verify first issue key prefix matches project key
        first_issue = state.issues[0]
        self.assertTrue(first_issue.id.startswith("TEST-"))
        self.assertEqual(first_issue.assignee, "alice")
        self.assertEqual(first_issue.priority, "high")

    @patch("requests.get")
    async def test_api_ingest_success(self, mock_get):
        """Test direct REST API ingestion with mocked requests."""
        # Setup mock Jira API response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "issues": [
                {
                    "key": "TEST-101",
                    "fields": {
                        "summary": "Fix collision calculations",
                        "status": {"name": "In Progress"},
                        "assignee": {"displayName": "Alice Cooper"},
                        "priority": {"name": "High"},
                        "labels": ["physics", "bug"],
                        "created": "2026-06-25T10:00:00.000+0000",
                        "updated": "2026-06-26T11:00:00.000+0000"
                    }
                },
                {
                    "key": "TEST-102",
                    "fields": {
                        "summary": "Update renderer shader cache",
                        "status": {"name": "Blocked"},
                        "assignee": None,
                        "priority": {"name": "Medium"},
                        "labels": ["renderer"],
                        "created": "2026-06-24T12:00:00.000+0000",
                        "updated": "2026-06-25T14:00:00.000+0000"
                    }
                }
            ]
        }
        mock_get.return_value = mock_response

        # Set API credentials in environment
        with patch.dict("os.environ", {"JIRA_USER_EMAIL": "user@test.com", "JIRA_API_TOKEN": "token123"}):
            state = await self.ingestor.ingest(mode="api")
            
            self.assertIsInstance(state, SprintState)
            self.assertEqual(len(state.issues), 2)
            self.assertEqual(state.issues[0].id, "TEST-101")
            self.assertEqual(state.issues[0].title, "Fix collision calculations")
            self.assertEqual(state.issues[0].assignee, "Alice Cooper")
            self.assertEqual(state.issues[0].status, "In Progress")
            
            self.assertEqual(state.issues[1].id, "TEST-102")
            self.assertNil = state.issues[1].assignee
            self.assertEqual(state.issues[1].status, "Blocked")
            self.assertEqual(state.blocked_issues, ["TEST-102"])

    @patch("requests.get")
    async def test_api_ingest_failure_fallback(self, mock_get):
        """Test that API failures log warning and fall back to mock data."""
        mock_get.side_effect = Exception("Connection Timeout")
        
        with patch.dict("os.environ", {"JIRA_USER_EMAIL": "user@test.com", "JIRA_API_TOKEN": "token123"}):
            state = await self.ingestor.ingest(mode="api")
            # Should have fallen back to mock state
            self.assertEqual(state.team_name, "Engine Team")
            self.assertEqual(state.issues[0].id, "TEST-200")

    @patch("mcp.client.stdio.stdio_client")
    @patch("mcp.client.session.ClientSession")
    async def test_mcp_ingest_success(self, mock_session_cls, mock_stdio):
        """Test MCP ingestion with mock server session."""
        # Mock stdio context manager
        mock_stdio.return_value.__aenter__.return_value = (MagicMock(), MagicMock())
        
        # Mock ClientSession context manager and instance
        mock_session = AsyncMock()
        mock_session_cls.return_value.__aenter__.return_value = mock_session
        
        # Mock tool call output
        mock_tool_result = MagicMock()
        mock_text_content = MagicMock()
        mock_text_content.text = json.dumps([
            {
                "key": "TEST-301",
                "fields": {
                    "summary": "Audio manager thread lock fix",
                    "status": {"name": "In Review"},
                    "assignee": {"displayName": "Eve"},
                    "priority": {"name": "Low"},
                    "labels": ["audio"],
                    "created": "2026-06-25T15:00:00.000+0000",
                    "updated": "2026-06-25T16:00:00.000+0000"
                }
            }
        ])
        mock_tool_result.content = [mock_text_content]
        mock_session.call_tool.return_value = mock_tool_result

        with patch.dict("os.environ", {"JIRA_USER_EMAIL": "user@test.com", "JIRA_API_TOKEN": "token123"}):
            state = await self.ingestor.ingest(mode="mcp")
            self.assertEqual(len(state.issues), 1)
            self.assertEqual(state.issues[0].id, "TEST-301")
            self.assertEqual(state.issues[0].assignee, "Eve")
            self.assertEqual(state.issues[0].status, "In Review")

    async def test_multi_project_jql_and_mock(self):
        """Test JQL construction and mock issue keys when multiple projects are set."""
        self.config.ingestion.jira_project_key = "PROJ1, PROJ2, PROJ3"
        ingestor = JiraIngestor(self.config)
        
        # Test JQL construction
        jql = ingestor._build_jql_query()
        self.assertEqual(jql, "project IN ('PROJ1', 'PROJ2', 'PROJ3') ORDER BY created DESC")
        
        # Test Mock Ingestion distributes issues across keys
        state = await ingestor.ingest(mode="mock")
        self.assertEqual(len(state.issues), 6)
        
        # Assert issues are round-robined
        self.assertEqual(state.issues[0].id, "PROJ1-200")
        self.assertEqual(state.issues[1].id, "PROJ2-201")
        self.assertEqual(state.issues[2].id, "PROJ3-202")
        self.assertEqual(state.issues[3].id, "PROJ1-203")
        self.assertEqual(state.issues[4].id, "PROJ2-204")
        self.assertEqual(state.issues[5].id, "PROJ3-205")

