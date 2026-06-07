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

import asyncio
import json
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
        self._token_lock = asyncio.Lock()

        # Initialize Gemini client
        self._client = self._create_client()

    def _create_client(self) -> genai.Client:
        """Create the appropriate Gemini client based on config."""
        # Prioritize Vertex AI if GCP project is configured (Phase 6 transition)
        if self.config.gcp.project_id:
            return genai.Client(
                vertexai=True,
                project=self.config.gcp.project_id,
                location=self.config.gcp.location,
            )
        elif self.config.google_api_key:
            return genai.Client(api_key=self.config.google_api_key)
        else:
            raise ValueError(
                "No API access configured. Set GCP_PROJECT_ID or GOOGLE_API_KEY."
            )

    @property
    def token_usage(self) -> Dict[str, int]:
        """Return cumulative token usage for CRR calculation."""
        return {
            "input_tokens": self._total_input_tokens,
            "output_tokens": self._total_output_tokens,
        }

    def sanitize_input(self, text: str) -> str:
        """
        Sanitize text inputs to mitigate prompt injection, XSS, and command injection attacks.
        Strips script/iframe tags and neutralizes typical system prompt bypass keywords.
        """
        if not text:
            return ""
        
        import re
        # Strip XSS script / iframe tags
        sanitized = re.sub(r"<script.*?>.*?</script>", "", text, flags=re.IGNORECASE)
        sanitized = re.sub(r"<iframe.*?>.*?</iframe>", "", sanitized, flags=re.IGNORECASE)
        
        # Neutralize prompt injection attempts
        injection_patterns = [
            r"ignore\s+(?:all\s+|previous\s+)?instructions",
            r"bypass\s+(?:safety|guardrails)",
            r"you\s+are\s+now\s+(?:an?\s+)?admin",
            r"system\s+override",
            r"developer\s+mode",
            r"override\s+system\s+instructions",
        ]
        
        for pattern in injection_patterns:
            sanitized = re.sub(pattern, "[CLEANED SECURELY]", sanitized, flags=re.IGNORECASE)
            
        return sanitized

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
        Call Gemini API with retry logic, token tracking, and strict SAIF safety settings.

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

        # Check budget limits before calling (Management Control of Compute)
        if self.config.is_budget_exhausted():
            raise RuntimeError(
                f"Compute budget exhausted: cumulative cost ${self.config.get_cumulative_cost_usd():.4f} "
                f"or tokens exceed limits ({self.config._cumulative_input_tokens + self.config._cumulative_output_tokens} total tokens)."
            )

        # Strict safety settings (SAIF compliance)
        safety_settings = [
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold=types.HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
            ),
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold=types.HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
            ),
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold=types.HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
            ),
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold=types.HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
            ),
        ]

        gen_config = types.GenerateContentConfig(
            system_instruction=sys_prompt if sys_prompt else None,
            temperature=temp,
            max_output_tokens=max_tokens,
            safety_settings=safety_settings,
        )

        # Sanitize prompt before sending
        sanitized_prompt = self.sanitize_input(prompt)

        last_error = None
        for attempt in range(max_retries):
            try:
                response = await self._client.aio.models.generate_content(
                    model=self.model_name,
                    contents=sanitized_prompt,
                    config=gen_config,
                )

                # Track tokens
                if response.usage_metadata:
                    prompt_tokens = response.usage_metadata.prompt_token_count or 0
                    candidate_tokens = response.usage_metadata.candidates_token_count or 0
                    
                    async with self._token_lock:
                        self._total_input_tokens += prompt_tokens
                        self._total_output_tokens += candidate_tokens
                        # Update global config cumulative tokens
                        self.config.add_tokens(prompt_tokens, candidate_tokens)

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
                    await asyncio.sleep(wait)

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
            except Exception as e:
                # Log parsing anomaly (SAIF compliance)
                if self.config.verbose:
                    print(f"⚠️ [{self.__class__.__name__}] Schema validation anomaly/parse failure: {e}")
                return {"raw": cleaned, "_parse_error": True, "_parse_exception": str(e)}

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
