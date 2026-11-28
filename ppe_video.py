from ultralytics import YOLO
import cv2

# Load our trained PPE model
model = YOLO(
    r"C:\Users\arpit\runs\detect\ppe_training\ppe_yolo11n\weights\best.pt"
)

# Change this to your video filename
video_path = "workingcctv.mp4"

cap = cv2.VideoCapture(video_path)

while True:

    ret, frame = cap.read()

    if not ret:
        break

    results = model(frame, conf=0.40)

    annotated_frame = results[0].plot()

    cv2.imshow("PPE Detection", annotated_frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()