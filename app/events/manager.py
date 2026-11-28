"""
Safety event management with state-transition logic and hysteresis.

Real industrial monitoring systems do NOT generate repeated events
for persistent hazards. They fire on:
    1. New hazard appearing
    2. Severity escalation
    3. Hazard resolved (after hysteresis to avoid flicker)

This module implements that pattern.
"""

import time
from dataclasses import dataclass
from typing import List, Optional, Set

from app.config import MAX_EVENTS_DISPLAY
from app.utils.logger import get_logger

log = get_logger("events")

# Number of consecutive SAFE evaluations required before declaring
# all-clear. At ~5-10 FPS inference, 20 frames ≈ 2-4 seconds.
# Prevents false "all clear" events from single-frame detection gaps.
SAFE_HYSTERESIS_FRAMES = 20


@dataclass
class SafetyEvent:
    """A single timestamped safety event."""

    timestamp: float          # time.time()
    time_str: str             # Formatted HH:MM:SS
    level: str                # "INFO", "WARNING", "DANGER"
    message: str              # Human-readable description
    icon: str = ""            # Text icon


class EventManager:
    """
    State-transition-based safety event manager.

    Events are generated ONLY on state changes:
    - Hazard appears → event
    - Hazard severity escalates → event
    - All hazards resolve (after hysteresis) → event

    Persistent hazards produce exactly ONE event, not periodic re-fires.
    This matches how real industrial alarm systems behave.
    """

    def __init__(self):
        self._events: List[SafetyEvent] = []
        self._last_status_level: Optional[str] = None
        self._active_hazards: Set[str] = set()
        self._safe_frame_count: int = 0
        self._last_event_count: int = 0  # For UI change detection

    @property
    def events(self) -> List[SafetyEvent]:
        """Return events list (newest first)."""
        return list(reversed(self._events[-MAX_EVENTS_DISPLAY:]))

    @property
    def event_count(self) -> int:
        return len(self._events)

    @property
    def changed_since_last_check(self) -> bool:
        """Check if new events have been added since last UI read."""
        current = len(self._events)
        if current != self._last_event_count:
            self._last_event_count = current
            return True
        return False

    def update_from_status(
        self,
        level: str,
        detail: str,
        icon: str = "",
    ):
        """
        Generate events based on safety status transitions.

        Uses hysteresis: requires SAFE_HYSTERESIS_FRAMES consecutive
        SAFE frames before declaring all-clear. This prevents false
        "cleared" events from momentary detection gaps.
        """
        if level == "SAFE":
            self._safe_frame_count += 1

            # Only declare all-clear after sustained safe period
            if (
                self._safe_frame_count >= SAFE_HYSTERESIS_FRAMES
                and self._active_hazards
            ):
                self._active_hazards.clear()
                self._last_status_level = "SAFE"
                self._add_event("INFO", "All hazards cleared", "✓")
            return

        # Non-SAFE status: reset safe counter
        self._safe_frame_count = 0
        hazard_key = detail

        # New hazard type appearing
        if hazard_key not in self._active_hazards:
            self._active_hazards.add(hazard_key)
            self._add_event(level, detail, icon)

        # Severity escalation (WARNING → DANGER)
        elif (
            self._last_status_level
            and level == "DANGER"
            and self._last_status_level != "DANGER"
        ):
            self._add_event(level, detail, icon)

        self._last_status_level = level

    def add_system_event(self, message: str):
        """Add a system-level informational event."""
        self._add_event("INFO", message, "●")

    def _add_event(self, level: str, message: str, icon: str):
        """Create and store an event."""
        now = time.time()
        time_str = time.strftime("%H:%M:%S", time.localtime(now))

        event = SafetyEvent(
            timestamp=now,
            time_str=time_str,
            level=level,
            message=message,
            icon=icon,
        )

        self._events.append(event)
        log.info("Event [%s] %s: %s", time_str, level, message)

        # Trim old events
        if len(self._events) > MAX_EVENTS_DISPLAY * 2:
            self._events = self._events[-MAX_EVENTS_DISPLAY:]

    def clear(self):
        """Clear all events and reset state."""
        self._events.clear()
        self._active_hazards.clear()
        self._last_status_level = None
        self._safe_frame_count = 0
        self._last_event_count = 0
