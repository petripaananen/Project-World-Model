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
PWM Artistic Integrity Agent — Layer 4: Creative Alignment Sentinel
======================================================================

Audits Worker Agent proposals for creative quality degradation —
the kind of "soul-less" shortcuts that pass standard architectural
review but silently erode product quality. This directly addresses
*Algorithmic Value Capture* (Thesis §2.4, §6.2.2).

While the CriticAgent focuses on technical correctness (architecture,
tests, scope), the Artistic Integrity Agent focuses on:

  - Asset simplification (reducing polygon counts, texture resolution)
  - Shader/material downgrades
  - Gameplay mechanic alterations that flatten player experience
  - Frame-rate / performance parameter changes that sacrifice visual fidelity
  - Test bypass for visual or UX components
  - "Generic" refactors that strip unique creative identity

The agent runs as a secondary audit inside the Layer 4 validation
pipeline, appending its findings to the CriticAgent's verdict.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from pwm.agents.base_agent import BaseAgent
from pwm.config import PWMConfig
from pwm.ingestion.models import FileConflict, ResolutionProposal


ARTISTIC_INTEGRITY_SYSTEM_PROMPT = """\
## ROLE
You are the Artistic Integrity Agent in the Project World Model (PWM).
Your purpose is to protect the creative vision and artistic quality of
game and software products from being silently degraded by automated
resolution proposals.

## YOUR MANDATE
You exist to prevent **Algorithmic Value Capture** — the phenomenon
where AI optimization agents produce technically correct solutions that
systematically erode subjective product quality.

You are NOT a code reviewer. You are a **creative alignment sentinel**.

## WHAT YOU AUDIT
1. **Asset Quality**: Does the proposal simplify, downsample, or remove
   visual assets (textures, models, shaders, animations, UI elements)?
2. **Gameplay Impact**: Does the proposal alter gameplay parameters,
   difficulty curves, or player-facing mechanics?
3. **Visual Fidelity**: Does the proposal change rendering settings,
   LOD thresholds, frame-rate caps, or shader complexity?
4. **Creative Identity**: Does the proposal replace unique, hand-crafted
   elements with generic or boilerplate alternatives?
5. **Test Coverage for Visuals**: Does the proposal skip or disable
   visual regression tests, screenshot comparisons, or UX validation?

## WHAT YOU IGNORE
- Pure backend refactors with no user-facing impact
- Build system or dependency changes
- Documentation-only changes
- Test infrastructure improvements

## OUTPUT FORMAT
```json
{
    "creative_fidelity_score": 0.92,
    "quality_degradation_detected": false,
    "degradation_details": "No creative quality concerns detected.",
    "affected_creative_areas": [],
    "recommendation": "pass"
}
```

Where:
- `creative_fidelity_score`: 0.0 (complete creative destruction) to 1.0 (creative vision fully preserved)
- `quality_degradation_detected`: true if ANY creative quality concern is found
- `degradation_details`: Specific explanation of what would be degraded and why it matters
- `affected_creative_areas`: List of impacted areas (e.g., "shaders", "textures", "gameplay_mechanics", "ui_layout")
- `recommendation`: "pass" (no concerns), "flag_for_review" (minor concerns, human should see), or "reject" (significant creative damage)

## CRITICAL RULES
- Be SPECIFIC about what creative element is at risk and why it matters.
- You must distinguish between *necessary* technical trade-offs and *lazy* quality cuts.
- A proposal that clearly documents WHY it reduces quality (e.g., performance target) should get "flag_for_review", not "reject".
- Pure infrastructure changes that don't touch user-facing code should always "pass".
"""


# File patterns that indicate creative/artistic content
_ART_PATTERNS = {
    "shaders", "glsl", "hlsl", "shader", "material",
    "texture", "sprite", "mesh", "model", "fbx", "gltf", "obj",
    "animation", "anim", "keyframe",
    "ui", "ux", "layout", "widget", "component",
    "audio", "sound", "music", "sfx",
    "vfx", "particle", "effect",
    "render", "pipeline", "postprocess",
    "level", "scene", "prefab",
    "font", "icon", "asset",
}


