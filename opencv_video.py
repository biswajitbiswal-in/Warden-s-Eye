import cv2 

video = cv2.VideoCapture("sample-5s.mp4")

while True:
    ret, frame = video.read()
    if not ret:
        break

    # DRAW RECTANGLE
    cv2.rectangle(frame, (100,100),(400,400),(0,255,0),2)

    # ADD TEXT
    cv2.putText(frame,
                "TEST ZONE",
                (100,90),
                cv2.FONT_HERSHEY_SIMPLEX,
                1,
                (0,255,0),
                2
    )

    cv2.imshow("PS6  INDUSTRIAL SAFETY", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break


video.release()
cv2.destroyAllWindows()