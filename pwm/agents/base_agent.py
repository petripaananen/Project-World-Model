"""
PWM Base Agent
===============

Abstract base class for all PWM agents. Adapted from papervizagent's BaseAgent
pattern but tailored for integration debt analysis rather than visualization.

Key differences from papervizagent:
  - Uses PWMConfig instead of ExpConfig
  - Adds token tracking for CRR metric
  - Structured JSON output with json_repair fallback
  - Built-in retry logic with exponential backoff
"""

from __future__ import annotations

import json
import time
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

import json_repair
from google import genai
from google.genai import types

from pwm.config import PWMConfig


class BaseAgent(ABC):
    """Base class for all PWM agents (Worker, Critic)."""

    def __init__(
        self,
        config: PWMConfig,
        system_prompt: str = "",
        model_override: Optional[str] = None,
    ):
        self.config = config
        self.system_prompt = system_prompt
        self.model_name = model_override or config.models.reasoning_model

        # Token tracking for CRR
        self._total_input_tokens = 0
        self._total_output_tokens = 0

        # Initialize Gemini client
        self._client = self._create_client()

    def _create_client(self) -> genai.Client:
        """Create the appropriate Gemini client based on config."""
        if self.config.google_api_key:
            return genai.Client(api_key=self.config.google_api_key)
        elif self.config.gcp.project_id:
            return genai.Client(
                vertexai=True,
                project=self.config.gcp.project_id,
                location=self.config.gcp.location,
            )
        else:
            raise ValueError(
                "No API access configured. Set GOOGLE_API_KEY or GCP_PROJECT_ID."
            )

    @property
    def token_usage(self) -> Dict[str, int]:
        """Return cumulative token usage for CRR calculation."""
        return {
            "input_tokens": self._total_input_tokens,
            "output_tokens": self._total_output_tokens,
        }

    async def call_gemini(
        self,
        prompt: str,
        system_prompt_override: Optional[str] = None,
        temperature: Optional[float] = None,
        max_output_tokens: Optional[int] = None,
        max_retries: int = 3,
        retry_delay: float = 2.0,
    ) -> str:
        """
        Call Gemini API with retry logic and token tracking.

        Args:
            prompt: The user prompt to send
            system_prompt_override: Override the default system prompt
            temperature: Override default temperature
            max_output_tokens: Override default max tokens
            max_retries: Number of retry attempts
            retry_delay: Base delay between retries (exponential backoff)

        Returns:
            The model's text response
        """
        sys_prompt = system_prompt_override or self.system_prompt
        temp = temperature if temperature is not None else self.config.models.temperature
        max_tokens = max_output_tokens or self.config.models.max_output_tokens

        gen_config = types.GenerateContentConfig(
            system_instruction=sys_prompt if sys_prompt else None,
            temperature=temp,
            max_output_tokens=max_tokens,
        )

        last_error = None
        for attempt in range(max_retries):
            try:
                response = await self._client.aio.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=gen_config,
                )

                # Track tokens
                if response.usage_metadata:
                    self._total_input_tokens += (
                        response.usage_metadata.prompt_token_count or 0
                    )
                    self._total_output_tokens += (
                        response.usage_metadata.candidates_token_count or 0
                    )

                return response.text or ""

            except Exception as e:
                last_error = e
                if attempt < max_retries - 1:
                    wait = retry_delay * (2 ** attempt)
                    if self.config.verbose:
                        print(
                            f"⚠️ [{self.__class__.__name__}] "
                            f"Retry {attempt + 1}/{max_retries} after {wait:.1f}s: {e}"
                        )
                    time.sleep(wait)

        raise RuntimeError(
            f"[{self.__class__.__name__}] Failed after {max_retries} attempts: "
            f"{last_error}"
        )

    def parse_json_response(self, response: str) -> Dict[str, Any]:
        """
        Parse a JSON response from the model, with repair fallback.

        Handles common LLM output quirks:
        - Markdown code fences (```json ... ```)
        - Trailing commas
        - Single quotes instead of double quotes
        """
        # Strip markdown code fences
        cleaned = response.strip()
        if cleaned.startswith("```"):
            # Remove first line (```json) and last line (```)
            lines = cleaned.split("\n")
            cleaned = "\n".join(lines[1:-1]).strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            # Fall back to json_repair
            try:
                result = json_repair.loads(cleaned)
                if isinstance(result, dict):
                    return result
                return {"raw": result}
            except Exception:
                return {"raw": cleaned, "_parse_error": True}

    @abstractmethod
    async def process(self, data: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """
        Process input data and return results.

        Each agent subclass implements this with its specific logic.
        The data dict is the shared pipeline state that flows through all layers.

        Args:
            data: Input data dictionary (typically PWMPipelineState fields)
            **kwargs: Agent-specific parameters

        Returns:
            Updated data dictionary with agent's outputs added
        """
        ...
