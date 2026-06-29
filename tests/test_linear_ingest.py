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
Unit Tests for Linear Ingestion Module
======================================
"""

from __future__ import annotations

import json
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from pwm.config import PWMConfig
from pwm.ingestion.linear_ingest import LinearIngestor
from pwm.ingestion.models import SprintState


class TestLinearIngest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.config = PWMConfig.from_env()
        self.config.ingestion.issue_tracker = "linear"
        self.config.ingestion.linear_team_id = "ENG"
        self.ingestor = LinearIngestor(self.config)

    async def test_mock_ingest(self):
        """Test mock mode produces structured SprintState and issues."""
        state = await self.ingestor.ingest(mode="mock")
        self.assertIsInstance(state, SprintState)
        self.assertEqual(state.team_name, "Engine Team")
        self.assertGreater(len(state.issues), 0)
        
        # Verify first issue details
        first_issue = state.issues[0]
        self.assertEqual(first_issue.id, "ENG-201")
        self.assertEqual(first_issue.assignee, "alice")
        self.assertEqual(first_issue.priority, "high")

    @patch("requests.post")
    async def test_api_ingest_success(self, mock_post):
        """Test direct GraphQL API ingestion with mocked requests."""
        # Setup mock Linear API response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": {
                "team": {
                    "name": "Platform Team",
                    "activeCycle": {"name": "Sprint 14"},
                    "issues": {
                        "nodes": [
                            {
                                "id": "issue-1",
                                "identifier": "ENG-301",
                                "title": "Implement cache layer",
                                "priority": 2, # High
                                "createdAt": "2026-06-25T10:00:00.000Z",
                                "state": {"name": "In Progress"},
                                "assignee": {"name": "Bob"},
                                "labels": {"nodes": [{"name": "backend"}]}
                            },
                            {
                                "id": "issue-2",
                                "identifier": "ENG-302",
                                "title": "Configure SSL",
                                "priority": 1, # Urgent
                                "createdAt": "2026-06-24T12:00:00.000Z",
                                "state": {"name": "Blocked"},
                                "assignee": None,
                                "labels": {"nodes": [{"name": "devops"}, {"name": "blocked"}]}
                            }
                        ]
                    }
                }
            }
        }
        mock_post.return_value = mock_response

        # Set API credentials in environment
        with patch.dict("os.environ", {"LINEAR_API_KEY": "lin-key-123"}):
            state = await self.ingestor.ingest(mode="api")
            
            self.assertIsInstance(state, SprintState)
            self.assertEqual(state.team_name, "Platform Team")
            self.assertEqual(state.cycle_name, "Sprint 14")
            self.assertEqual(len(state.issues), 2)
            
            self.assertEqual(state.issues[0].id, "ENG-301")
            self.assertEqual(state.issues[0].title, "Implement cache layer")
            self.assertEqual(state.issues[0].assignee, "Bob")
            self.assertEqual(state.issues[0].priority, "high")
            self.assertEqual(state.issues[0].status, "In Progress")
            
            self.assertEqual(state.issues[1].id, "ENG-302")
            self.assertEqual(state.issues[1].assignee, "Unassigned")
            self.assertEqual(state.issues[1].priority, "urgent")
            self.assertEqual(state.issues[1].status, "Blocked")
            # Should detect blocked issue because status is Blocked & has blocked label
            self.assertEqual(state.blocked_issues, ["ENG-302"])

    @patch("requests.post")
    async def test_api_ingest_failure_fallback(self, mock_post):
        """Test that API failures fall back to mock data."""
        mock_post.side_effect = Exception("API Timeout")
        
        with patch.dict("os.environ", {"LINEAR_API_KEY": "lin-key-123"}):
            state = await self.ingestor.ingest(mode="api")
            # Should have fallen back to mock state
            self.assertEqual(state.team_name, "Engine Team")
            self.assertEqual(state.issues[0].id, "ENG-201")

    @patch("mcp.client.stdio.stdio_client")
    @patch("mcp.client.session.ClientSession")
    async def test_mcp_ingest_success(self, mock_session_cls, mock_stdio):
        """Test MCP ingestion path with mocked stdio session."""
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
                "identifier": "ENG-401",
                "title": "Fix database deadlock",
                "state": {"name": "In Review"},
                "assignee": {"name": "Charlie"},
                "priority": 3,
                "labels": {"nodes": []},
                "createdAt": "2026-06-25T15:00:00.000Z"
            }
        ])
        mock_tool_result.content = [mock_text_content]
        mock_session.call_tool.return_value = mock_tool_result

        with patch.dict("os.environ", {"LINEAR_API_KEY": "lin-key-123"}):
            state = await self.ingestor.ingest(mode="mcp")
            self.assertEqual(len(state.issues), 1)
            self.assertEqual(state.issues[0].id, "ENG-401")
            self.assertEqual(state.issues[0].assignee, "Charlie")
            self.assertEqual(state.issues[0].status, "In Review")
