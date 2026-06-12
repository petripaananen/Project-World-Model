"""
PWM Slack Ingestion — Layer 1: Observation & Ingestion
========================================================

Parses chat telemetry and developer sentiments from Slack export files (JSON format).
Provides metadata for Layer 2 simulation to locate organizational blockages.
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Union

from pwm.config import PWMConfig
from pwm.ingestion.models import SlackMessage, SlackState


class SlackIngestor:
    """Ingestor for parsing Slack channel exports and telemetry."""

    def __init__(self, config: PWMConfig):
        self.config = config

    def ingest_json(self, file_content: Union[str, bytes], channel_name: str = "general") -> SlackState:
        """
        Parse Slack channel export JSON content.

        Args:
            file_content: JSON string or bytes of Slack message array
            channel_name: Name of the channel the export belongs to

        Returns:
            SlackState representation of the chat history
        """
        if isinstance(file_content, bytes):
            file_content = file_content.decode("utf-8")

        try:
            data = json.loads(file_content)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON file format: {e}")

        if not isinstance(data, list):
            raise ValueError("Slack channel export must be a JSON array of message objects.")

        messages = []
        for msg in data:
            if msg.get("type") != "message" or "text" not in msg:
                continue

            text = msg["text"]
            user = msg.get("user") or msg.get("username") or "unknown_user"
            
            # Parse timestamp (ts is Slack epoch string, e.g. "1675200000.000000")
            ts_str = msg.get("ts", "0.0")
            try:
                timestamp = datetime.fromtimestamp(float(ts_str))
            except Exception:
                timestamp = datetime.now()

            # Rule-based developer sentiment tagger for FTUE and MVP
            sentiment = "neutral"
            lower_text = text.lower()
            if any(k in lower_text for k in ["fail", "error", "broken", "bug", "crash", "wrong", "broke"]):
                sentiment = "frustrated"
            elif any(k in lower_text for k in ["block", "waiting", "stuck", "hold", "cannot", "cant"]):
                sentiment = "blocked"
            elif any(k in lower_text for k in ["solved", "fixed", "merge", "ready", "work", "great", "thanks"]):
                sentiment = "positive"

            messages.append(
                SlackMessage(
                    user=user,
                    text=text,
                    timestamp=timestamp,
                    channel=channel_name,
                    sentiment=sentiment,
                    thread_ts=msg.get("thread_ts"),
                )
            )

        # Build SlackState
        state = SlackState(
            channels=[channel_name],
            recent_messages=messages,
        )
        state.compute_stats()
        return state

    def generate_mock_slack_state(self) -> SlackState:
        """Generate mock Slack telemetry data matching our default developer conflicts."""
        now = datetime.now()
        messages = [
            SlackMessage(
                user="alice",
                text="Has anyone reviewed ENG-201? The renderer is giving me black screens when launching instanced particles.",
                timestamp=now,
                channel="engine-dev",
                sentiment="frustrated"
            ),
            SlackMessage(
                user="bob",
                text="I'm refactoring the physics engine under ENG-198, but PR #12 is blocked because alice changed the renderer interface.",
                timestamp=now,
                channel="physics-team",
                sentiment="blocked"
            ),
            SlackMessage(
                user="charlie",
                text="Great job on the UI layout update! Looks super smooth.",
                timestamp=now,
                channel="ui-team",
                sentiment="positive"
            )
        ]
        
        state = SlackState(
            channels=["engine-dev", "physics-team", "ui-team"],
            recent_messages=messages,
        )
        state.compute_stats()
        return state
