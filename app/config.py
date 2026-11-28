"""
Centralized configuration for the PPE Safety Monitoring System.

All thresholds, paths, colors, and UI constants are defined here.
Detection logic parameters are preserved from the validated prototype.
"""

from pathlib import Path
import os
import sys


# ── Project Paths ──────────────────────────────────────────────────

PROJECT_DIR = Path(__file__).resolve().parent.parent


# ── Model Path Resolution ─────────────────────────────────────────

def _resolve_model_path(env_var: str, local_name: str, fallback_path: str) -> Path:
    """
    Resolve model path using a fallback chain:
    1. Environment variable override
    2. models/ subdirectory in project
    3. Project root
    4. Original absolute path from prototype
    """
    env_path = os.environ.get(env_var)
    if env_path and Path(env_path).exists():
        return Path(env_path)

    local = PROJECT_DIR / "models" / local_name
    if local.exists():
        return local

    root_model = PROJECT_DIR / local_name
    if root_model.exists():
        return root_model

    fallback = Path(fallback_path)
    if fallback.exists():
        return fallback

    # Return the fallback anyway — will produce a clear error at load time
    return fallback


PPE_MODEL_PATH = _resolve_model_path(
    "PPE_MODEL_PATH",
    "ppe_best.pt",
    r"C:\Users\arpit\runs\detect\runs\detect\final_ppe_yolo11n\weights\best.pt"
)

FIRE_SMOKE_MODEL_PATH = _resolve_model_path(
    "FIRE_SMOKE_MODEL_PATH",
    "fire_smoke_best.pt",
    r"C:\Users\arpit\OneDrive\Desktop\PRO_file\Training\best.pt"
)


# ── Detection Thresholds ──────────────────────────────────────────
# Preserved from the working prototype

PPE_CONFIDENCE = 0.30
PPE_IMAGE_SIZE = 640
PPE_IOU_THRESHOLD = 0.45

FIRE_CONFIDENCE = 0.55
FIRE_IMAGE_SIZE = 640


# ── PPE Spatial Association ───────────────────────────────────────
# Region percentages relative to person bounding box height

UPPER_BODY_START = 0.20    # Vest region top
UPPER_BODY_END = 0.65      # Vest region bottom
LOWER_BODY_START = 0.45    # Boots region top
MIN_PERSON_HEIGHT_BOOTS = 180   # px — skip boot inference for small persons
HEAD_IOU_THRESHOLD = 0.30       # Helmet / no-helmet NMS overlap threshold


# ── Colors (BGR for OpenCV) ───────────────────────────────────────

class Colors:
    """OpenCV drawing colors in BGR format."""

    PERSON = (200, 200, 60)
    HELMET = (80, 200, 80)
    NO_HELMET = (50, 60, 210)
    VEST = (60, 175, 240)
    NO_VEST = (50, 60, 210)
    BOOTS = (210, 100, 180)
    NO_BOOTS = (50, 60, 210)
    FIRE = (30, 30, 230)
    SMOKE = (150, 150, 150)

    SAFE = (80, 200, 80)
    WARNING = (30, 175, 230)
    DANGER = (30, 30, 230)

    LABEL_BG = (18, 18, 18)
    PANEL_BG = (12, 12, 12)

    BY_LABEL = {
        "person": PERSON,
        "helmet": HELMET,
        "no_helmet": NO_HELMET,
        "vest": VEST,
        "boots": BOOTS,
    }


# ── UI Theme (Hex RGB for tkinter) ────────────────────────────────

class Theme:
    """Industrial dark theme for the monitoring interface."""

    BG_PRIMARY = "#181b20"
    BG_SECONDARY = "#1e2228"
    BG_TERTIARY = "#262b33"
    BG_WIDGET = "#2e343d"
    BG_HOVER = "#353c47"

    BORDER = "#333a44"
    BORDER_LIGHT = "#434b57"

    TEXT_PRIMARY = "#dfe1e5"
    TEXT_SECONDARY = "#8b919a"
    TEXT_MUTED = "#555b65"

    ACCENT = "#4a8fd4"
    ACCENT_HOVER = "#5a9fe4"

    SAFE = "#2d9e50"
    SAFE_BG = "#152a1c"
    SAFE_TEXT = "#5fcc7f"
    WARNING = "#d4a017"
    WARNING_BG = "#2a2410"
    WARNING_TEXT = "#ecc040"
    DANGER = "#d43b2f"
    DANGER_BG = "#2a1310"
    DANGER_TEXT = "#f06055"

    STANDBY = "#6b7280"
    STANDBY_BG = "#1e2228"

    FONT = "Segoe UI"
    FONT_MONO = "Consolas"


# ── Event System ─────────────────────────────────────────────────

MAX_EVENTS_DISPLAY = 100



# ── Video Settings ────────────────────────────────────────────────

WEBCAM_INDEX = 0
WEBCAM_WARMUP_SECONDS = 1.5

# On Windows, MSMF is the default and usually most reliable backend.
# Set to None for auto-detection on other platforms.
if sys.platform == "win32":
    import cv2
    WEBCAM_BACKEND = cv2.CAP_MSMF
else:
    WEBCAM_BACKEND = None

UI_UPDATE_INTERVAL_MS = 40   # 25 FPS UI refresh — balances responsiveness and CPU


# ── Overlay Drawing ───────────────────────────────────────────────

OVERLAY_FONT_SCALE = 0.50
OVERLAY_THICKNESS = 2
OVERLAY_BBOX_THICKNESS = 2
OVERLAY_FIRE_THICKNESS = 3
LABEL_PADDING_X = 4
LABEL_PADDING_Y = 4


# ── Safety Priority (higher number = higher severity) ─────────────

SAFETY_PRIORITY = {
    "safe": 0,
    "ppe_violation": 1,
    "smoke": 2,
    "fire": 3,
}
