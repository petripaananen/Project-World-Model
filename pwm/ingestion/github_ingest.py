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
PWM GitHub Ingestion — Layer 1: Observation & Ingestion
========================================================

Extracts project state data from GitHub via the GitHub MCP server
or direct API calls. Produces a ProjectState snapshot that feeds
into Layer 2's debt detection engine.

Current implementation: Stub with mock data for local development.
Week 2 will implement real MCP integration.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

from pwm.config import PWMConfig
from pwm.ingestion.models import (
    BranchInfo,
    CommitInfo,
    ProjectState,
    PullRequestInfo,
)


class GitHubIngestor:
    """
    Layer 1 GitHub data ingestor.

    Modes:
      - mock: Returns realistic synthetic data for testing
      - mcp: Uses the GitHub MCP server (Week 2)
      - api: Direct GitHub API calls (fallback)
    """

    def __init__(self, config: PWMConfig):
        self.config = config

    async def ingest(self, mode: str = "mock") -> ProjectState:
        """
        Ingest project state from GitHub.

        Args:
            mode: "mock" for synthetic data, "mcp" for MCP server,
                  "api" for direct API calls

        Returns:
            ProjectState snapshot
        """
        if mode == "mock":
            return self._generate_mock_state()
        elif mode == "mcp":
            return await self._ingest_via_mcp()
        elif mode == "api":
            return await self._ingest_via_api()
        else:
            raise ValueError(f"Unknown ingestion mode: {mode}")

    def _generate_mock_state(self) -> ProjectState:
        """
        Generate realistic mock data for testing the full pipeline.

        This simulates a game dev team with multiple active PRs,
        some of which conflict — a classic integration debt scenario.
        """
        now = datetime.now()

        state = ProjectState(
            repo_owner=self.config.ingestion.github_owner or "pwm-demo",
            repo_name=self.config.ingestion.github_repo or "game-engine",
            default_branch="main",
            recent_commits=[
                CommitInfo(
                    sha="abc1234",
                    author="alice",
                    message="feat: add new particle system renderer",
                    timestamp=now - timedelta(hours=2),
                    files_changed=[
                        "engine/renderer/particles.py",
                        "engine/renderer/shaders.glsl",
                        "engine/core/pipeline.py",
                    ],
                    additions=340,
                    deletions=12,
                ),
                CommitInfo(
                    sha="def5678",
                    author="bob",
                    message="refactor: extract physics engine into module",
                    timestamp=now - timedelta(hours=5),
                    files_changed=[
                        "engine/core/pipeline.py",
                        "engine/physics/rigid_body.py",
                        "engine/physics/__init__.py",
                    ],
                    additions=520,
                    deletions=180,
                ),
                CommitInfo(
                    sha="ghi9012",
                    author="carol",
                    message="fix: memory leak in texture loader",
                    timestamp=now - timedelta(hours=8),
                    files_changed=[
                        "engine/assets/texture_loader.py",
                        "engine/core/memory.py",
                    ],
                    additions=45,
                    deletions=30,
                ),
            ],
            open_pull_requests=[
                PullRequestInfo(
                    id=101,
                    title="feat: new particle system with GPU instancing",
                    author="alice",
                    branch="feature/particles-gpu",
                    created_at=now - timedelta(days=3),
                    files_changed=[
                        "engine/renderer/particles.py",
                        "engine/renderer/shaders.glsl",
                        "engine/core/pipeline.py",
                        "engine/core/gpu_manager.py",
                    ],
                    additions=890,
                    deletions=45,
                    labels=["feature", "renderer"],
                ),
                PullRequestInfo(
                    id=102,
                    title="refactor: modular physics engine",
                    author="bob",
                    branch="refactor/physics-module",
                    created_at=now - timedelta(days=5),
                    files_changed=[
                        "engine/core/pipeline.py",
                        "engine/physics/rigid_body.py",
                        "engine/physics/collision.py",
                        "engine/physics/__init__.py",
                        "engine/core/config.py",
                    ],
                    additions=1200,
                    deletions=400,
                    labels=["refactor", "physics"],
                ),
                PullRequestInfo(
                    id=103,
                    title="feat: real-time lighting overhaul",
                    author="diana",
                    branch="feature/rtx-lighting",
                    created_at=now - timedelta(days=7),
                    files_changed=[
                        "engine/renderer/shaders.glsl",
                        "engine/renderer/lighting.py",
                        "engine/renderer/shadow_map.py",
                        "engine/core/pipeline.py",
                    ],
                    additions=1500,
                    deletions=200,
                    labels=["feature", "renderer"],
                ),
                PullRequestInfo(
                    id=104,
                    title="fix: audio sync issues in cutscenes",
                    author="eve",
                    branch="fix/audio-sync",
                    created_at=now - timedelta(days=1),
                    files_changed=[
                        "engine/audio/mixer.py",
                        "engine/cutscenes/timeline.py",
                    ],
                    additions=85,
                    deletions=20,
                    labels=["bugfix", "audio"],
                ),
            ],
            active_branches=[
                BranchInfo(
                    name="feature/particles-gpu",
                    ahead_of_main=12,
                    behind_main=3,
                    last_commit_date=now - timedelta(hours=2),
                    author="alice",
                ),
                BranchInfo(
                    name="refactor/physics-module",
                    ahead_of_main=28,
                    behind_main=15,
                    last_commit_date=now - timedelta(hours=5),
                    author="bob",
                ),
                BranchInfo(
                    name="feature/rtx-lighting",
                    ahead_of_main=45,
                    behind_main=25,
                    last_commit_date=now - timedelta(days=2),
                    author="diana",
                ),
                BranchInfo(
                    name="fix/audio-sync",
                    ahead_of_main=3,
                    behind_main=1,
                    last_commit_date=now - timedelta(hours=1),
                    author="eve",
                ),
                BranchInfo(
                    name="experiment/ai-pathfinding",
                    ahead_of_main=67,
                    behind_main=52,
                    last_commit_date=now - timedelta(days=14),
                    author="frank",
                ),
            ],
        )

        state.compute_derived_stats()
        return state

    async def _ingest_via_mcp(self) -> ProjectState:
        """Ingest via GitHub MCP server using the python mcp client."""
        import os
        import json
        from mcp.client.session import ClientSession
        from mcp.client.stdio import stdio_client, StdioServerParameters

        owner = self.config.ingestion.github_owner
        repo = self.config.ingestion.github_repo
        
        if not owner or not repo:
            # Fall back to mock if not configured
            print("⚠️ PWM_GITHUB_OWNER or PWM_GITHUB_REPO not set. Falling back to mock data.")
            return self._generate_mock_state()

        github_token = os.environ.get("GITHUB_PERSONAL_ACCESS_TOKEN")
        if not github_token:
            print("⚠️ GITHUB_PERSONAL_ACCESS_TOKEN not set. Falling back to mock data.")
            return self._generate_mock_state()

        env = os.environ.copy()
        env["GITHUB_PERSONAL_ACCESS_TOKEN"] = github_token

        server_params = StdioServerParameters(
            command="npx",
            args=["-y", "@modelcontextprotocol/server-github"],
            env=env
        )

        try:
            async with stdio_client(server_params) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.initialize()
                    
                    # Fetch PRs
                    pr_result = await session.call_tool("list_pull_requests", {"owner": owner, "repo": repo})
                    pr_data = json.loads(pr_result.content[0].text) if pr_result.content else []
                    
                    # Fetch Commits
                    commit_result = await session.call_tool("list_commits", {"owner": owner, "repo": repo})
                    commit_data = json.loads(commit_result.content[0].text) if commit_result.content else []

                    return self._parse_mcp_data(owner, repo, pr_data, commit_data)
        except Exception as e:
            print(f"❌ Error communicating with GitHub MCP server: {e}")
            print("Falling back to mock data for demonstration.")
            return self._generate_mock_state()

    def _parse_mcp_data(self, owner: str, repo: str, pr_data: list, commit_data: list) -> ProjectState:
        """Parse raw MCP JSON into our Pydantic models."""
        from datetime import datetime
        import dateutil.parser # type: ignore
        
        prs = []
        for pr in pr_data[:10]:  # Limit to 10 for demo
            # GitHub API structure fallback
            prs.append(PullRequestInfo(
                id=pr.get("number", 0),
                title=pr.get("title", "Unknown"),
                author=pr.get("user", {}).get("login", "unknown"),
                branch=pr.get("head", {}).get("ref", "unknown"),
                created_at=dateutil.parser.parse(pr.get("created_at", datetime.now().isoformat())).replace(tzinfo=None),
                files_changed=[], # MCP list_pull_requests doesn't return files without extra calls
                additions=pr.get("additions", 0),
                deletions=pr.get("deletions", 0),
                labels=[label.get("name") for label in pr.get("labels", [])]
            ))

        commits = []
        for c in commit_data[:10]:
            commit_info = c.get("commit", {})
            commits.append(CommitInfo(
                sha=c.get("sha", "unknown")[:7],
                author=commit_info.get("author", {}).get("name", "unknown"),
                message=commit_info.get("message", ""),
                timestamp=dateutil.parser.parse(commit_info.get("author", {}).get("date", datetime.now().isoformat())).replace(tzinfo=None),
                files_changed=[],
                additions=0,
                deletions=0
            ))

        state = ProjectState(
            repo_owner=owner,
            repo_name=repo,
            default_branch="main",
            recent_commits=commits,
            open_pull_requests=prs,
            active_branches=[]
        )
        state.compute_derived_stats()
        return state

    async def _ingest_via_api(self) -> ProjectState:
        """Direct API fallback. Implemented in Week 4 if needed."""
        raise NotImplementedError("Use mcp or mock mode.")
