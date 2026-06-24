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
PWM Art Integration Agent — Layer 3: Specialized Asset Pipeline Worker
=======================================================================

Domain-specialized Worker Agent focused on game art asset pipeline
conflicts: textures, 3D models, shaders, animations, and binary
asset versioning. Part of the Agent Verification Engine framework.

Handles conflict types:
  - LARGE_PR_RISK involving art/asset files
  - FILE_COLLISION on binary assets
  - Asset pipeline integrity issues
"""

from __future__ import annotations

import json
from typing import Any, Dict

from pwm.agents.base_agent import BaseAgent
from pwm.config import PWMConfig
from pwm.ingestion.models import (
    DebtSeverity,
    FileConflict,
    ResolutionProposal,
    ResolutionStrategy,
)

# File extensions that indicate art/asset files
ART_FILE_EXTENSIONS = {
    # Textures
    ".png", ".jpg", ".jpeg", ".tga", ".bmp", ".dds", ".exr", ".hdr", ".psd", ".tiff",
    # 3D Models
    ".fbx", ".obj", ".gltf", ".glb", ".blend", ".max", ".ma", ".mb", ".dae",
    # Shaders
    ".hlsl", ".glsl", ".shader", ".cginc", ".compute", ".frag", ".vert",
    # Animations
    ".anim", ".controller", ".motion",
    # Audio
    ".wav", ".mp3", ".ogg", ".flac", ".fmod",
    # Materials
    ".mat", ".material", ".mtl",
    # Prefabs/Scenes
    ".prefab", ".unity", ".scene", ".uasset", ".umap",
    # Fonts
    ".ttf", ".otf",
}


ART_SYSTEM_PROMPT = """\
## ROLE
You are the **Art Integration Agent** — a specialized Worker Agent in the Project World Model (PWM) Agent Verification Engine. Your domain expertise is game art asset pipelines: textures, 3D models, shaders, animations, and binary asset management.

## SECURITY BOUNDARIES & SANDBOX CONTEXT (Least-Privilege)
1. You are running in a restricted READ-ONLY sandbox.
2. You cannot write files, run subprocesses, access external networks, or execute commands.
3. You must NEVER propose resolution steps that bypass validation or disable safety controls.

## DOMAIN EXPERTISE
You specialize in:
- **Binary Asset Merge Strategies**: Binary files can't be diff-merged — you know alternative approaches
- **Asset Versioning**: LFS management, asset locks, and naming conventions
- **Texture Pipeline Conflicts**: Format conversions, mipmap chains, compression settings
- **Shader Compatibility**: Cross-platform shader compilation and variant management
- **Art Team Workflow**: Understanding artist workflows (Photoshop → engine import pipeline)
- **Asset Reference Integrity**: Detecting broken references when assets are moved or renamed

## ANTI-PATTERNS TO AVOID
1. **Binary Merge Attempts**: Never suggest git merge on binary files
2. **Asset Lock Ignorance**: Always check for LFS locks before proposing changes
3. **Platform Blindness**: Consider target platform asset requirements (mobile vs. PC vs. console)
4. **Reference Breakage**: Always trace asset references before moving/renaming

