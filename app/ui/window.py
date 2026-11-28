"""
Main application window for the PPE Safety Monitoring System.

Professional industrial monitoring interface built with tkinter.
Orchestrates video capture, detection, and real-time display.

Layout:
    ┌────────────────────────────────────────────────────────────┐
    │ HEADER: Title, system status, clock                        │
    ├──────────────────────────────────┬─────────────────────────┤
    │                                  │ Safety Status            │
    │                                  │ Live Metrics             │
    │        VIDEO FEED                │ PPE Compliance           │
    │                                  │ Source Controls          │
    │                                  │ Settings                 │
    ├──────────────────────────────────┤                         │
    │        EVENT LOG                 │                         │
    └──────────────────────────────────┴─────────────────────────┘

Threading model:
    - Main thread: tkinter event loop + UI updates
    - Detection thread: frame capture + model inference
    - Model loading thread: one-time startup
"""

import tkinter as tk
from tkinter import filedialog
import threading
import time
import cv2
from PIL import Image, ImageTk
from typing import Optional, Dict, Any

from app.config import Theme, UI_UPDATE_INTERVAL_MS
from app.detection.ppe_detector import PPEDetector, EMPTY_PPE_RESULT
from app.detection.fire_detector import FireSmokeDetector, EMPTY_FIRE_RESULT
from app.safety.engine import SafetyEngine, SafetyStatus, STATUS_STANDBY, STATUS_SAFE
from app.events.manager import EventManager
from app.video.source import VideoSource
from app.ui.overlay import OverlayRenderer
from app.utils.logger import setup_logging, get_logger

log = get_logger("ui")


