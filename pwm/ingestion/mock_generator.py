"""
PWM Mock Data Generation Suite
==============================

Generates mock project data (Issues, PRs, Commits, Slack messages) for different
project sizes (Startup, Studio, Enterprise). Supports exporting to static files
(JSON/CSV) and stubs for live API seeding to Jira, Linear, and Google Sheets.
"""

from __future__ import annotations

import json
import os
import random
from datetime import datetime, timedelta
from typing import Dict, Any, List

from pwm.ingestion.models import (
    ProjectState,
    SprintState,
    SlackState,
    IssueInfo,
    PullRequestInfo,
    CommitInfo,
    BranchInfo
)

class MockDataGenerator:
    def __init__(self, size: str = "medium"):
        """
        Sizes: 'small' (Startup), 'medium' (Studio), 'large' (Enterprise)
        """
        self.size = size.lower()
        self._set_parameters()

    def _set_parameters(self):
        if self.size == "small":
            self.num_devs = 5
            self.num_issues = 20
            self.num_prs = 5
            self.num_commits = 30
        elif self.size == "large":
            self.num_devs = 100
            self.num_issues = 500
            self.num_prs = 50
            self.num_commits = 1000
        else: # medium
            self.num_devs = 20
            self.num_issues = 100
            self.num_prs = 15
            self.num_commits = 200

        self.dev_names = [f"Dev_{i}" for i in range(self.num_devs)]

    def generate_project_state(self) -> ProjectState:
        """Generate GitHub Project State with PRs, Branches, and Commits."""
        state = ProjectState(repo_owner="mock_owner", repo_name="mock_repo")
        
        # Generate Commits
        for i in range(self.num_commits):
            state.recent_commits.append(
                CommitInfo(
                    sha=f"commit_{i:04x}",
                    author=random.choice(self.dev_names),
                    message=f"Mock commit {i}",
                    timestamp=datetime.now() - timedelta(hours=random.randint(1, 100)),
                    files_changed=[f"src/file_{random.randint(1, 50)}.py"],
                    additions=random.randint(1, 100),
                    deletions=random.randint(0, 50)
                )
            )

        # Generate PRs
        for i in range(self.num_prs):
            author = random.choice(self.dev_names)
            state.open_pull_requests.append(
                PullRequestInfo(
                    id=i + 1,
                    title=f"Feature: Implementation of mock task {i}",
                    author=author,
                    branch=f"feature/ENG-{random.randint(1, self.num_issues)}",
                    created_at=datetime.now() - timedelta(days=random.randint(1, 5)),
                    files_changed=[f"src/file_{random.randint(1, 50)}.py" for _ in range(random.randint(1, 5))]
                )
            )
            
        # Generate Branches
        for i in range(self.num_prs + 2):
            state.active_branches.append(
                BranchInfo(
                    name=f"feature/ENG-{random.randint(1, self.num_issues)}",
                    ahead_of_main=random.randint(1, 10),
                    behind_main=random.randint(0, 5)
                )
            )
            
        state.compute_derived_stats()
        return state

    def generate_sprint_state(self) -> SprintState:
        """Generate Linear/Jira Sprint State."""
        state = SprintState(team_name="Engineering", cycle_name="Sprint X")
        
        statuses = ["Todo", "In Progress", "In Review", "Done"]
        priorities = ["low", "medium", "high", "urgent"]
        
        for i in range(self.num_issues):
            state.issues.append(
                IssueInfo(
                    id=f"ENG-{i+1}",
                    title=f"Mock Issue {i+1}",
                    status=random.choice(statuses),
                    assignee=random.choice(self.dev_names),
                    priority=random.choice(priorities),
                    cycle_name="Sprint X"
                )
            )
        return state

    # ──────────────────────────────────────────────────────────────
    # Exporters (Static)
    # ──────────────────────────────────────────────────────────────
    
    def export_to_static_files(self, output_dir: str = "mock_data"):
        """Export generated data to JSON and CSV files."""
        os.makedirs(output_dir, exist_ok=True)
        
        project_state = self.generate_project_state()
        sprint_state = self.generate_sprint_state()
        
        # 1. JSON (Linear/GitHub simulation)
        with open(os.path.join(output_dir, f"linear_issues_{self.size}.json"), "w") as f:
            json.dump(sprint_state.model_dump(), f, indent=2, default=str)
            
        with open(os.path.join(output_dir, f"github_state_{self.size}.json"), "w") as f:
            json.dump(project_state.model_dump(), f, indent=2, default=str)

        # 2. CSV (Jira/Google Sheets simulation)
        import csv
        csv_path = os.path.join(output_dir, f"jira_export_{self.size}.csv")
        with open(csv_path, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["Issue Key", "Summary", "Status", "Assignee", "Priority"])
            for issue in sprint_state.issues:
                writer.writerow([issue.id, issue.title, issue.status, issue.assignee, issue.priority])
                
        print(f"Mock data exported to {output_dir}/")

    # ──────────────────────────────────────────────────────────────
    # Live API Seeding (Stubs)
    # ──────────────────────────────────────────────────────────────
    
    async def seed_linear_workspace(self, api_key: str):
        """Stub for creating live mock issues in Linear."""
        print(f"Seeding Linear workspace with {self.num_issues} issues... (STUB)")
        # In a real implementation:
        # async with httpx.AsyncClient() as client:
        #    client.post("https://api.linear.app/graphql", json=...)
        pass

    async def seed_jira_project(self, domain: str, api_token: str):
        """Stub for creating live mock issues in Jira."""
        print(f"Seeding Jira domain {domain} with {self.num_issues} issues... (STUB)")
        pass

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--size", type=str, default="medium", choices=["small", "medium", "large"])
    parser.add_argument("--live", action="store_true", help="Seed live workspaces instead of static files")
    args = parser.parse_args()
    
    gen = MockDataGenerator(size=args.size)
    if args.live:
        print("Live API seeding requested. Executing stubs...")
        import asyncio
        asyncio.run(gen.seed_linear_workspace("mock_key"))
        asyncio.run(gen.seed_jira_project("mock.atlassian.net", "mock_key"))
    else:
        gen.export_to_static_files()
