from ultralytics import YOLO

model = YOLO(
    r"C:\Users\arpit\runs\detect\ppe_training\ppe_yolo11n\weights\best.pt"
)

model.predict(
    source="PPE_Tiny_3Class/valid/images",
    conf=0.25,
    save=True
)

print("Prediction completed!")
