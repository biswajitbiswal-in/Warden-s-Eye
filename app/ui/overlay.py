"""
Detection overlay renderer.

Draws bounding boxes, labels, and status indicators on video frames.
Produces clean, professional overlays suitable for an industrial
monitoring display.
"""

import cv2
from typing import Any, Dict

from app.config import (
    Colors,
    OVERLAY_FONT_SCALE,
    OVERLAY_THICKNESS,
    OVERLAY_BBOX_THICKNESS,
    OVERLAY_FIRE_THICKNESS,
    LABEL_PADDING_X,
    LABEL_PADDING_Y,
)


FONT = cv2.FONT_HERSHEY_SIMPLEX


class OverlayRenderer:
    """
    Draws detection results onto video frames.

    All drawing is done in-place on the frame (modifies the
    numpy array directly). Uses consistent styling for a
    professional appearance.
    """

    def __init__(self):
        self.show_overlays = True

    def render(
        self,
        frame,
        ppe_results: Dict[str, Any],
        fire_results: Dict[str, Any],
    ):
        """
        Draw all detection overlays onto the frame.

        Modifies frame in-place.
        """
        if not self.show_overlays:
            return

        self._draw_workers(frame, ppe_results)
        self._draw_head_detections(frame, ppe_results)
        self._draw_fire_smoke(frame, fire_results)

    def _draw_workers(self, frame, ppe_results: Dict):
        """Draw person boxes and associated PPE status."""
        for worker in ppe_results.get("worker_ppe", []):
            px1, py1, px2, py2 = worker["person_box"]

            # Person bounding box
            cv2.rectangle(
                frame, (px1, py1), (px2, py2),
                Colors.PERSON, OVERLAY_BBOX_THICKNESS
            )
            self._draw_label(frame, "PERSON", px1, py1 - 5, Colors.PERSON)

            # Vest
            if worker["vest_found"] and worker["vest_detection"]:
                vd = worker["vest_detection"]
                vx1, vy1, vx2, vy2 = vd["box"]
                cv2.rectangle(
                    frame, (vx1, vy1), (vx2, vy2),
                    Colors.VEST, OVERLAY_BBOX_THICKNESS
                )
                self._draw_label(
                    frame,
                    f"VEST {vd['conf']:.2f}",
                    vx1, vy1 - 5,
                    Colors.VEST,
                )
            else:
                self._draw_label(
                    frame, "NO VEST",
                    px1, py2 + 20,
                    Colors.NO_VEST,
                )

            # Boots
            if worker["boot_found"] and worker["boot_detection"]:
                bd = worker["boot_detection"]
                bx1, by1, bx2, by2 = bd["box"]
                cv2.rectangle(
                    frame, (bx1, by1), (bx2, by2),
                    Colors.BOOTS, OVERLAY_BBOX_THICKNESS
                )
                self._draw_label(
                    frame,
                    f"BOOTS {bd['conf']:.2f}",
                    bx1, by1 - 5,
                    Colors.BOOTS,
                )
            elif worker["no_boots_inferred"]:
                self._draw_label(
                    frame, "NO BOOTS",
                    px1, py2 + 45,
                    Colors.NO_BOOTS,
                )

    def _draw_head_detections(self, frame, ppe_results: Dict):
        """Draw cleaned helmet / no_helmet detections."""
        for det in ppe_results.get("head_detections", []):
            label = det["label"]
            conf = det["conf"]
            x1, y1, x2, y2 = det["box"]

            color = Colors.BY_LABEL.get(label, (255, 255, 255))

            cv2.rectangle(
                frame, (x1, y1), (x2, y2),
                color, OVERLAY_BBOX_THICKNESS
            )

            display = label.upper().replace("_", " ")
            self._draw_label(
                frame,
                f"{display} {conf:.2f}",
                x1, y1 - 5,
                color,
            )

    def _draw_fire_smoke(self, frame, fire_results: Dict):
        """Draw fire and smoke detections with emphasis."""
        for det in fire_results.get("detections", []):
            x1, y1, x2, y2 = det["box"]
            conf = det["conf"]
            label = det["label"]

            if label == "fire":
                color = Colors.FIRE
                thickness = OVERLAY_FIRE_THICKNESS
            else:
                color = Colors.SMOKE
                thickness = OVERLAY_FIRE_THICKNESS

            cv2.rectangle(
                frame, (x1, y1), (x2, y2),
                color, thickness
            )

            self._draw_label(
                frame,
                f"{label.upper()} {conf:.2f}",
                x1, y1 - 5,
                color,
            )

    @staticmethod
    def _draw_label(frame, text: str, x: int, y: int, color: tuple):
        """
        Draw a label with dark background for readability.

        Clamps position to stay within frame boundaries.
        """
        fh, fw = frame.shape[:2]
        scale = OVERLAY_FONT_SCALE
        thickness = OVERLAY_THICKNESS

        (w, h), baseline = cv2.getTextSize(text, FONT, scale, thickness)

        # Clamp to frame boundaries
        x = max(2, min(x, fw - w - LABEL_PADDING_X * 2 - 2))
        y = max(h + LABEL_PADDING_Y + 2, min(y, fh - LABEL_PADDING_Y - 2))

        # Background
        cv2.rectangle(
            frame,
            (x, y - h - baseline - LABEL_PADDING_Y),
            (x + w + LABEL_PADDING_X * 2, y + LABEL_PADDING_Y - 1),
            Colors.LABEL_BG,
            -1,
        )

        # Text
        cv2.putText(
            frame, text,
            (x + LABEL_PADDING_X, y),
            FONT, scale, color, thickness,
        )

