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
PWM Layer 1 Data Fusion Engine
==============================
Merges independent telemetry streams (GitHub, Linear, Slack) into a single 
UnifiedProjectGraph to reveal cross-system dependencies.
"""

from __future__ import annotations

import re
from typing import Optional

from pwm.ingestion.models import (
    FusedEdge,
    FusedNode,
    ProjectState,
    SlackState,
    SprintState,
    UnifiedProjectGraph,
)

class DataFusionEngine:
    """
    Merges disparate state snapshots into a unified dependency graph.
    """

    def fuse(
        self,
        project_state: Optional[ProjectState],
        sprint_state: Optional[SprintState],
        slack_state: Optional[SlackState],
    ) -> UnifiedProjectGraph:
        """Create a graph from the available telemetry sources."""
        graph = UnifiedProjectGraph()
        existing_node_ids = set()

        def add_node(node: FusedNode) -> None:
            if node.id not in existing_node_ids:
                graph.nodes.append(node)
                existing_node_ids.add(node.id)

        # 1. Add GitHub Data (PRs and Branches)
        if project_state:
            for pr in project_state.open_pull_requests:
                node = FusedNode(
                    id=f"pr-{pr.id}",
                    type="pr",
                    name=pr.title,
                    attributes={
                        "author": pr.author,
                        "branch": pr.branch,
                        "files_changed": pr.files_changed,
                    }
                )
                add_node(node)
                
                # Create file dependency nodes implicitly
                for f in pr.files_changed:
                    # Create edge PR -> modifies -> File
                    graph.edges.append(FusedEdge(
                        source_id=f"pr-{pr.id}",
                        target_id=f"file-{f}",
                        relation_type="modifies"
                    ))
                    
                    # Ensure the file node exists using O(1) check
                    file_node_id = f"file-{f}"
                    if file_node_id not in existing_node_ids:
                        file_node = FusedNode(
                            id=file_node_id,
                            type="file",
                            name=f,
                        )
                        add_node(file_node)

        # 2. Add Linear/Jira Data
        if sprint_state:
            for issue in sprint_state.issues:
                node = FusedNode(
                    id=f"issue-{issue.id}",
                    type="issue",
                    name=issue.title,
                    attributes={
                        "status": issue.status,
                        "assignee": issue.assignee,
                        "priority": issue.priority,
                    }
                )
                add_node(node)

                # Link PR to Issue if PR branch name contains issue ID
                # e.g., branch "feature/ENG-123-login" matches issue "ENG-123"
                if project_state:
                    for pr in project_state.open_pull_requests:
                        if issue.id.lower() in pr.branch.lower() or issue.id.lower() in pr.title.lower():
                            graph.edges.append(FusedEdge(
                                source_id=f"pr-{pr.id}",
                                target_id=f"issue-{issue.id}",
                                relation_type="resolves"
                            ))
                            
        # 3. Add Slack Data
        if slack_state:
            # Pre-index PRs by ID string for O(1) lookup
            pr_by_id = {}
            if project_state:
                for pr in project_state.open_pull_requests:
                    pr_by_id[str(pr.id)] = pr

            # Pre-index Issues by ID string (lowercased) for O(1) lookup
            issue_by_id = {}
            if sprint_state:
                for issue in sprint_state.issues:
                    issue_by_id[issue.id.lower()] = issue

            for msg in slack_state.recent_messages:
                has_mentions = False
                msg_text = msg.text
                msg_timestamp = msg.timestamp.timestamp()
                msg_node_id = f"msg-{msg_timestamp}"

                # Match PR mentions: # followed by digits (e.g. "#12")
                pr_matches = re.findall(r"#(\d+)", msg_text)
                for pr_id_str in pr_matches:
                    if pr_id_str in pr_by_id:
                        graph.edges.append(FusedEdge(
                            source_id=msg_node_id,
                            target_id=f"pr-{pr_id_str}",
                            relation_type="references"
                        ))
                        has_mentions = True

                # Match Issue mentions: e.g. ENG-123, PHYSICS-456
                issue_matches = re.findall(r"([a-zA-Z]+-\d+)", msg_text)
                for issue_id in issue_matches:
                    issue_key = issue_id.lower()
                    if issue_key in issue_by_id:
                        actual_issue_id = issue_by_id[issue_key].id
                        graph.edges.append(FusedEdge(
                            source_id=msg_node_id,
                            target_id=f"issue-{actual_issue_id}",
                            relation_type="references"
                        ))
                        has_mentions = True

                if has_mentions:
                    node = FusedNode(
                        id=msg_node_id,
                        type="message",
                        name=f"Msg from {msg.user}",
                        attributes={
                            "text": msg.text,
                            "channel": msg.channel,
                            "sentiment": msg.sentiment
                        }
                    )
                    add_node(node)

        return graph