class ArtisticIntegrityAgent(BaseAgent):
    """
    Layer 4 Artistic Integrity Critic — audits proposals for creative quality degradation.

    Protects against Algorithmic Value Capture (Thesis §2.4) by ensuring
    automated resolution proposals do not silently erode the subjective
    quality, visual fidelity, or creative identity of the product.

    Usage::

        agent = ArtisticIntegrityAgent(config)
        verdict = await agent.audit_proposal(conflict, proposal, context)
        if verdict["quality_degradation_detected"]:
            # Flag for Scenario Strategist review
    """

    def __init__(self, config: PWMConfig, **kwargs):
        super().__init__(
            config=config,
            system_prompt=ARTISTIC_INTEGRITY_SYSTEM_PROMPT,
            **kwargs,
        )

    async def process(self, data: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """Abstract method from BaseAgent — not used directly."""
        return data

    def is_art_relevant(self, conflict: Optional[FileConflict] = None, proposal: Optional[ResolutionProposal] = None) -> bool:
        """
        Quick heuristic check: does this conflict/proposal touch files that
        might have artistic or creative significance?

        Returns True if any affected file path contains art-related keywords.
        This avoids spending tokens on purely backend proposals.
        """
        paths_to_check: list[str] = []

        if conflict and conflict.affected_files:
            paths_to_check.extend(conflict.affected_files)

        if proposal:
            for strategy in proposal.strategies:
                if strategy.affected_files:
                    paths_to_check.extend(strategy.affected_files)

        if not paths_to_check:
            # No files to check — could be relevant, let the LLM decide
            return True

        for path in paths_to_check:
            path_lower = path.lower()
            for pattern in _ART_PATTERNS:
                if pattern in path_lower:
                    return True

        return False

    async def audit_proposal(
        self,
        conflict: FileConflict,
        worker_proposal: ResolutionProposal,
        project_context: str,
    ) -> Dict[str, Any]:
        """
        Audit a worker's resolution proposal for creative quality degradation.

        Args:
            conflict: The integration debt conflict being resolved
            worker_proposal: The worker's proposed resolution
            project_context: Current project state context string

        Returns:
            Dict with creative_fidelity_score, quality_degradation_detected,
            degradation_details, affected_creative_areas, and recommendation
        """
        # Build the audit prompt
        idx = worker_proposal.recommended_strategy_index
        strategy = worker_proposal.strategies[idx] if worker_proposal.strategies else None

        prompt_parts = [
            "## CONFLICT\n",
            f"Type: {conflict.conflict_type.value}",
            f"Description: {conflict.description}",
            f"Severity: {conflict.severity.value}",
            f"Affected Files: {', '.join(conflict.affected_files) if conflict.affected_files else 'N/A'}",
            "\n## WORKER'S PROPOSED RESOLUTION\n",
        ]

        if strategy:
            prompt_parts.extend([
                f"Title: {strategy.title}",
                f"Description: {strategy.description}",
                f"Steps: {', '.join(strategy.steps)}",
                f"Affected Files: {', '.join(strategy.affected_files) if strategy.affected_files else 'N/A'}",
                f"Trade-offs: {strategy.trade_offs}",
            ])
        else:
            prompt_parts.append("No specific strategy available.")

        prompt_parts.append(f"\n## PROJECT CONTEXT\n{project_context}\n")
        prompt_parts.append(
            "\nAudit this proposal for creative quality degradation. "
            "Does it silently reduce visual fidelity, artistic quality, "
            "or gameplay experience?"
        )

        response = await self.call_gemini("\n".join(prompt_parts))
        parsed = self.parse_json_response(response)

        # Normalize and validate the parsed output
        return {
            "creative_fidelity_score": float(parsed.get("creative_fidelity_score", 1.0)),
            "quality_degradation_detected": bool(parsed.get("quality_degradation_detected", False)),
            "degradation_details": str(parsed.get("degradation_details", "No concerns.")),
            "affected_creative_areas": list(parsed.get("affected_creative_areas", [])),
            "recommendation": str(parsed.get("recommendation", "pass")),
        }
