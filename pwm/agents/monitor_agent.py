"""
PWM Execution Monitor Agent — Layer 3: Watchdog
=================================================

Asynchronous watchdog that monitors pipeline events and detects stuck states.
"""

from __future__ import annotations

import asyncio
import time
from typing import Optional

from pwm.logging.event_logger import EventLogger, EventType


class ExecutionMonitorAgent:
    """
    Monitors the event logger for a specific run and raises alerts if it
    takes too long or enters a loop.
    """

    def __init__(self, run_id: str, event_logger: EventLogger, timeout_seconds: int = 300):
        self.run_id = run_id
        self.event_logger = event_logger
        self.timeout_seconds = timeout_seconds
        self._task: Optional[asyncio.Task] = None
        self._running = False

    async def _monitor_loop(self):
        """Background loop to monitor events."""
        start_time = time.monotonic()
        
        while self._running:
            now = time.monotonic()
            if now - start_time > self.timeout_seconds:
                await self.event_logger.log_error(
                    self.run_id, 
                    f"ExecutionMonitor: Pipeline run exceeded {self.timeout_seconds}s timeout."
                )
                break
                
            # Check for recent events
            events = self.event_logger.get_events(run_id=self.run_id, limit=10)
            
            # Check for pipeline end
            if any(e.event_type == EventType.PIPELINE_END for e in events):
                break
                
            # Detect tight loops (e.g., 5 critic verdicts in a row with no progress)
            verdicts = [e for e in events if e.event_type == EventType.CRITIC_VERDICT]
            if len(verdicts) >= 5:
                # Check timestamps to see if they are too rapid
                time_span = (verdicts[0].timestamp - verdicts[-1].timestamp).total_seconds()
                if time_span < 10:
                    await self.event_logger.log_error(
                        self.run_id,
                        "ExecutionMonitor: Detected rapid looping in Critic verdicts."
                    )
                    break
                    
            await asyncio.sleep(5)
            
    def start(self):
        """Start the monitor watchdog."""
        self._running = True
        self._task = asyncio.create_task(self._monitor_loop())
        
    def stop(self):
        """Stop the monitor watchdog."""
        self._running = False
        if self._task:
            self._task.cancel()