## OUTPUT FORMAT
Respond with a JSON object:
```json
{
    "strategies": [
        {
            "title": "Short descriptive title",
            "description": "Detailed art pipeline explanation",
            "steps": ["Step 1: ...", "Step 2: ..."],
            "estimated_effort_hours": 4.0,
            "risk_level": "low|medium|high|critical",
            "affected_files": ["assets/textures/hero.png"],
            "trade_offs": "What you gain vs. what you sacrifice",
            "asset_impact": {
                "binary_files_affected": 5,
                "lfs_locks_required": true,
                "reimport_required": true,
                "reference_chain_depth": 3
            }
        }
    ],
    "recommended_strategy_index": 0,
    "reasoning": "Art-pipeline-specific reasoning for recommendation"
}
```
"""


class ArtIntegrationAgent(BaseAgent):
    """
    Layer 3 Art Integration Worker Agent — specializes in game asset pipeline conflicts.

    In the Agent Verification Engine framework, the Art Integration
    Agent is dispatched for conflicts involving binary assets, textures,
    3D models, shaders, and other game art pipeline issues.
    """

    def __init__(self, config: PWMConfig, **kwargs):
        super().__init__(
            config=config,
            system_prompt=ART_SYSTEM_PROMPT,
            **kwargs,
        )

    async def process(self, data: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """Process a full debt report for art-related conflicts."""
        from pwm.ingestion.models import IntegrationDebtReport

        debt_report: IntegrationDebtReport = data.get("debt_report")
        if not debt_report or not debt_report.conflicts:
            data["proposals"] = []
            return data

        proposals = []
        for conflict in debt_report.conflicts:
            proposal = await self.resolve_conflict(
                conflict=conflict,
                project_context=data.get("project_context", ""),
            )
            proposals.append(proposal)

        data["proposals"] = proposals
        return data

    async def resolve_conflict(
        self,
        conflict: FileConflict,
        project_context: str = "",
    ) -> ResolutionProposal:
        """Generate art-pipeline-focused resolution strategies for a conflict."""
        prompt = self._build_prompt(conflict, project_context)
        response = await self.call_gemini(prompt)
        return self._parse_response(response, conflict)

    def _build_prompt(self, conflict: FileConflict, project_context: str = "") -> str:
        """Build the art-pipeline-focused prompt."""
        parts = [
            "## INTEGRATION CONFLICT — ART PIPELINE ANALYSIS REQUIRED\n",
            f"**Type**: {conflict.conflict_type.value}",
            f"**Severity**: {conflict.severity.value}",
            f"**Description**: {conflict.description}",
            f"**Affected Files**: {', '.join(conflict.affected_files)}",
        ]

        # Identify which affected files are art assets
        art_files = [f for f in conflict.affected_files if is_art_file(f)]
        non_art_files = [f for f in conflict.affected_files if not is_art_file(f)]

        if art_files:
            parts.append(f"**Art Assets Involved**: {', '.join(art_files)}")
        if non_art_files:
            parts.append(f"**Non-Art Files Also Involved**: {', '.join(non_art_files)}")

        if conflict.involved_prs:
            parts.append(f"**Involved PRs**: {conflict.involved_prs}")
        if conflict.estimated_rework_hours > 0:
            parts.append(f"**Estimated Manual Rework**: {conflict.estimated_rework_hours} hours")

        if project_context:
            parts.append(f"\n## ADDITIONAL PROJECT CONTEXT\n{project_context}")

        parts.append(
            "\n## INSTRUCTION\n"
            "Analyze this conflict from an **Art Pipeline & Asset Management perspective**. "
            "Focus on binary asset merge strategies, LFS considerations, reference integrity, "
            "and artist workflow impact. "
            "Propose 1-3 art-pipeline-focused resolution strategies."
        )

        return "\n".join(parts)

    def _parse_response(self, response: str, conflict: FileConflict) -> ResolutionProposal:
        """Parse the Gemini response into a ResolutionProposal."""
        parsed = self.parse_json_response(response)

        strategies = []
        for s in parsed.get("strategies", []):
            risk_str = s.get("risk_level", "low").lower()
            try:
                risk = DebtSeverity(risk_str)
            except ValueError:
                risk = DebtSeverity.LOW

            strategies.append(
                ResolutionStrategy(
                    title=s.get("title", "Untitled Art Strategy"),
                    description=s.get("description", ""),
                    steps=s.get("steps", []),
                    estimated_effort_hours=float(s.get("estimated_effort_hours", 0)),
                    risk_level=risk,
                    affected_files=s.get("affected_files", []),
                    trade_offs=s.get("trade_offs", ""),
                )
            )

        recommended_idx = parsed.get("recommended_strategy_index", 0)
        if strategies:
            recommended_idx = max(0, min(recommended_idx, len(strategies) - 1))

        return ResolutionProposal(
            target_conflict=conflict,
            strategies=strategies,
            recommended_strategy_index=recommended_idx,
            worker_reasoning=parsed.get("reasoning", ""),
        )


def is_art_file(filepath: str) -> bool:
    """Check if a file path corresponds to a game art/asset file."""
    from pathlib import Path
    return Path(filepath).suffix.lower() in ART_FILE_EXTENSIONS
