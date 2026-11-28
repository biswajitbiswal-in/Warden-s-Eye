from ultralytics import YOLO
import cv2

# Model 1: pretrained model for PERSON detection
person_model = YOLO("yolo11n.pt")

# Model 2: our custom model for HELMET detection
helmet_model = YOLO(
    r"C:\Users\arpit\runs\detect\ppe_training\ppe_yolo11n\weights\best.pt"
)

video_path = "workingcctv.mp4"

cap = cv2.VideoCapture(video_path)

while True:

    ret, frame = cap.read()

    if not ret:
        break

    # -------------------------
    # PERSON DETECTION
    # -------------------------
    person_results = person_model(
        frame,
        conf=0.70,
        classes=[0],
        verbose=False
    )

    # -------------------------
    # HELMET DETECTION
    # -------------------------
    helmet_results = helmet_model(
        frame,
        conf=0.70,
        verbose=False
    )

    # Draw PERSON boxes
    for box in person_results[0].boxes:

        x1, y1, x2, y2 = map(int, box.xyxy[0])

        cv2.rectangle(
            frame,
            (x1, y1),
            (x2, y2),
            (255, 255, 255),
            2
        )

        cv2.putText(
            frame,
            "PERSON",
            (x1, y1 - 10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (255, 255, 255),
            2
        )

    # Draw HELMET boxes
    for box in helmet_results[0].boxes:

        cls = int(box.cls[0])

        if cls == 1:   # helmet

            x1, y1, x2, y2 = map(int, box.xyxy[0])

            cv2.rectangle(
                frame,
                (x1, y1),
                (x2, y2),
                (0, 255, 255),
                2
            )

            cv2.putText(
                frame,
                "HELMET",
                (x1, y1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 255),
                2
            )

    cv2.imshow("PPE Detection", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()