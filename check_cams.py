import cv2

def check_cameras():
    print("Checking for available cameras...")
    for i in range(5):
        cap = cv2.VideoCapture(i)
        if cap.isOpened():
            ret, frame = cap.read()
            if ret:
                print(f"Camera index {i} is available and working.")
            else:
                print(f"Camera index {i} is available but cannot read frame.")
            cap.release()
        else:
            print(f"Camera index {i} is not available.")

if __name__ == "__main__":
    check_cameras()
