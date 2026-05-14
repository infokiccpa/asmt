import cv2
from moniter.main import PostureAnalyser, draw_skeleton, draw_hud
import time
import os

def test_camera_headless():
    print("[INFO] Starting Headless Camera Test...")
    analyser = PostureAnalyser()
    
    # Try to open the camera
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("[ERROR] Could not open camera.")
        return

    print("[INFO] Camera opened. Capturing 1 frame...")
    # Wait a bit for camera to warm up
    time.sleep(2)
    
    ret, frame = cap.read()
    if not ret:
        print("[ERROR] Could not read frame.")
        cap.release()
        return

    print("[INFO] Frame captured. Analyzing...")
    # Mock some values for the HUD
    fps = 30.0
    session_s = 2.0
    good_secs = 2.0
    
    # Run analysis using the updated method
    result_data = analyser.analyse(frame)
    print(f"[INFO] Analysis Result: {result_data['status']} (Score: {result_data['score']})")
    print(f"[DEBUG] Issues: {result_data['issues']}")
    print(f"[DEBUG] Metrics: {result_data['metrics']}")
    
    if result_data["kps"] is not None:
        draw_skeleton(frame, result_data["kps"], result_data["status"])
    
    draw_hud(frame, result_data, fps, session_s, good_secs, "", 0)
    
    output_path = "camera_test_output.jpg"
    cv2.imwrite(output_path, frame)
    print(f"[SUCCESS] Saved annotated frame to {output_path}")
    
    cap.release()

if __name__ == "__main__":
    test_camera_headless()
