"""
Video source abstraction for webcam and file inputs.

Handles opening, reading, releasing, and error recovery.
"""

import cv2
import time
from pathlib import Path
from typing import Optional, Tuple

from app.utils.logger import get_logger
from app.config import WEBCAM_INDEX, WEBCAM_BACKEND, WEBCAM_WARMUP_SECONDS

log = get_logger("video")


class VideoSource:
    """
    Unified video source for webcam and video files.

    Handles lifecycle management, frame reading, and
    provides source metadata (FPS, frame count, etc.).
    """

    def __init__(self):
        self._cap: Optional[cv2.VideoCapture] = None
        self._source_type: Optional[str] = None   # "webcam" or "file"
        self._source_name: str = "—"
        self._total_frames: int = 0
        self._video_fps: float = 0.0

    @property
    def is_opened(self) -> bool:
        return self._cap is not None and self._cap.isOpened()

    @property
    def source_type(self) -> Optional[str]:
        return self._source_type

    @property
    def source_name(self) -> str:
        return self._source_name

    @property
    def total_frames(self) -> int:
        return self._total_frames

    @property
    def video_fps(self) -> float:
        return self._video_fps

    @property
    def current_frame_index(self) -> int:
        if self._cap and self._source_type == "file":
            return int(self._cap.get(cv2.CAP_PROP_POS_FRAMES))
        return 0

    def open_webcam(self, index: int = WEBCAM_INDEX) -> bool:
        """
        Open a webcam source.

        Returns True on success, False on failure.
        Includes warmup delay for camera initialization.
        """
        self.release()

        log.info("Opening webcam (index=%d)...", index)

        try:
            if WEBCAM_BACKEND is not None:
                cap = cv2.VideoCapture(index, WEBCAM_BACKEND)
            else:
                cap = cv2.VideoCapture(index)

            if not cap.isOpened():
                log.error("Webcam index %d could not be opened.", index)
                return False

            # Warmup — cameras need time to initialize exposure/focus
            time.sleep(WEBCAM_WARMUP_SECONDS)

            # Verify we can actually read a frame
            ret, frame = cap.read()
            if not ret or frame is None:
                log.error("Webcam opened but produced no frames.")
                cap.release()
                return False

            self._cap = cap
            self._source_type = "webcam"
            self._source_name = f"Webcam {index}"
            self._total_frames = 0
            self._video_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0

            log.info("Webcam opened successfully. Resolution: %dx%d",
                     int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
                     int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)))
            return True

        except Exception as e:
            log.error("Failed to open webcam: %s", e)
            return False

    def open_file(self, path: str) -> bool:
        """
        Open a video file source.

        Returns True on success, False on failure.
        Validates that the file exists and is readable.
        """
        self.release()

        file_path = Path(path)

        if not file_path.exists():
            log.error("Video file not found: %s", path)
            return False

        if not file_path.is_file():
            log.error("Path is not a file: %s", path)
            return False

        log.info("Opening video file: %s", file_path.name)

        try:
            cap = cv2.VideoCapture(str(file_path))

            if not cap.isOpened():
                log.error("Could not open video file: %s", path)
                return False

            self._cap = cap
            self._source_type = "file"
            self._source_name = file_path.name
            self._total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

            fps = cap.get(cv2.CAP_PROP_FPS)
            self._video_fps = fps if fps > 0 else 30.0

            log.info("Video opened. FPS: %.1f, Frames: %d",
                     self._video_fps, self._total_frames)
            return True

        except Exception as e:
            log.error("Failed to open video file: %s", e)
            return False

    def read(self) -> Tuple[bool, Optional["cv2.Mat"]]:
        """
        Read the next frame.

        Returns (success, frame) tuple.
        On failure or end-of-video, returns (False, None).
        """
        if not self.is_opened:
            return False, None

        try:
            ret, frame = self._cap.read()

            if not ret or frame is None or frame.size == 0:
                if self._source_type == "file":
                    log.info("Video playback completed.")
                else:
                    log.warning("Empty frame from camera.")
                return False, None

            return True, frame

        except Exception as e:
            log.error("Frame read error: %s", e)
            return False, None

    def release(self):
        """Release the current video source."""
        if self._cap is not None:
            try:
                self._cap.release()
                log.info("Video source released: %s", self._source_name)
            except Exception as e:
                log.warning("Error releasing source: %s", e)
            finally:
                self._cap = None
                self._source_type = None
                self._source_name = "—"
                self._total_frames = 0
                self._video_fps = 0.0
