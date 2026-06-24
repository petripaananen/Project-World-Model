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
Tests for FTUE Ingestion Layer: MS Project XML and Slack JSON Parsers
========================================================================
"""

from __future__ import annotations

import unittest
from datetime import datetime

from pwm.config import PWMConfig
from pwm.ingestion.msproject_ingest import MSProjectIngestor
from pwm.ingestion.slack_ingest import SlackIngestor
from pwm.ingestion.models import IssueInfo, SlackMessage


class TestFTUEIngestionParsers(unittest.TestCase):
    def setUp(self):
        self.config = PWMConfig.from_env()

    def test_ms_project_xml_parser(self):
        """Test parsing a mock Microsoft Project XML export file."""
        mock_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Project xmlns="http://schemas.microsoft.com/project">
            <Name>Test Gantt Schedule</Name>
            <StartDate>2026-06-12T08:00:00</StartDate>
            <Tasks>
                <Task>
                    <UID>1</UID>
                    <Name>Design rendering pipeline</Name>
                    <PercentComplete>100</PercentComplete>
                    <Priority>800</Priority>
                    <Milestone>0</Milestone>
                    <CreateDate>2026-06-01T12:00:00Z</CreateDate>
                </Task>
                <Task>
                    <UID>2</UID>
                    <Name>Implement physics collision detector</Name>
                    <PercentComplete>50</PercentComplete>
                    <Priority>600</Priority>
                    <Milestone>0</Milestone>
                    <PredecessorLink>
                        <PredecessorUID>1</PredecessorUID>
                        <Type>2</Type>
                    </PredecessorLink>
                    <CreateDate>2026-06-05T09:00:00Z</CreateDate>
                </Task>
                <Task>
                    <UID>3</UID>
                    <Name>Alpha Release Milestone</Name>
                    <PercentComplete>0</PercentComplete>
                    <Priority>900</Priority>
                    <Milestone>1</Milestone>
                    <PredecessorLink>
                        <PredecessorUID>2</PredecessorUID>
                        <Type>2</Type>
                    </PredecessorLink>
                    <CreateDate>2026-06-10T10:00:00Z</CreateDate>
                </Task>
            </Tasks>
            <Resources>
                <Resource>
                    <UID>10</UID>
                    <Name>Alice Renderer</Name>
                </Resource>
                <Resource>
                    <UID>20</UID>
                    <Name>Bob Physics</Name>
                </Resource>
            </Resources>
            <Assignments>
                <Assignment>
                    <TaskUID>1</TaskUID>
                    <ResourceUID>10</ResourceUID>
                </Assignment>
                <Assignment>
                    <TaskUID>2</TaskUID>
                    <ResourceUID>20</ResourceUID>
                </Assignment>
            </Assignments>
        </Project>
        """
        
        ingestor = MSProjectIngestor(self.config)
        sprint_state = ingestor.ingest_xml(mock_xml)
        
        # Verify sprint metadata
        self.assertEqual(sprint_state.cycle_name, "Test Gantt Schedule")
        self.assertEqual(sprint_state.team_name, "MS Project Team")
        self.assertEqual(len(sprint_state.issues), 3)
        
        # Check Task 1 (Completed)
        t1 = next(t for t in sprint_state.issues if t.id == "MSP-1")
        self.assertEqual(t1.title, "Design rendering pipeline")
        self.assertEqual(t1.status, "Done")
        self.assertEqual(t1.assignee, "Alice Renderer")
        self.assertEqual(t1.priority, "urgent")
        self.assertIn("msproject", t1.labels)
        
        # Check Task 2 (In Progress)
        t2 = next(t for t in sprint_state.issues if t.id == "MSP-2")
        self.assertEqual(t2.title, "Implement physics collision detector")
        self.assertEqual(t2.status, "In Progress")
        self.assertEqual(t2.assignee, "Bob Physics")
        
        # Check Task 3 (Blocked, Milestone)
        t3 = next(t for t in sprint_state.issues if t.id == "MSP-3")
        self.assertEqual(t3.title, "Alpha Release Milestone")
        self.assertEqual(t3.status, "Blocked") # Predecessor (Task 2) is 50% complete (not 100%)
        self.assertIn("milestone", t3.labels)
        self.assertIn("MSP-3", sprint_state.blocked_issues)

    def test_slack_json_parser(self):
        """Test parsing a mock Slack channel export JSON file."""
        mock_slack_json = """[
            {
                "type": "message",
                "user": "U12345",
                "text": "The engine keeps crashing on startup with auth error!",
                "ts": "1675200000.000000"
            },
            {
                "type": "message",
                "user": "U67890",
                "text": "Waiting on Alice to merge the particle update, I'm stuck.",
                "ts": "1675205000.000000"
            },
            {
                "type": "message",
                "user": "U12345",
                "text": "Ready to test the new collision fix now. Merging works.",
                "ts": "1675210000.000000"
            }
        ]
        """
        
        ingestor = SlackIngestor(self.config)
        slack_state = ingestor.ingest_json(mock_slack_json, channel_name="engine-dev")
        
        # Verify SlackState stats
        self.assertEqual(slack_state.total_messages, 3)
        self.assertIn("engine-dev", slack_state.channels)
        self.assertEqual(len(slack_state.active_users), 2)
        
        # Verify sentiment mapping
        m1 = slack_state.recent_messages[0]
        self.assertEqual(m1.sentiment, "frustrated") # Triggered by "crashing" or "error"
        
        m2 = slack_state.recent_messages[1]
        self.assertEqual(m2.sentiment, "blocked") # Triggered by "waiting" or "stuck"
        
        m3 = slack_state.recent_messages[2]
        self.assertEqual(m3.sentiment, "positive") # Triggered by "ready" or "works"


if __name__ == "__main__":
    unittest.main()
