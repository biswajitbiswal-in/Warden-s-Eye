"""
Safety status engine.

Centralized safety evaluation with clear priority rules.
Takes PPE results and fire/smoke results, produces a single
safety status with severity level and human-readable message.

Priority (highest to lowest):
    FIRE       → DANGER
    SMOKE      → WARNING
    NO HELMET  → WARNING
    NO VEST    → WARNING
    NO BOOTS   → WARNING
    otherwise  → SAFE
"""

from dataclasses import dataclass
from typing import Any, Dict

from app.config import Theme


@dataclass(frozen=True)
class SafetyStatus:
    """Immutable safety status snapshot."""

    level: str          # "SAFE", "WARNING", "DANGER"
    message: str        # Human-readable description
    detail: str         # Short detail for the event log
    color: str          # Hex color for UI
    bg_color: str       # Background tint for UI
    text_color: str     # Text color for UI
    icon: str           # Text icon prefix


# Pre-built status constants
STATUS_SAFE = SafetyStatus(
    level="SAFE",
    message="No active hazards detected",
    detail="All clear",
    color=Theme.SAFE,
    bg_color=Theme.SAFE_BG,
    text_color=Theme.SAFE_TEXT,
    icon="✓",
)

STATUS_STANDBY = SafetyStatus(
    level="STANDBY",
    message="System ready — select a source to begin",
    detail="Standby",
    color=Theme.STANDBY,
    bg_color=Theme.STANDBY_BG,
    text_color=Theme.TEXT_SECONDARY,
    icon="—",
)


class SafetyEngine:
    """
    Evaluates overall safety status from detection results.

    Uses the same priority logic as the validated prototype:
    fire > smoke > no_helmet > no_vest > no_boots > safe
    """

    def evaluate(
        self,
        ppe_results: Dict[str, Any],
        fire_results: Dict[str, Any],
    ) -> SafetyStatus:
        """
        Compute current safety status from detection results.

        Returns a SafetyStatus with level, message, and colors.
        """
        fire_detected = fire_results.get("fire_detected", False)
        smoke_detected = fire_results.get("smoke_detected", False)
        no_helmet = ppe_results.get("no_helmet_count", 0)
        no_vest = ppe_results.get("no_vest_count", 0)
        no_boots = ppe_results.get("no_boots_count", 0)

        # Priority: fire > smoke > helmet > vest > boots
        if fire_detected:
            return SafetyStatus(
                level="DANGER",
                message="Fire detected — evacuate area",
                detail="Fire detected",
                color=Theme.DANGER,
                bg_color=Theme.DANGER_BG,
                text_color=Theme.DANGER_TEXT,
                icon="!!",
            )

        if smoke_detected:
            return SafetyStatus(
                level="WARNING",
                message="Smoke detected — investigate immediately",
                detail="Smoke detected",
                color=Theme.WARNING,
                bg_color=Theme.WARNING_BG,
                text_color=Theme.WARNING_TEXT,
                icon="!",
            )

        if no_helmet > 0:
            count_str = f"{no_helmet} worker{'s' if no_helmet > 1 else ''}"
            return SafetyStatus(
                level="WARNING",
                message=f"Helmet violation — {count_str} without helmet",
                detail="Helmet violation",
                color=Theme.WARNING,
                bg_color=Theme.WARNING_BG,
                text_color=Theme.WARNING_TEXT,
                icon="!",
            )

        if no_vest > 0:
            count_str = f"{no_vest} worker{'s' if no_vest > 1 else ''}"
            return SafetyStatus(
                level="WARNING",
                message=f"Vest not detected — {count_str}",
                detail="Vest not detected",
                color=Theme.WARNING,
                bg_color=Theme.WARNING_BG,
                text_color=Theme.WARNING_TEXT,
                icon="!",
            )

        if no_boots > 0:
            count_str = f"{no_boots} worker{'s' if no_boots > 1 else ''}"
            return SafetyStatus(
                level="WARNING",
                message=f"Boots check required — {count_str}",
                detail="Boots check required",
                color=Theme.WARNING,
                bg_color=Theme.WARNING_BG,
                text_color=Theme.WARNING_TEXT,
                icon="!",
            )

        return STATUS_SAFE
