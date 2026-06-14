"""
PWM Layer 1 Data Fusion Engine
==============================
Merges independent telemetry streams (GitHub, Linear, Slack) into a single 
UnifiedProjectGraph to reveal cross-system dependencies.
"""

from __future__ import annotations

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
                graph.nodes.append(node)
                
                # Create file dependency nodes implicitly
                for f in pr.files_changed:
                    # Create edge PR -> modifies -> File
                    graph.edges.append(FusedEdge(
                        source_id=f"pr-{pr.id}",
                        target_id=f"file-{f}",
                        relation_type="modifies"
                    ))
                    # Optionally, ensure the file node exists
                    if not any(n.id == f"file-{f}" for n in graph.nodes):
                        graph.nodes.append(FusedNode(
                            id=f"file-{f}",
                            type="file",
                            name=f,
                        ))

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
                graph.nodes.append(node)

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
            for msg in slack_state.recent_messages:
                # Basic string matching: does this message mention a PR or Issue?
                mentions_pr = False
                if project_state:
                    for pr in project_state.open_pull_requests:
                        if f"#{pr.id}" in msg.text:
                            graph.edges.append(FusedEdge(
                                source_id=f"msg-{msg.timestamp.timestamp()}",
                                target_id=f"pr-{pr.id}",
                                relation_type="references"
                            ))
                            mentions_pr = True
                            
                if sprint_state:
                    for issue in sprint_state.issues:
                        if issue.id in msg.text:
                            graph.edges.append(FusedEdge(
                                source_id=f"msg-{msg.timestamp.timestamp()}",
                                target_id=f"issue-{issue.id}",
                                relation_type="references"
                            ))
                            mentions_pr = True
                            
                if mentions_pr:
                    node = FusedNode(
                        id=f"msg-{msg.timestamp.timestamp()}",
                        type="message",
                        name=f"Msg from {msg.user}",
                        attributes={
                            "text": msg.text,
                            "channel": msg.channel,
                            "sentiment": msg.sentiment
                        }
                    )
                    graph.nodes.append(node)

        return graph
