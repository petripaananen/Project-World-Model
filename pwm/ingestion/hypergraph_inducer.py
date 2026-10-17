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
PWM Zero-Shot Hypergraph Inducer (Layer 1)
===========================================

Transforms arbitrary project telemetry (software Git/Linear/Slack logs,
physical construction schedules, EPC work packages, R&D timelines)
into UniversalEventTuple hypergraphs, binds them to UnifiedProjectGraph
topological graphs, and commits them to the SHA-256 Merkle-Chained Audit Log.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Union

from pwm.ingestion.models import (
    ActorNode,
    ActorType,
    ArtifactNode,
    FusedEdge,
    FusedNode,
    OperationType,
    ProjectState,
    SlackState,
    SprintState,
    UnifiedProjectGraph,
    UniversalEventTuple,
)
from pwm.logging.event_logger import EventLogger, EventType, PWMEvent


class HypergraphInducer:
    """
    Domain-Agnostic Zero-Shot Hypergraph Inducer.
    
    Decouples Layer 1 from software-specific schemas by mapping any telemetry
    stream into universal causal hypergraphs and Merkle audit trails.
    """

    def __init__(self, event_logger: Optional[EventLogger] = None):
        self.event_logger = event_logger

    def from_software_telemetry(
        self,
        project_state: Optional[ProjectState] = None,
        sprint_state: Optional[SprintState] = None,
        slack_state: Optional[SlackState] = None,
    ) -> List[UniversalEventTuple]:
        """
        Adapts software development telemetry (Git, Linear, Slack)
        into universal causal tuples.
        """
        tuples: List[UniversalEventTuple] = []

        # 1. Commits -> MUTATE/CREATE on code artifacts
        if project_state:
            for commit in project_state.recent_commits:
                actor = ActorNode(
                    actor_id=f"actor-{commit.author}",
                    name=commit.author,
                    actor_type=ActorType.HUMAN,
                )
                for file_path in (commit.files_changed or ["unspecified_file"]):
                    artifact = ArtifactNode(
                        artifact_id=f"file-{file_path}",
                        name=file_path,
                        artifact_type="code_file",
                        reversibility_weight=1.0,  # Code commits are version-controlled and reversible
                    )
                    tuples.append(
                        UniversalEventTuple(
                            event_id=f"evt-commit-{commit.sha[:8]}-{uuid.uuid4().hex[:6]}",
                            actor=actor,
                            operation=OperationType.MUTATE,
                            artifact=artifact,
                            dependencies=[],
                            constraints=[],
                            timestamp=commit.timestamp.timestamp() if isinstance(commit.timestamp, datetime) else datetime.now().timestamp(),
                            metadata={"sha": commit.sha, "message": commit.message},
                        )
                    )

            # Pull Requests -> CREATE / MUTATE / VERIFY
            for pr in project_state.open_pull_requests:
                actor = ActorNode(
                    actor_id=f"actor-{pr.author}",
                    name=pr.author,
                    actor_type=ActorType.HUMAN,
                )
                artifact = ArtifactNode(
                    artifact_id=f"pr-{pr.id}",
                    name=pr.title,
                    artifact_type="pull_request",
                    reversibility_weight=0.95,
                    metadata={"branch": pr.branch, "state": pr.state},
                )
                dep_files = [f"file-{f}" for f in pr.files_changed]
                tuples.append(
                    UniversalEventTuple(
                        event_id=f"evt-pr-{pr.id}",
                        actor=actor,
                        operation=OperationType.CREATE if pr.state == "open" else OperationType.VERIFY,
                        artifact=artifact,
                        dependencies=dep_files,
                        constraints=[f"must_pass_ci:pr-{pr.id}", f"base_branch:{pr.base_branch}"],
                        timestamp=pr.created_at.timestamp() if isinstance(pr.created_at, datetime) else datetime.now().timestamp(),
                        metadata={"labels": pr.labels, "review_state": pr.review_state},
                    )
                )

        # 2. Sprint tasks / Issues -> Operations and causal dependencies
        if sprint_state:
            for issue in sprint_state.issues:
                actor = ActorNode(
                    actor_id=f"actor-{issue.assignee or 'unassigned'}",
                    name=issue.assignee or "Unassigned",
                    actor_type=ActorType.HUMAN,
                )
                artifact = ArtifactNode(
                    artifact_id=f"issue-{issue.id}",
                    name=issue.title,
                    artifact_type="task",
                    reversibility_weight=0.90,
                    metadata={"priority": issue.priority, "status": issue.status},
                )
                op = OperationType.BLOCK if issue.id in sprint_state.blocked_issues else OperationType.MUTATE
                constraints = [f"status_precedence:{issue.status}"]
                tuples.append(
                    UniversalEventTuple(
                        event_id=f"evt-issue-{issue.id}",
                        actor=actor,
                        operation=op,
                        artifact=artifact,
                        dependencies=[],
                        constraints=constraints,
                        timestamp=issue.created_at.timestamp() if isinstance(issue.created_at, datetime) else datetime.now().timestamp(),
                        metadata={"cycle": issue.cycle_name, "labels": issue.labels},
                    )
                )

        # 3. Slack communication -> VERIFY or COORDINATION events
        if slack_state:
            for msg in slack_state.recent_messages[:20]:
                actor = ActorNode(
                    actor_id=f"actor-{msg.user}",
                    name=msg.user,
                    actor_type=ActorType.HUMAN,
                )
                artifact = ArtifactNode(
                    artifact_id=f"msg-{msg.channel}-{uuid.uuid4().hex[:6]}",
                    name=f"Channel {msg.channel} discussion",
                    artifact_type="coordination_signal",
                    reversibility_weight=1.0,
                )
                tuples.append(
                    UniversalEventTuple(
                        event_id=f"evt-msg-{uuid.uuid4().hex[:8]}",
                        actor=actor,
                        operation=OperationType.VERIFY,
                        artifact=artifact,
                        dependencies=[],
                        constraints=[],
                        timestamp=msg.timestamp.timestamp() if isinstance(msg.timestamp, datetime) else datetime.now().timestamp(),
                        metadata={"channel": msg.channel, "sentiment": msg.sentiment},
                    )
                )

        return tuples

    def from_generic_records(
        self,
        records: List[Dict[str, Any]],
        domain: str = "physical_construction",
    ) -> List[UniversalEventTuple]:
        """
        Parses arbitrary domain telemetry (e.g., Construction schedules, EPC work packages,
        R&D pipelines, manufacturing logs) into UniversalEventTuple instances.
        
        Expected generic record format (flexible):
          - id / event_id / task_id: str
          - actor / author / contractor: str or dict
          - operation / op / action: str (e.g. "pour", "assemble", "create", "commit", "inspect")
          - artifact / deliverable / package: str or dict
          - dependencies / upstream / predecessor: list of IDs
          - constraints / rules: list of strings
          - reversibility / reversibility_weight: float in [0, 1]
          - timestamp: float or ISO string
        """
        tuples: List[UniversalEventTuple] = []

        for rec in records:
            # 1. Resolve Actor
            raw_actor = rec.get("actor") or rec.get("contractor") or rec.get("team") or rec.get("assignee") or "General_Contractor"
            if isinstance(raw_actor, dict):
                actor_id = raw_actor.get("id", f"actor-{uuid.uuid4().hex[:6]}")
                actor_name = raw_actor.get("name", "Unknown Actor")
                actor_type_str = str(raw_actor.get("type", "human")).lower()
            else:
                actor_name = str(raw_actor)
                actor_id = f"actor-{actor_name.replace(' ', '_').lower()}"
                actor_type_str = "contractor" if "contractor" in actor_name.lower() or "team" in actor_name.lower() else "human"

            actor_type = ActorType.CONTRACTOR if "contractor" in actor_type_str else (
                ActorType.TEAM if "team" in actor_type_str else (
                    ActorType.AI_AGENT if "ai" in actor_type_str or "agent" in actor_type_str else ActorType.HUMAN
                )
            )
            actor = ActorNode(actor_id=actor_id, name=actor_name, actor_type=actor_type)

            # 2. Resolve Operation
            raw_op = str(rec.get("operation") or rec.get("op") or rec.get("action") or "MUTATE").upper()
            if any(k in raw_op for k in ["CREATE", "INSTALL", "ERECT", "BUILD", "POUR", "LAY"]):
                operation = OperationType.CREATE
            elif any(k in raw_op for k in ["VERIFY", "INSPECT", "AUDIT", "TEST", "CHECK"]):
                operation = OperationType.VERIFY
            elif any(k in raw_op for k in ["BLOCK", "DELAY", "HOLD", "STOP"]):
                operation = OperationType.BLOCK
            elif any(k in raw_op for k in ["COMMIT", "ORDER", "PURCHASE", "CAPITAL", "EXPENSE"]):
                operation = OperationType.COMMIT_RESOURCE
            elif any(k in raw_op for k in ["REVERT", "DEMOLISH", "REMOVE", "UNDO", "REDO"]):
                operation = OperationType.REVERT
            else:
                operation = OperationType.MUTATE

            # 3. Resolve Artifact & Reversibility
            raw_art = rec.get("artifact") or rec.get("deliverable") or rec.get("item") or rec.get("component") or f"artifact-{uuid.uuid4().hex[:6]}"
            if isinstance(raw_art, dict):
                art_id = raw_art.get("id", f"art-{uuid.uuid4().hex[:6]}")
                art_name = raw_art.get("name", "Deliverable")
                art_type = raw_art.get("type", domain)
                rev_wt = float(raw_art.get("reversibility_weight", rec.get("reversibility_weight", 0.5)))
            else:
                art_name = str(raw_art)
                art_id = rec.get("artifact_id") or f"art-{art_name.replace(' ', '_').lower()}"
                art_type = str(rec.get("artifact_type") or domain)
                # Default reversibility based on domain keywords if not explicitly provided
                if "reversibility_weight" in rec:
                    rev_wt = float(rec["reversibility_weight"])
                elif any(k in art_name.lower() for k in ["concrete", "foundation", "steel", "procurement", "spent", "hardware"]):
                    rev_wt = 0.05  # Highly irreversible physical artifact
                elif any(k in art_name.lower() for k in ["inspection", "permitting", "survey", "plan", "cad", "bim"]):
                    rev_wt = 0.85  # Easily reversible/revisable design artifact
                else:
                    rev_wt = 0.50

            artifact = ArtifactNode(
                artifact_id=art_id,
                name=art_name,
                artifact_type=art_type,
                reversibility_weight=max(0.0, min(1.0, rev_wt)),
            )

            # 4. Dependencies & Constraints
            deps = rec.get("dependencies") or rec.get("predecessors") or rec.get("upstream") or []
            if isinstance(deps, str):
                deps = [deps]

            constraints = rec.get("constraints") or rec.get("rules") or []
            if isinstance(constraints, str):
                constraints = [constraints]

            # 5. Timestamp
            raw_ts = rec.get("timestamp") or rec.get("date") or datetime.now().timestamp()
            if isinstance(raw_ts, str):
                try:
                    ts = datetime.fromisoformat(raw_ts).timestamp()
                except Exception:
                    ts = datetime.now().timestamp()
            elif isinstance(raw_ts, (int, float)):
                ts = float(raw_ts)
            else:
                ts = datetime.now().timestamp()

            event_id = str(rec.get("event_id") or rec.get("id") or f"evt-{uuid.uuid4().hex[:8]}")

            tuples.append(
                UniversalEventTuple(
                    event_id=event_id,
                    actor=actor,
                    operation=operation,
                    artifact=artifact,
                    dependencies=list(deps),
                    constraints=list(constraints),
                    timestamp=ts,
                    metadata=rec.get("metadata", {}),
                )
            )

        return tuples

    def to_unified_project_graph(
        self,
        event_tuples: List[UniversalEventTuple],
    ) -> UnifiedProjectGraph:
        """
        Synthesizes a UnifiedProjectGraph from universal event tuples,
        preserving causal topology for the Graph-JEPA encoder.
        """
        nodes_dict: Dict[str, FusedNode] = {}
        edges: List[FusedEdge] = []

        for tup in event_tuples:
            # 1. Artifact Node
            if tup.artifact.artifact_id not in nodes_dict:
                nodes_dict[tup.artifact.artifact_id] = FusedNode(
                    id=tup.artifact.artifact_id,
                    type=tup.artifact.artifact_type,
                    name=tup.artifact.name,
                    attributes={
                        "reversibility_weight": tup.artifact.reversibility_weight,
                        **tup.artifact.metadata,
                    },
                )

            # 2. Actor Node
            if tup.actor.actor_id not in nodes_dict:
                nodes_dict[tup.actor.actor_id] = FusedNode(
                    id=tup.actor.actor_id,
                    type=str(tup.actor.actor_type.value),
                    name=tup.actor.name,
                    attributes=tup.actor.metadata,
                )

            # 3. Causal Edge: Actor -> Operation -> Artifact
            edges.append(
                FusedEdge(
                    source_id=tup.actor.actor_id,
                    target_id=tup.artifact.artifact_id,
                    relation_type=tup.operation.value,
                )
            )

            # 4. Dependency Edges: Upstream -> Artifact
            for dep_id in tup.dependencies:
                # Ensure upstream node exists in graph
                if dep_id not in nodes_dict:
                    nodes_dict[dep_id] = FusedNode(
                        id=dep_id,
                        type="dependency_artifact",
                        name=f"Upstream {dep_id}",
                        attributes={},
                    )
                edges.append(
                    FusedEdge(
                        source_id=dep_id,
                        target_id=tup.artifact.artifact_id,
                        relation_type="precedes",
                    )
                )

        return UnifiedProjectGraph(
            fused_at=datetime.now(),
            nodes=list(nodes_dict.values()),
            edges=edges,
        )

    async def commit_to_audit_log(
        self,
        event_tuples: List[UniversalEventTuple],
        run_id: str = "",
    ) -> str:
        """
        Writes each UniversalEventTuple into the Merkle-Chained Audit Log,
        computing SHA-256 chain links and returning the final Merkle root / chain hash.
        """
        if not self.event_logger:
            return "UNCOMMITTED_NO_LOGGER"

        last_hash = self.event_logger.get_last_event_hash()

        for tup in event_tuples:
            evt = PWMEvent(
                event_id=tup.event_id,
                timestamp=datetime.fromtimestamp(tup.timestamp),
                event_type=EventType.TELEMETRY_INGESTED,
                run_id=run_id,
                actor=tup.actor.name,
                summary=f"[{tup.operation.value.upper()}] {tup.artifact.name} by {tup.actor.name}",
                details={
                    "operation": tup.operation.value,
                    "artifact_id": tup.artifact.artifact_id,
                    "artifact_type": tup.artifact.artifact_type,
                    "reversibility_weight": tup.artifact.reversibility_weight,
                    "dependencies": tup.dependencies,
                    "constraints": tup.constraints,
                    "metadata": tup.metadata,
                },
            )
            await self.event_logger.log(evt)
            last_hash = evt.event_hash

        return last_hash
