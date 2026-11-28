"""
PPE Detection module.

Wraps the custom YOLO PPE model and implements the spatial
association logic that links PPE items to individual workers.

Detection classes:
    person, helmet, no_helmet, vest, boots

Association logic (preserved from validated prototype):
    - Vest: center of vest box within person's upper body region (20%-65%)
    - Boots: center of boot box within person's lower body region (45%-100%)
    - No vest: inferred when no vest found in upper body region
    - No boots: inferred when person height > 180px and no boot in lower body
    - Helmet / No helmet: IoU-based NMS keeps highest confidence detection
"""

from typing import Any, Dict, List, Optional

from app.utils.logger import get_logger
from app.config import (
    PPE_MODEL_PATH,
    PPE_CONFIDENCE,
    PPE_IMAGE_SIZE,
    PPE_IOU_THRESHOLD,
    UPPER_BODY_START,
    UPPER_BODY_END,
    LOWER_BODY_START,
    MIN_PERSON_HEIGHT_BOOTS,
    HEAD_IOU_THRESHOLD,
)

log = get_logger("detection.ppe")


class PPEDetector:
    """
    PPE detection and per-worker association.

    Loads the YOLO model once. Each call to detect() runs inference
    on one frame and returns structured results.
    """

    def __init__(self):
        self.model = None
        self.class_names: Dict[int, str] = {}
        self._confidence = PPE_CONFIDENCE

    @property
    def confidence(self) -> float:
        return self._confidence

    @confidence.setter
    def confidence(self, value: float):
        self._confidence = max(0.05, min(0.95, value))

    def load(self) -> bool:
        """
        Load the PPE YOLO model.

        Returns True on success, False on failure.
        """
        model_path = str(PPE_MODEL_PATH)
        log.info("Loading PPE model from: %s", model_path)

        try:
            from ultralytics import YOLO
            self.model = YOLO(model_path)
            self.class_names = self.model.names
            log.info("PPE model loaded. Classes: %s", self.class_names)
            return True

        except FileNotFoundError:
            log.error("PPE model file not found: %s", model_path)
            return False
        except Exception as e:
            log.error("Failed to load PPE model: %s", e)
            return False

    def detect(self, frame) -> Dict[str, Any]:
        """
        Run PPE detection on a single frame.

        Returns a dictionary with:
            persons: list of person detections
            head_detections: cleaned helmet/no_helmet detections
            worker_ppe: per-worker PPE status
            total_persons: int
            no_helmet_count: int
            no_vest_count: int
            no_boots_count: int
        """
        if self.model is None:
            return EMPTY_PPE_RESULT

        try:
            results = self.model.predict(
                source=frame,
                conf=self._confidence,
                imgsz=PPE_IMAGE_SIZE,
                iou=PPE_IOU_THRESHOLD,
                verbose=False,
            )
        except Exception as e:
            log.error("PPE inference error: %s", e)
            return EMPTY_PPE_RESULT

        # ── Extract all detections ─────────────────────────────
        detections = []
        for result in results:
            for box in result.boxes:
                cls = int(box.cls[0])
                conf = float(box.conf[0])
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                label = self.class_names[cls]
                detections.append({
                    "label": label,
                    "conf": conf,
                    "box": (x1, y1, x2, y2),
                })

        # ── Separate by class ──────────────────────────────────
        persons = [d for d in detections if d["label"] == "person"]
        helmets = [d for d in detections if d["label"] == "helmet"]
        no_helmets = [d for d in detections if d["label"] == "no_helmet"]
        vests = [d for d in detections if d["label"] == "vest"]
        boots = [d for d in detections if d["label"] == "boots"]

        # ── Clean helmet / no_helmet via IoU NMS ───────────────
        head_detections = self._clean_head_detections(helmets, no_helmets)

        # ── Associate PPE to workers ───────────────────────────
        worker_ppe = []
        no_helmet_count = 0
        no_vest_count = 0
        no_boots_count = 0

        for person in persons:
            px1, py1, px2, py2 = person["box"]
            person_height = py2 - py1

            # Body regions
            upper_y1 = py1 + int(person_height * UPPER_BODY_START)
            upper_y2 = py1 + int(person_height * UPPER_BODY_END)
            lower_y1 = py1 + int(person_height * LOWER_BODY_START)
            lower_y2 = py2

            # Vest check
            vest_found = False
            vest_detection = None
            for vest in vests:
                vx1, vy1, vx2, vy2 = vest["box"]
                cx = (vx1 + vx2) / 2
                cy = (vy1 + vy2) / 2
                if px1 <= cx <= px2 and upper_y1 <= cy <= upper_y2:
                    vest_found = True
                    vest_detection = vest
                    break

            if not vest_found:
                no_vest_count += 1

            # Boots check
            boot_found = False
            boot_detection = None
            for boot in boots:
                bx1, by1, bx2, by2 = boot["box"]
                cx = (bx1 + bx2) / 2
                cy = (by1 + by2) / 2
                if px1 <= cx <= px2 and lower_y1 <= cy <= lower_y2:
                    boot_found = True
                    boot_detection = boot
                    break

            # Only infer no-boots if person is large enough
            no_boots_inferred = (
                person_height > MIN_PERSON_HEIGHT_BOOTS
                and not boot_found
            )
            if no_boots_inferred:
                no_boots_count += 1

            worker_ppe.append({
                "person_box": person["box"],
                "person_conf": person["conf"],
                "vest_found": vest_found,
                "vest_detection": vest_detection,
                "boot_found": boot_found,
                "boot_detection": boot_detection,
                "no_boots_inferred": no_boots_inferred,
            })

        # Count no-helmet from cleaned head detections
        for det in head_detections:
            if det["label"] == "no_helmet":
                no_helmet_count += 1

        return {
            "persons": persons,
            "head_detections": head_detections,
            "vests": vests,
            "boots": boots,
            "worker_ppe": worker_ppe,
            "total_persons": len(persons),
            "no_helmet_count": no_helmet_count,
            "no_vest_count": no_vest_count,
            "no_boots_count": no_boots_count,
        }

    def _clean_head_detections(
        self,
        helmets: List[Dict],
        no_helmets: List[Dict],
    ) -> List[Dict]:
        """
        Merge helmet and no_helmet detections, removing overlaps.

        Keeps the higher-confidence detection when two overlap
        by more than HEAD_IOU_THRESHOLD.

        This is the same logic from the validated prototype.
        """
        combined = helmets + no_helmets
        combined.sort(key=lambda d: d["conf"], reverse=True)

        cleaned = []
        for det in combined:
            overlap = False
            for existing in cleaned:
                if self._calculate_iou(det["box"], existing["box"]) > HEAD_IOU_THRESHOLD:
                    overlap = True
                    break
            if not overlap:
                cleaned.append(det)

        return cleaned

    @staticmethod
    def _calculate_iou(box1, box2) -> float:
        """Calculate Intersection over Union for two bounding boxes."""
        x1, y1, x2, y2 = box1
        a1, b1, a2, b2 = box2

        ix1 = max(x1, a1)
        iy1 = max(y1, b1)
        ix2 = min(x2, a2)
        iy2 = min(y2, b2)

        iw = max(0, ix2 - ix1)
        ih = max(0, iy2 - iy1)
        intersection = iw * ih

        area1 = max(1, (x2 - x1) * (y2 - y1))
        area2 = max(1, (a2 - a1) * (b2 - b1))
        union = area1 + area2 - intersection

        return intersection / union if union > 0 else 0


# Module-level empty result constant (avoids re-creating dicts per frame)
EMPTY_PPE_RESULT: Dict[str, Any] = {
    "persons": [],
    "head_detections": [],
    "vests": [],
    "boots": [],
    "worker_ppe": [],
    "total_persons": 0,
    "no_helmet_count": 0,
    "no_vest_count": 0,
    "no_boots_count": 0,
}
