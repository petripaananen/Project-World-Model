"""
PWM MS Project Ingestion — Layer 1: Observation & Ingestion
=============================================================

Parses task schedules and dependency networks from MS Project XML exports.
Produces a SprintState snapshot representation for the causal twin.
"""

from __future__ import annotations

import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path
from typing import Union

from pwm.config import PWMConfig
from pwm.ingestion.models import IssueInfo, SprintState


class MSProjectIngestor:
    """Ingestor for parsing MS Project XML files into SprintState models."""

    def __init__(self, config: PWMConfig):
        self.config = config

    def ingest_xml(self, file_content: Union[str, bytes]) -> SprintState:
        """
        Parse MS Project XML string or bytes content.

        Args:
            file_content: XML payload

        Returns:
            SprintState populated with MS Project tasks mapped to IssueInfo.
        """
        if isinstance(file_content, str):
            file_content = file_content.encode("utf-8")

        try:
            root = ET.fromstring(file_content)
        except ET.ParseError as e:
            raise ValueError(f"Invalid XML file format: {e}")

        # Strip XML namespaces for easier XPath navigation
        for elem in root.iter():
            if "}" in elem.tag:
                elem.tag = elem.tag.split("}", 1)[1]

        # Extract Project Metadata
        proj_name = root.findtext("Name") or "MS Project File"
        start_date_str = root.findtext("StartDate")
        
        issues = []
        blocked_issues = []

        # Map task predecessors
        # MS Project defines task UID dependency links
        task_predecessors: dict[str, list[str]] = {}
        for task_elem in root.findall(".//Task"):
            uid = task_elem.findtext("UID")
            if not uid:
                continue
            
            preds = []
            for link in task_elem.findall("PredecessorLink"):
                pred_uid = link.findtext("PredecessorUID")
                if pred_uid:
                    preds.append(pred_uid)
            if preds:
                task_predecessors[uid] = preds

        # Read Resources for Assignee lookup
        resources: dict[str, str] = {}
        for res_elem in root.findall(".//Resource"):
            res_uid = res_elem.findtext("UID")
            res_name = res_elem.findtext("Name")
            if res_uid and res_name:
                resources[res_uid] = res_name

        # Parse tasks
        for task_elem in root.findall(".//Task"):
            uid = task_elem.findtext("UID")
            name = task_elem.findtext("Name")
            
            # Skip root/summary project tasks if they are just grouping elements
            is_summary = task_elem.findtext("Summary") == "1"
            if is_summary or not name or name == proj_name:
                continue

            # Determine Status
            percent_complete = float(task_elem.findtext("PercentComplete") or 0.0)
            status = "Backlog"
            if percent_complete == 100.0:
                status = "Done"
            elif percent_complete > 0.0:
                status = "In Progress"
            
            # Check if predecessor task is not completed, classifying as Blocked
            is_blocked = False
            for pred_uid in task_predecessors.get(uid, []):
                # Find predecessor element to check completion
                pred_elem = root.find(f".//Task[UID='{pred_uid}']")
                if pred_elem is not None:
                    pred_comp = float(pred_elem.findtext("PercentComplete") or 0.0)
                    if pred_comp < 100.0:
                        is_blocked = True
                        status = "Blocked"
                        break

            if is_blocked:
                blocked_issues.append(f"MSP-{uid}")

            # Assignee resolution (using Resource Assignment elements if present)
            assignee = None
            # Find assignment matching this task UID
            assignment = root.find(f".//Assignment[TaskUID='{uid}']")
            if assignment is not None:
                res_uid = assignment.findtext("ResourceUID")
                assignee = resources.get(res_uid)

            # Labels and Attributes
            labels = ["msproject"]
            is_milestone = task_elem.findtext("Milestone") == "1"
            if is_milestone:
                labels.append("milestone")
                
            priority_val = int(task_elem.findtext("Priority") or 500)
            priority = "medium"
            if priority_val >= 800:
                priority = "urgent"
            elif priority_val >= 600:
                priority = "high"
            elif priority_val <= 300:
                priority = "low"

            created_at = None
            create_date_str = task_elem.findtext("CreateDate")
            if create_date_str:
                try:
                    created_at = datetime.fromisoformat(create_date_str.split("Z")[0])
                except Exception:
                    created_at = datetime.now()

            issues.append(
                IssueInfo(
                    id=f"MSP-{uid}",
                    title=name,
                    status=status,
                    assignee=assignee or "Unassigned",
                    priority=priority,
                    labels=labels,
                    created_at=created_at,
                )
            )

        # Build SprintState
        state = SprintState(
            team_name="MS Project Team",
            cycle_name=proj_name,
            issues=issues,
        )
        state.compute_derived_stats()
        state.blocked_issues = blocked_issues
        
        return state
