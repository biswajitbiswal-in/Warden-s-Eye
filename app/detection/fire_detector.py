"""
Fire and Smoke detection module.

Wraps the separate YOLO fire/smoke model.
Preserves detection behavior from the validated prototype.
"""

from typing import Any, Dict, List

from app.utils.logger import get_logger
from app.config import FIRE_SMOKE_MODEL_PATH, FIRE_CONFIDENCE, FIRE_IMAGE_SIZE

log = get_logger("detection.fire")


class FireSmokeDetector:
    """
    Fire and smoke detection using a dedicated YOLO model.

    Loaded once. Each detect() call runs inference on one frame
    and returns fire/smoke status plus detection boxes.
    """

    def __init__(self):
        self.model = None
        self.class_names: Dict[int, str] = {}
        self._confidence = FIRE_CONFIDENCE

    @property
    def confidence(self) -> float:
        return self._confidence

    @confidence.setter
    def confidence(self, value: float):
        self._confidence = max(0.05, min(0.95, value))

    def load(self) -> bool:
        """
        Load the fire/smoke YOLO model.

        Returns True on success, False on failure.
        """
        model_path = str(FIRE_SMOKE_MODEL_PATH)
        log.info("Loading fire/smoke model from: %s", model_path)

        try:
            from ultralytics import YOLO
            self.model = YOLO(model_path)
            self.class_names = self.model.names
            log.info("Fire/smoke model loaded. Classes: %s", self.class_names)
            return True

        except FileNotFoundError:
            log.error("Fire/smoke model file not found: %s", model_path)
            return False
        except Exception as e:
            log.error("Failed to load fire/smoke model: %s", e)
            return False

    def detect(self, frame) -> Dict[str, Any]:
        """
        Run fire/smoke detection on a single frame.

        Returns:
            fire_detected: bool
            smoke_detected: bool
            detections: list of {label, conf, box}
        """
        if self.model is None:
            return EMPTY_FIRE_RESULT

        try:
            results = self.model.predict(
                source=frame,
                conf=self._confidence,
                imgsz=FIRE_IMAGE_SIZE,
                verbose=False,
            )
        except Exception as e:
            log.error("Fire/smoke inference error: %s", e)
            return EMPTY_FIRE_RESULT

        fire_detected = False
        smoke_detected = False
        detections: List[Dict] = []

        for result in results:
            for box in result.boxes:
                cls = int(box.cls[0])
                conf = float(box.conf[0])
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                label = self.class_names[cls]
                label_lower = label.lower()

                if "fire" in label_lower:
                    fire_detected = True
                    detections.append({
                        "label": "fire",
                        "display_label": label,
                        "conf": conf,
                        "box": (x1, y1, x2, y2),
                    })
                elif "smoke" in label_lower:
                    smoke_detected = True
                    detections.append({
                        "label": "smoke",
                        "display_label": label,
                        "conf": conf,
                        "box": (x1, y1, x2, y2),
                    })

        return {
            "fire_detected": fire_detected,
            "smoke_detected": smoke_detected,
            "detections": detections,
        }


# Module-level empty result constant
EMPTY_FIRE_RESULT: Dict[str, Any] = {
    "fire_detected": False,
    "smoke_detected": False,
    "detections": [],
}