class MainWindow:
    """
    Professional industrial safety monitoring interface.

    Manages the full application lifecycle: model loading,
    video capture, detection, display, and shutdown.
    """

    # ── Constants ──────────────────────────────────────────

    RIGHT_PANEL_WIDTH = 310
    MIN_VIDEO_WIDTH = 560
    MIN_VIDEO_HEIGHT = 400
    EVENT_LOG_HEIGHT = 150

    def __init__(self):
        setup_logging()
        log.info("Initializing PPE Safety Monitoring System")

        # ── Core components ────────────────────────────────
        self.ppe_detector = PPEDetector()
        self.fire_detector = FireSmokeDetector()
        self.safety_engine = SafetyEngine()
        self.event_manager = EventManager()
        self.video_source = VideoSource()
        self.overlay_renderer = OverlayRenderer()

        # ── State ──────────────────────────────────────────
        self.models_loaded = False
        self.ppe_model_ok = False
        self.fire_model_ok = False
        self.is_detecting = False
        self.is_paused = False
        self._stop_event = threading.Event()
        self._detection_thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()
        self._needs_cleanup = False  # Signal for main thread to do UI cleanup

        # Shared detection state (protected by _lock)
        self._current_frame = None
        self._current_ppe_results: Dict[str, Any] = {}
        self._current_fire_results: Dict[str, Any] = {}
        self._current_status: SafetyStatus = STATUS_STANDBY
        self._display_fps: float = 0.0
        self._frame_seq: int = 0           # Incremented per new frame
        self._last_displayed_seq: int = -1  # Track which frame was last rendered

        # ── Build UI ───────────────────────────────────────
        self.root = tk.Tk()
        self.root.title("PPE Safety Monitoring — Industrial Safety Platform")
        self.root.configure(bg=Theme.BG_PRIMARY)
        self.root.geometry("1280x820")
        self.root.minsize(1060, 720)

        self._create_ui()

        # ── Start model loading ────────────────────────────
        threading.Thread(
            target=self._load_models, daemon=True
        ).start()

        # ── Start UI update loop ───────────────────────────
        self._schedule_ui_update()

    # ══════════════════════════════════════════════════════
    # UI CONSTRUCTION
    # ══════════════════════════════════════════════════════

    def _create_ui(self):
        """Build the complete interface."""
        self._create_header()
        self._create_body()

    def _create_header(self):
        """Top bar with application identity and system status."""
        header = tk.Frame(
            self.root, bg=Theme.BG_SECONDARY,
            highlightbackground=Theme.BORDER,
            highlightthickness=1,
        )
        header.pack(fill=tk.X, padx=0, pady=0)

        inner = tk.Frame(header, bg=Theme.BG_SECONDARY)
        inner.pack(fill=tk.X, padx=16, pady=10)

        # Left: title
        title_frame = tk.Frame(inner, bg=Theme.BG_SECONDARY)
        title_frame.pack(side=tk.LEFT)

        tk.Label(
            title_frame,
            text="PPE SAFETY MONITORING",
            font=(Theme.FONT, 14, "bold"),
            fg=Theme.TEXT_PRIMARY,
            bg=Theme.BG_SECONDARY,
        ).pack(side=tk.LEFT)

        tk.Label(
            title_frame,
            text="   AI-ASSISTED INDUSTRIAL SAFETY",
            font=(Theme.FONT, 9),
            fg=Theme.TEXT_MUTED,
            bg=Theme.BG_SECONDARY,
        ).pack(side=tk.LEFT, padx=(8, 0))

        # Right: status indicators
        right_frame = tk.Frame(inner, bg=Theme.BG_SECONDARY)
        right_frame.pack(side=tk.RIGHT)

        self._header_fps = tk.Label(
            right_frame,
            text="FPS —",
            font=(Theme.FONT_MONO, 9),
            fg=Theme.TEXT_SECONDARY,
            bg=Theme.BG_SECONDARY,
        )
        self._header_fps.pack(side=tk.RIGHT, padx=(12, 0))

        self._header_clock = tk.Label(
            right_frame,
            text="--:--:--",
            font=(Theme.FONT_MONO, 9),
            fg=Theme.TEXT_SECONDARY,
            bg=Theme.BG_SECONDARY,
        )
        self._header_clock.pack(side=tk.RIGHT, padx=(12, 0))

        self._header_model_status = tk.Label(
            right_frame,
            text="● LOADING MODELS",
            font=(Theme.FONT, 9),
            fg=Theme.WARNING,
            bg=Theme.BG_SECONDARY,
        )
        self._header_model_status.pack(side=tk.RIGHT, padx=(12, 0))

        self._header_source = tk.Label(
            right_frame,
            text="SOURCE: —",
            font=(Theme.FONT, 9),
            fg=Theme.TEXT_MUTED,
            bg=Theme.BG_SECONDARY,
        )
        self._header_source.pack(side=tk.RIGHT)

    def _create_body(self):
        """Main content area with video feed and side panels."""
        body = tk.Frame(self.root, bg=Theme.BG_PRIMARY)
        body.pack(fill=tk.BOTH, expand=True, padx=8, pady=(6, 8))

        # Left panel: video + events
        left = tk.Frame(body, bg=Theme.BG_PRIMARY)
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 6))

        self._create_video_panel(left)
        self._create_event_panel(left)

        # Right panel: status + controls
        right = tk.Frame(
            body, bg=Theme.BG_SECONDARY, width=self.RIGHT_PANEL_WIDTH,
            highlightbackground=Theme.BORDER,
            highlightthickness=1,
        )
        right.pack(side=tk.RIGHT, fill=tk.Y, padx=(0, 0))
        right.pack_propagate(False)

        # Scrollable right panel content
        self._right_inner = tk.Frame(right, bg=Theme.BG_SECONDARY)
        self._right_inner.pack(fill=tk.BOTH, expand=True, padx=1, pady=1)

        self._create_safety_panel(self._right_inner)
        self._create_metrics_panel(self._right_inner)
        self._create_compliance_panel(self._right_inner)
        self._create_source_controls(self._right_inner)
        self._create_settings_panel(self._right_inner)
        self._create_about_panel(self._right_inner)

    # ── Video Panel ────────────────────────────────────────

    def _create_video_panel(self, parent):
        """Video feed display with border."""
        frame = tk.Frame(
            parent, bg=Theme.BG_TERTIARY,
            highlightbackground=Theme.BORDER,
            highlightthickness=1,
        )
        frame.pack(fill=tk.BOTH, expand=True, pady=(0, 6))

        self._video_label = tk.Label(
            frame, bg=Theme.BG_TERTIARY,
            text="NO FEED",
            font=(Theme.FONT, 16),
            fg=Theme.TEXT_MUTED,
            compound=tk.CENTER,
        )
        self._video_label.pack(fill=tk.BOTH, expand=True)

    # ── Event Log ──────────────────────────────────────────

    def _create_event_panel(self, parent):
        """Timestamped safety event stream."""
        frame = tk.Frame(
            parent, bg=Theme.BG_SECONDARY,
            highlightbackground=Theme.BORDER,
            highlightthickness=1,
            height=self.EVENT_LOG_HEIGHT,
        )
        frame.pack(fill=tk.X, pady=(0, 0))
        frame.pack_propagate(False)

        header = tk.Frame(frame, bg=Theme.BG_SECONDARY)
        header.pack(fill=tk.X, padx=12, pady=(8, 4))

        tk.Label(
            header,
            text="EVENTS",
            font=(Theme.FONT, 9, "bold"),
            fg=Theme.TEXT_MUTED,
            bg=Theme.BG_SECONDARY,
        ).pack(side=tk.LEFT)

        self._event_count_label = tk.Label(
            header,
            text="",
            font=(Theme.FONT, 8),
            fg=Theme.TEXT_MUTED,
            bg=Theme.BG_SECONDARY,
        )
        self._event_count_label.pack(side=tk.RIGHT)

        self._event_text = tk.Text(
            frame,
            bg=Theme.BG_TERTIARY,
            fg=Theme.TEXT_SECONDARY,
            font=(Theme.FONT_MONO, 9),
            wrap=tk.WORD,
            state=tk.DISABLED,
            borderwidth=0,
            highlightthickness=0,
            padx=10,
            pady=6,
            cursor="arrow",
        )
        self._event_text.pack(fill=tk.BOTH, expand=True, padx=8, pady=(0, 8))

        # Tag colors for event severity
        self._event_text.tag_config("info", foreground=Theme.TEXT_SECONDARY)
        self._event_text.tag_config("warning", foreground=Theme.WARNING_TEXT)
        self._event_text.tag_config("danger", foreground=Theme.DANGER_TEXT)
        self._event_text.tag_config("time", foreground=Theme.TEXT_MUTED)

    # ── Safety Status Panel ────────────────────────────────

    def _create_safety_panel(self, parent):
        """Large safety status indicator."""
        self._safety_frame = tk.Frame(
            parent, bg=Theme.STANDBY_BG,
            highlightbackground=Theme.BORDER,
            highlightthickness=1,
        )
        self._safety_frame.pack(fill=tk.X, padx=8, pady=(8, 4))

        inner = tk.Frame(self._safety_frame, bg=Theme.STANDBY_BG)
        inner.pack(fill=tk.X, padx=14, pady=12)
        self._safety_inner = inner

        self._safety_icon = tk.Label(
            inner,
            text="—",
            font=(Theme.FONT, 20, "bold"),
            fg=Theme.TEXT_MUTED,
            bg=Theme.STANDBY_BG,
        )
        self._safety_icon.pack(anchor=tk.W)

        self._safety_level = tk.Label(
            inner,
            text="STANDBY",
            font=(Theme.FONT, 18, "bold"),
            fg=Theme.TEXT_MUTED,
            bg=Theme.STANDBY_BG,
        )
        self._safety_level.pack(anchor=tk.W, pady=(0, 2))

        self._safety_message = tk.Label(
            inner,
            text="System ready — select a source to begin",
            font=(Theme.FONT, 9),
            fg=Theme.TEXT_SECONDARY,
            bg=Theme.STANDBY_BG,
            wraplength=260,
            justify=tk.LEFT,
        )
        self._safety_message.pack(anchor=tk.W)

    # ── Live Metrics Panel ─────────────────────────────────

    def _create_metrics_panel(self, parent):
        """Real-time detection metrics."""
        frame = tk.Frame(parent, bg=Theme.BG_SECONDARY)
        frame.pack(fill=tk.X, padx=8, pady=(8, 4))

        tk.Label(
            frame,
            text="LIVE METRICS",
            font=(Theme.FONT, 9, "bold"),
            fg=Theme.TEXT_MUTED,
            bg=Theme.BG_SECONDARY,
        ).pack(anchor=tk.W, padx=8, pady=(0, 6))

        metrics_frame = tk.Frame(
            frame, bg=Theme.BG_TERTIARY,
            highlightbackground=Theme.BORDER,
            highlightthickness=1,
        )
        metrics_frame.pack(fill=tk.X, padx=4)

        self._metric_labels = {}
        metrics_data = [
            ("Workers", "—"),
            ("PPE Violations", "—"),
            ("Fire", "—"),
            ("Smoke", "—"),
        ]

        for i, (name, default) in enumerate(metrics_data):
            row = tk.Frame(metrics_frame, bg=Theme.BG_TERTIARY)
            row.pack(fill=tk.X, padx=10, pady=(6 if i == 0 else 2, 6 if i == len(metrics_data) - 1 else 2))

            tk.Label(
                row, text=name,
                font=(Theme.FONT, 10),
                fg=Theme.TEXT_SECONDARY,
                bg=Theme.BG_TERTIARY,
                anchor=tk.W,
            ).pack(side=tk.LEFT)

            val_label = tk.Label(
                row, text=default,
                font=(Theme.FONT_MONO, 10, "bold"),
                fg=Theme.TEXT_PRIMARY,
                bg=Theme.BG_TERTIARY,
                anchor=tk.E,
            )
            val_label.pack(side=tk.RIGHT)

            self._metric_labels[name] = val_label

    # ── PPE Compliance Panel ───────────────────────────────

    def _create_compliance_panel(self, parent):
        """Per-PPE-category compliance status."""
        frame = tk.Frame(parent, bg=Theme.BG_SECONDARY)
        frame.pack(fill=tk.X, padx=8, pady=(8, 4))

        tk.Label(
            frame,
            text="PPE COMPLIANCE",
            font=(Theme.FONT, 9, "bold"),
            fg=Theme.TEXT_MUTED,
            bg=Theme.BG_SECONDARY,
        ).pack(anchor=tk.W, padx=8, pady=(0, 6))

        compliance_frame = tk.Frame(
            frame, bg=Theme.BG_TERTIARY,
            highlightbackground=Theme.BORDER,
            highlightthickness=1,
        )
        compliance_frame.pack(fill=tk.X, padx=4)

        self._compliance_labels = {}
        items = ["Helmet", "Vest", "Boots"]

        for i, name in enumerate(items):
            row = tk.Frame(compliance_frame, bg=Theme.BG_TERTIARY)
            row.pack(fill=tk.X, padx=10, pady=(6 if i == 0 else 2, 6 if i == len(items) - 1 else 2))

            tk.Label(
                row, text=name,
                font=(Theme.FONT, 10),
                fg=Theme.TEXT_SECONDARY,
                bg=Theme.BG_TERTIARY,
            ).pack(side=tk.LEFT)

            status = tk.Label(
                row, text="—",
                font=(Theme.FONT, 9),
                fg=Theme.TEXT_MUTED,
                bg=Theme.BG_TERTIARY,
            )
            status.pack(side=tk.RIGHT)

            self._compliance_labels[name] = status

    # ── Source Controls ────────────────────────────────────

    def _create_source_controls(self, parent):
        """Camera and video source selection buttons."""
        frame = tk.Frame(parent, bg=Theme.BG_SECONDARY)
        frame.pack(fill=tk.X, padx=8, pady=(10, 4))

        tk.Label(
            frame,
            text="SOURCE",
            font=(Theme.FONT, 9, "bold"),
            fg=Theme.TEXT_MUTED,
            bg=Theme.BG_SECONDARY,
        ).pack(anchor=tk.W, padx=8, pady=(0, 6))

        btn_frame = tk.Frame(frame, bg=Theme.BG_SECONDARY)
        btn_frame.pack(fill=tk.X, padx=4)

        # Source buttons row
        row1 = tk.Frame(btn_frame, bg=Theme.BG_SECONDARY)
        row1.pack(fill=tk.X, pady=(0, 4))

        self._btn_webcam = self._make_button(
            row1, "▶  Webcam", self._start_webcam
        )
        self._btn_webcam.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 3))

        self._btn_video = self._make_button(
            row1, "▶  Video File", self._start_video
        )
        self._btn_video.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(3, 0))

        # Control buttons row
        row2 = tk.Frame(btn_frame, bg=Theme.BG_SECONDARY)
        row2.pack(fill=tk.X, pady=(0, 4))

        self._btn_pause = self._make_button(
            row2, "⏸  Pause", self._toggle_pause
        )
        self._btn_pause.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 3))
        self._btn_pause.configure(state=tk.DISABLED)

        self._btn_stop = self._make_button(
            row2, "⏹  Stop", self._stop_detection
        )
        self._btn_stop.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(3, 0))
        self._btn_stop.configure(state=tk.DISABLED)

    # ── Settings Panel ─────────────────────────────────────

    def _create_settings_panel(self, parent):
        """Detection confidence and overlay settings."""
        frame = tk.Frame(parent, bg=Theme.BG_SECONDARY)
        frame.pack(fill=tk.X, padx=8, pady=(10, 4))

        tk.Label(
            frame,
            text="SETTINGS",
            font=(Theme.FONT, 9, "bold"),
            fg=Theme.TEXT_MUTED,
            bg=Theme.BG_SECONDARY,
        ).pack(anchor=tk.W, padx=8, pady=(0, 6))

        settings_inner = tk.Frame(
            frame, bg=Theme.BG_TERTIARY,
            highlightbackground=Theme.BORDER,
            highlightthickness=1,
        )
        settings_inner.pack(fill=tk.X, padx=4)

        # PPE Confidence slider
        self._create_slider(
            settings_inner, "PPE Confidence",
            0.10, 0.80, self.ppe_detector.confidence,
            self._on_ppe_conf_change,
        )

        # Fire Confidence slider
        self._create_slider(
            settings_inner, "Fire Confidence",
            0.20, 0.90, self.fire_detector.confidence,
            self._on_fire_conf_change,
        )

        # Overlay toggle
        overlay_row = tk.Frame(settings_inner, bg=Theme.BG_TERTIARY)
        overlay_row.pack(fill=tk.X, padx=10, pady=(4, 8))

        tk.Label(
            overlay_row,
            text="Show Overlays",
            font=(Theme.FONT, 9),
            fg=Theme.TEXT_SECONDARY,
            bg=Theme.BG_TERTIARY,
        ).pack(side=tk.LEFT)

        self._overlay_var = tk.BooleanVar(value=True)
        cb = tk.Checkbutton(
            overlay_row,
            variable=self._overlay_var,
            command=self._on_overlay_toggle,
            bg=Theme.BG_TERTIARY,
            fg=Theme.TEXT_PRIMARY,
            selectcolor=Theme.BG_WIDGET,
            activebackground=Theme.BG_TERTIARY,
            activeforeground=Theme.TEXT_PRIMARY,
            highlightthickness=0,
            borderwidth=0,
        )
        cb.pack(side=tk.RIGHT)

    def _create_slider(self, parent, label, min_val, max_val, default, callback):
        """Create a labeled slider control."""
        row = tk.Frame(parent, bg=Theme.BG_TERTIARY)
        row.pack(fill=tk.X, padx=10, pady=(6, 2))

        tk.Label(
            row, text=label,
            font=(Theme.FONT, 9),
            fg=Theme.TEXT_SECONDARY,
            bg=Theme.BG_TERTIARY,
        ).pack(side=tk.LEFT)

        val_label = tk.Label(
            row, text=f"{default:.2f}",
            font=(Theme.FONT_MONO, 9),
            fg=Theme.TEXT_PRIMARY,
            bg=Theme.BG_TERTIARY,
            width=5,
        )
        val_label.pack(side=tk.RIGHT)

        slider = tk.Scale(
            parent,
            from_=min_val, to=max_val,
            resolution=0.05,
            orient=tk.HORIZONTAL,
            showvalue=False,
            bg=Theme.BG_TERTIARY,
            fg=Theme.TEXT_PRIMARY,
            troughcolor=Theme.BG_WIDGET,
            highlightthickness=0,
            borderwidth=0,
            sliderrelief=tk.FLAT,
            length=200,
            command=lambda v, cb=callback, vl=val_label: self._slider_changed(v, cb, vl),
        )
        slider.set(default)
        slider.pack(fill=tk.X, padx=10, pady=(0, 4))

    @staticmethod
    def _slider_changed(value, callback, val_label):
        val = float(value)
        val_label.configure(text=f"{val:.2f}")
        callback(val)

    # ── About Panel ────────────────────────────────────────

    def _create_about_panel(self, parent):
        """System information."""
        frame = tk.Frame(parent, bg=Theme.BG_SECONDARY)
        frame.pack(fill=tk.X, side=tk.BOTTOM, padx=8, pady=(8, 8))

        sep = tk.Frame(frame, bg=Theme.BORDER, height=1)
        sep.pack(fill=tk.X, padx=8, pady=(0, 8))

        info_lines = [
            "PPE Safety Monitoring System v1.0",
            "YOLO11n PPE + Fire/Smoke Models",
            "Q = Quit  |  P = Pause/Resume",
        ]

        for line in info_lines:
            tk.Label(
                frame, text=line,
                font=(Theme.FONT, 8),
                fg=Theme.TEXT_MUTED,
                bg=Theme.BG_SECONDARY,
            ).pack(anchor=tk.W, padx=8)

    # ── Button Factory ─────────────────────────────────────

    def _make_button(self, parent, text, command):
        """Create a styled button matching the industrial theme."""
        btn = tk.Button(
            parent,
            text=text,
            command=command,
            font=(Theme.FONT, 9),
            fg=Theme.TEXT_PRIMARY,
            bg=Theme.BG_WIDGET,
            activebackground=Theme.BG_HOVER,
            activeforeground=Theme.TEXT_PRIMARY,
            relief=tk.FLAT,
            borderwidth=0,
            padx=12,
            pady=6,
            cursor="hand2",
        )
        btn.bind("<Enter>", lambda e, b=btn: b.configure(bg=Theme.BG_HOVER))
        btn.bind("<Leave>", lambda e, b=btn: b.configure(bg=Theme.BG_WIDGET))
        return btn

    # ══════════════════════════════════════════════════════
    # MODEL LOADING
    # ══════════════════════════════════════════════════════

    def _load_models(self):
        """Load both detection models in a background thread."""
        log.info("Starting model loading...")

        self.ppe_model_ok = self.ppe_detector.load()
        self.fire_model_ok = self.fire_detector.load()
        self.models_loaded = True

        if self.ppe_model_ok and self.fire_model_ok:
            log.info("All models loaded successfully.")
            self.event_manager.add_system_event("Models loaded — system ready")
        elif self.ppe_model_ok:
            log.warning("Fire/smoke model failed to load.")
            self.event_manager.add_system_event("PPE model loaded (fire/smoke unavailable)")
        elif self.fire_model_ok:
            log.warning("PPE model failed to load.")
            self.event_manager.add_system_event("Fire/smoke model loaded (PPE unavailable)")
        else:
            log.error("Both models failed to load.")
            self.event_manager.add_system_event("Model loading failed — check paths")

    # ══════════════════════════════════════════════════════
    # SOURCE CONTROL
    # ══════════════════════════════════════════════════════

    def _start_webcam(self):
        """Open webcam and begin detection."""
        if not self.models_loaded:
            self.event_manager.add_system_event("Models still loading — please wait")
            return

        if self.is_detecting:
            self._stop_detection()

        self.event_manager.add_system_event("Opening webcam...")

        # Open webcam in a thread to avoid blocking UI
        def _open():
            success = self.video_source.open_webcam()
            if success:
                self._begin_detection()
                self.event_manager.add_system_event(
                    f"Webcam active — {self.video_source.source_name}"
                )
            else:
                self.event_manager.add_system_event(
                    "Camera unavailable — check connection"
                )

        threading.Thread(target=_open, daemon=True).start()

    def _start_video(self):
        """Open a video file and begin detection."""
        if not self.models_loaded:
            self.event_manager.add_system_event("Models still loading — please wait")
            return

        path = filedialog.askopenfilename(
            title="Select Video File",
            filetypes=[
                ("Video Files", "*.mp4 *.avi *.mov *.mkv *.wmv"),
                ("All Files", "*.*"),
            ],
        )

        if not path:
            return

        if self.is_detecting:
            self._stop_detection()

        self.event_manager.add_system_event(f"Opening video: {path.split('/')[-1]}")

        success = self.video_source.open_file(path)
        if success:
            self._begin_detection()
            self.event_manager.add_system_event(
                f"Video active — {self.video_source.source_name}"
            )
        else:
            self.event_manager.add_system_event(
                "Could not open video file"
            )

    def _begin_detection(self):
        """Start the detection thread."""
        self._stop_event.clear()
        self.is_detecting = True
        self.is_paused = False

        self._btn_pause.configure(state=tk.NORMAL, text="⏸  Pause")
        self._btn_stop.configure(state=tk.NORMAL)

        self._detection_thread = threading.Thread(
            target=self._detection_loop, daemon=True
        )
        self._detection_thread.start()

    def _stop_detection(self):
        """Stop detection and release the video source."""
        self._stop_event.set()
        self.is_detecting = False
        self.is_paused = False

        if self._detection_thread and self._detection_thread.is_alive():
            self._detection_thread.join(timeout=3.0)

        self.video_source.release()

        self._btn_pause.configure(state=tk.DISABLED, text="⏸  Pause")
        self._btn_stop.configure(state=tk.DISABLED)

        with self._lock:
            self._current_frame = None
            self._current_status = STATUS_STANDBY
            self._display_fps = 0.0

        self.event_manager.add_system_event("Monitoring stopped")
        log.info("Detection stopped.")

    def _toggle_pause(self):
        """Toggle pause/resume."""
        if not self.is_detecting:
            return

        self.is_paused = not self.is_paused

        if self.is_paused:
            self._btn_pause.configure(text="▶  Resume")
            self.event_manager.add_system_event("Monitoring paused")
        else:
            self._btn_pause.configure(text="⏸  Pause")
            self.event_manager.add_system_event("Monitoring resumed")

    # ══════════════════════════════════════════════════════
    # DETECTION THREAD
    # ══════════════════════════════════════════════════════

    def _detection_loop(self):
        """
        Main detection loop running in a background thread.

        Reads frames, runs both models, computes safety status,
        draws overlays, and stores results for the UI thread.
        """
        log.info("Detection loop started.")

        fps_counter = 0
        fps_start = time.time()

        while not self._stop_event.is_set():
            # Pause handling
            if self.is_paused:
                time.sleep(0.05)
                continue

            # Read frame
            ret, frame = self.video_source.read()
            if not ret:
                if self.video_source.source_type == "file":
                    self.event_manager.add_system_event("Video playback completed")
                else:
                    self.event_manager.add_system_event("Camera feed interrupted")
                self.is_detecting = False
                self._needs_cleanup = True
                break

            # PPE detection
            ppe_results = self.ppe_detector.detect(frame) if self.ppe_model_ok else EMPTY_PPE_RESULT

            # Fire/smoke detection
            fire_results = self.fire_detector.detect(frame) if self.fire_model_ok else EMPTY_FIRE_RESULT

            # Safety evaluation
            status = self.safety_engine.evaluate(ppe_results, fire_results)

            # Event generation (with debouncing)
            self.event_manager.update_from_status(
                status.level, status.detail, status.icon
            )

            # Draw overlays
            self.overlay_renderer.render(frame, ppe_results, fire_results)

            # FPS calculation
            fps_counter += 1
            elapsed = time.time() - fps_start
            if elapsed >= 1.0:
                display_fps = fps_counter / elapsed
                fps_counter = 0
                fps_start = time.time()
            else:
                display_fps = self._display_fps

            # Store results for UI thread (thread-safe)
            with self._lock:
                self._current_frame = frame
                self._current_ppe_results = ppe_results
                self._current_fire_results = fire_results
                self._current_status = status
                self._display_fps = display_fps
                self._frame_seq += 1

        log.info("Detection loop ended.")

    # ══════════════════════════════════════════════════════
    # UI UPDATE LOOP
    # ══════════════════════════════════════════════════════

    def _schedule_ui_update(self):
        """Schedule the next UI update."""
        self._update_ui()
        self.root.after(UI_UPDATE_INTERVAL_MS, self._schedule_ui_update)

    def _update_ui(self):
        """Update all UI elements from current detection state."""
        # Handle cleanup from natural detection end (must be on main thread)
        if self._needs_cleanup:
            self._needs_cleanup = False
            self.video_source.release()
            self._btn_pause.configure(state=tk.DISABLED, text="⏸  Pause")
            self._btn_stop.configure(state=tk.DISABLED)
            with self._lock:
                self._current_frame = None
                self._current_status = STATUS_STANDBY
                self._display_fps = 0.0

        # Clock
        self._header_clock.configure(
            text=time.strftime("%H:%M:%S")
        )

        # Model status
        if self.models_loaded:
            if self.ppe_model_ok and self.fire_model_ok:
                self._header_model_status.configure(
                    text="● MODELS READY", fg=Theme.SAFE
                )
            elif self.ppe_model_ok or self.fire_model_ok:
                self._header_model_status.configure(
                    text="● PARTIAL", fg=Theme.WARNING
                )
            else:
                self._header_model_status.configure(
                    text="● MODEL ERROR", fg=Theme.DANGER
                )

        # Source
        if self.is_detecting:
            src_text = f"SOURCE: {self.video_source.source_name}"
            if self.is_paused:
                src_text += " (PAUSED)"
            self._header_source.configure(text=src_text, fg=Theme.TEXT_SECONDARY)
        else:
            self._header_source.configure(text="SOURCE: —", fg=Theme.TEXT_MUTED)

        # Read shared state
        with self._lock:
            frame = self._current_frame
            ppe = self._current_ppe_results
            fire = self._current_fire_results
            status = self._current_status
            fps = self._display_fps
            frame_seq = self._frame_seq

        # FPS
        if self.is_detecting and fps > 0:
            self._header_fps.configure(text=f"FPS {fps:.1f}")
        else:
            self._header_fps.configure(text="FPS —")

        # Video feed
        self._update_video(frame, frame_seq)

        # Safety status panel
        self._update_safety(status)

        # Metrics
        self._update_metrics(ppe, fire)

        # Compliance
        self._update_compliance(ppe)

        # Events
        self._update_events()

        # Button state for source controls
        ready = self.models_loaded and not self.is_detecting
        btn_state = tk.NORMAL if ready else tk.DISABLED
        self._btn_webcam.configure(state=btn_state)
        self._btn_video.configure(state=btn_state)

    def _update_video(self, frame, frame_seq: int = 0):
        """Convert CV2 frame to tkinter image and display."""
        if frame is None:
            if not self.is_detecting:
                self._video_label.configure(image="", text="SELECT SOURCE TO BEGIN")
                self._last_displayed_seq = -1
            return

        # Skip if we already displayed this exact frame
        if frame_seq == self._last_displayed_seq:
            return
        self._last_displayed_seq = frame_seq

        try:
            # Get display area size
            w = self._video_label.winfo_width()
            h = self._video_label.winfo_height()
            if w < 10 or h < 10:
                return

            # Convert BGR → RGB
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            # Scale to fit display area while maintaining aspect ratio
            fh, fw = frame.shape[:2]
            scale = min(w / fw, h / fh)
            new_w = int(fw * scale)
            new_h = int(fh * scale)

            if new_w > 0 and new_h > 0:
                # INTER_AREA is correct for downscaling; INTER_LINEAR for upscaling
                interp = cv2.INTER_AREA if scale < 1.0 else cv2.INTER_LINEAR
                rgb = cv2.resize(rgb, (new_w, new_h), interpolation=interp)

            pil_image = Image.fromarray(rgb)
            photo = ImageTk.PhotoImage(pil_image)

            self._video_label.configure(image=photo, text="")
            self._photo_ref = photo  # Prevent garbage collection

        except Exception as e:
            log.debug("Frame display error: %s", e)

    def _update_safety(self, status: SafetyStatus):
        """Update the safety status panel."""
        self._safety_frame.configure(bg=status.bg_color)
        self._safety_inner.configure(bg=status.bg_color)
        self._safety_icon.configure(
            text=status.icon, fg=status.text_color, bg=status.bg_color
        )
        self._safety_level.configure(
            text=status.level, fg=status.text_color, bg=status.bg_color
        )
        self._safety_message.configure(
            text=status.message, bg=status.bg_color
        )

    def _update_metrics(self, ppe: dict, fire: dict):
        """Update live metrics from detection results."""
        if not ppe:
            return

        total = ppe.get("total_persons", 0)
        violations = (
            ppe.get("no_helmet_count", 0)
            + ppe.get("no_vest_count", 0)
            + ppe.get("no_boots_count", 0)
        )
        fire_det = fire.get("fire_detected", False) if fire else False
        smoke_det = fire.get("smoke_detected", False) if fire else False

        self._metric_labels["Workers"].configure(
            text=str(total) if self.is_detecting else "—"
        )

        viol_label = self._metric_labels["PPE Violations"]
        if self.is_detecting:
            viol_label.configure(
                text=str(violations),
                fg=Theme.WARNING_TEXT if violations > 0 else Theme.TEXT_PRIMARY,
            )
        else:
            viol_label.configure(text="—", fg=Theme.TEXT_PRIMARY)

        fire_label = self._metric_labels["Fire"]
        if self.is_detecting:
            if fire_det:
                fire_label.configure(text="DETECTED", fg=Theme.DANGER_TEXT)
            else:
                fire_label.configure(text="None", fg=Theme.TEXT_PRIMARY)
        else:
            fire_label.configure(text="—", fg=Theme.TEXT_PRIMARY)

        smoke_label = self._metric_labels["Smoke"]
        if self.is_detecting:
            if smoke_det:
                smoke_label.configure(text="DETECTED", fg=Theme.WARNING_TEXT)
            else:
                smoke_label.configure(text="None", fg=Theme.TEXT_PRIMARY)
        else:
            smoke_label.configure(text="—", fg=Theme.TEXT_PRIMARY)

    def _update_compliance(self, ppe: dict):
        """Update PPE compliance indicators."""
        if not ppe or not self.is_detecting:
            for label in self._compliance_labels.values():
                label.configure(text="—", fg=Theme.TEXT_MUTED)
            return

        # Helmet
        no_helmet = ppe.get("no_helmet_count", 0)
        helmet_count = sum(
            1 for d in ppe.get("head_detections", [])
            if d["label"] == "helmet"
        )
        if no_helmet > 0:
            self._compliance_labels["Helmet"].configure(
                text="! VIOLATION", fg=Theme.WARNING_TEXT
            )
        elif helmet_count > 0:
            self._compliance_labels["Helmet"].configure(
                text="✓ COMPLIANT", fg=Theme.SAFE_TEXT
            )
        else:
            self._compliance_labels["Helmet"].configure(
                text="— N/A", fg=Theme.TEXT_MUTED
            )

        # Vest
        no_vest = ppe.get("no_vest_count", 0)
        vest_found = any(w["vest_found"] for w in ppe.get("worker_ppe", []))
        if no_vest > 0:
            self._compliance_labels["Vest"].configure(
                text="! VIOLATION", fg=Theme.WARNING_TEXT
            )
        elif vest_found:
            self._compliance_labels["Vest"].configure(
                text="✓ COMPLIANT", fg=Theme.SAFE_TEXT
            )
        else:
            self._compliance_labels["Vest"].configure(
                text="— N/A", fg=Theme.TEXT_MUTED
            )

        # Boots (uses softer language for inferred results)
        no_boots = ppe.get("no_boots_count", 0)
        boot_found = any(w["boot_found"] for w in ppe.get("worker_ppe", []))
        if no_boots > 0:
            self._compliance_labels["Boots"].configure(
                text="⚠ CHECK REQUIRED", fg=Theme.WARNING_TEXT
            )
        elif boot_found:
            self._compliance_labels["Boots"].configure(
                text="✓ DETECTED", fg=Theme.SAFE_TEXT
            )
        else:
            self._compliance_labels["Boots"].configure(
                text="— N/A", fg=Theme.TEXT_MUTED
            )

    def _update_events(self):
        """Refresh the event log display only when events have changed."""
        # Skip rebuild if nothing changed — critical for performance
        if not self.event_manager.changed_since_last_check:
            return

        events = self.event_manager.events
        count = self.event_manager.event_count

        self._event_count_label.configure(
            text=f"{count} event{'s' if count != 1 else ''}" if count else ""
        )

        self._event_text.configure(state=tk.NORMAL)
        self._event_text.delete("1.0", tk.END)

        for event in events[:40]:  # Show latest 40
            tag = "info"
            if event.level == "WARNING":
                tag = "warning"
            elif event.level == "DANGER":
                tag = "danger"

            prefix = f"{event.time_str}  "
            self._event_text.insert(tk.END, prefix, "time")

            icon_text = f"{event.icon} " if event.icon else ""
            self._event_text.insert(tk.END, f"{icon_text}{event.message}\n", tag)

        self._event_text.configure(state=tk.DISABLED)

    # ══════════════════════════════════════════════════════
    # SETTINGS CALLBACKS
    # ══════════════════════════════════════════════════════

    def _on_ppe_conf_change(self, value):
        self.ppe_detector.confidence = float(value)

    def _on_fire_conf_change(self, value):
        self.fire_detector.confidence = float(value)

    def _on_overlay_toggle(self):
        self.overlay_renderer.show_overlays = self._overlay_var.get()

    # ══════════════════════════════════════════════════════
    # KEYBOARD SHORTCUTS
    # ══════════════════════════════════════════════════════

    def _bind_keys(self):
        """Bind keyboard shortcuts."""
        self.root.bind("<q>", lambda e: self._on_closing())
        self.root.bind("<Q>", lambda e: self._on_closing())
        self.root.bind("<p>", lambda e: self._toggle_pause())
        self.root.bind("<P>", lambda e: self._toggle_pause())
        self.root.bind("<Escape>", lambda e: self._stop_detection())

    # ══════════════════════════════════════════════════════
    # LIFECYCLE
    # ══════════════════════════════════════════════════════

    def _on_closing(self):
        """Clean shutdown."""
        log.info("Shutting down...")

        self._stop_event.set()
        self.is_detecting = False

        if self._detection_thread and self._detection_thread.is_alive():
            self._detection_thread.join(timeout=3.0)

        self.video_source.release()
        self.root.destroy()

        log.info("PPE Safety Monitoring System shut down cleanly.")

    def run(self):
        """Start the application."""
        self.root.protocol("WM_DELETE_WINDOW", self._on_closing)
        self._bind_keys()

        log.info("Application started.")
        self.event_manager.add_system_event("System initialized")

        self.root.mainloop()
