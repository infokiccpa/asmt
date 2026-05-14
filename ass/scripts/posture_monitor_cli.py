"""
Local desktop posture monitor (webcam + OpenCV window).
Uses the same PostureAnalyser as the deployed FastAPI service (proctor.py).

Run from the ass directory:
  cd ass && python scripts/posture_monitor_cli.py

For GUI windows you need OpenCV with highgui (not headless only):
  pip install opencv-python
"""
from __future__ import annotations

import argparse
import math
import sys
import time
from pathlib import Path

import cv2
import numpy as np

# Resolve ass/ so `import proctor` works when launched as a script
_ASS_ROOT = Path(__file__).resolve().parent.parent
if str(_ASS_ROOT) not in sys.path:
    sys.path.insert(0, str(_ASS_ROOT))

from proctor import PostureAnalyser  # noqa: E402

NOSE, L_EYE, R_EYE, L_EAR, R_EAR = 0, 1, 2, 3, 4
L_SHLDR, R_SHLDR = 5, 6
L_ELBOW, R_ELBOW = 7, 8
L_WRIST, R_WRIST = 9, 10
L_HIP, R_HIP = 11, 12
L_KNEE, R_KNEE = 13, 14
L_ANKLE, R_ANKLE = 15, 16

SKELETON = [
    (NOSE, L_EYE), (NOSE, R_EYE), (L_EYE, L_EAR), (R_EYE, R_EAR),
    (L_SHLDR, R_SHLDR), (L_SHLDR, L_ELBOW), (R_SHLDR, R_ELBOW),
    (L_ELBOW, L_WRIST), (R_ELBOW, R_WRIST),
    (L_SHLDR, L_HIP), (R_SHLDR, R_HIP),
    (L_HIP, R_HIP), (L_HIP, L_KNEE), (R_HIP, R_KNEE),
    (L_KNEE, L_ANKLE), (R_KNEE, R_ANKLE),
]

GREEN = (50, 220, 100)
YELLOW = (30, 200, 255)
RED = (60, 60, 240)
WHITE = (240, 240, 240)
DARK = (20, 20, 30)
ACCENT = (255, 180, 60)
CONF_THRESHOLD = 0.4


def kp(keypoints, idx):
    x, y, c = keypoints[idx]
    return (int(x), int(y), float(c)) if float(c) > CONF_THRESHOLD else None


def draw_rounded_rect(img, x1, y1, x2, y2, r, color, alpha=0.55):
    overlay = img.copy()
    cv2.rectangle(overlay, (x1 + r, y1), (x2 - r, y2), color, -1)
    cv2.rectangle(overlay, (x1, y1 + r), (x2, y2 - r), color, -1)
    for cx, cy in [(x1 + r, y1 + r), (x2 - r, y1 + r), (x1 + r, y2 - r), (x2 - r, y2 - r)]:
        cv2.circle(overlay, (cx, cy), r, color, -1)
    cv2.addWeighted(overlay, alpha, img, 1 - alpha, 0, img)


def put_text(img, text, pos, scale=0.55, color=WHITE, thickness=1, bold=False):
    font = cv2.FONT_HERSHEY_DUPLEX
    if bold:
        cv2.putText(img, text, pos, font, scale, DARK, thickness + 2)
    cv2.putText(img, text, pos, font, scale, color, thickness)


def draw_skeleton(frame, kps_raw, status):
    color_map = {"Good": GREEN, "Warning": YELLOW, "Bad": RED}
    color = color_map.get(status, WHITE)
    for i, j in SKELETON:
        p1 = kp(kps_raw, i)
        p2 = kp(kps_raw, j)
        if p1 and p2:
            cv2.line(frame, p1[:2], p2[:2], color, 2, cv2.LINE_AA)
    for idx in range(17):
        p = kp(kps_raw, idx)
        if p:
            cv2.circle(frame, p[:2], 5, color, -1, cv2.LINE_AA)
            cv2.circle(frame, p[:2], 5, WHITE, 1, cv2.LINE_AA)


def draw_hud(frame, result, fps, session_secs, good_secs, alert_msg, alert_timer):
    h, w = frame.shape[:2]
    status = result["status"]
    score = result["score"]
    issues = result["issues"]
    status_color = {"Good": GREEN, "Warning": YELLOW, "Bad": RED}.get(status, WHITE)
    draw_rounded_rect(frame, 10, 10, 300, 120, 12, DARK, 0.65)
    put_text(frame, "POSTURE MONITOR", (22, 38), scale=0.65, color=ACCENT, bold=True)
    put_text(frame, f"Status : {status}", (22, 65), scale=0.6, color=status_color, bold=True)
    bar_x, bar_y, bar_w, bar_h = 22, 78, 200, 12
    cv2.rectangle(frame, (bar_x, bar_y), (bar_x + bar_w, bar_y + bar_h), (60, 60, 60), -1, cv2.LINE_AA)
    fill = int(bar_w * score / 100)
    cv2.rectangle(frame, (bar_x, bar_y), (bar_x + fill, bar_y + bar_h), status_color, -1, cv2.LINE_AA)
    put_text(frame, f"Score: {score}/100", (22, 106), scale=0.48, color=WHITE)
    draw_rounded_rect(frame, w - 200, 10, w - 10, 110, 12, DARK, 0.65)
    put_text(frame, f"FPS   : {fps:.1f}", (w - 188, 38), scale=0.52, color=WHITE)
    mins, secs = divmod(int(session_secs), 60)
    put_text(frame, f"Session : {mins:02d}:{secs:02d}", (w - 188, 62), scale=0.52, color=WHITE)
    good_pct = int(100 * good_secs / max(1, session_secs))
    put_text(frame, f"Good posture: {good_pct}%", (w - 188, 86), scale=0.52, color=GREEN)
    put_text(frame, "Q = quit  S = snapshot", (w - 188, 106), scale=0.38, color=(150, 150, 150))
    if issues:
        panel_h = 28 + 22 * len(issues)
        draw_rounded_rect(frame, 10, h - panel_h - 10, 320, h - 10, 10, DARK, 0.60)
        put_text(frame, "Issues Detected:", (22, h - panel_h + 12), scale=0.5, color=YELLOW, bold=True)
        for i, iss in enumerate(issues):
            put_text(frame, f"  • {iss}", (22, h - panel_h + 12 + 22 * (i + 1)), scale=0.48, color=RED)
    if alert_msg and alert_timer > 0:
        alpha = min(1.0, alert_timer / 1.5)
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, h // 2 - 35), (w, h // 2 + 35), (0, 0, 180), -1)
        cv2.addWeighted(overlay, alpha * 0.75, frame, 1 - alpha * 0.75, 0, frame)
        put_text(frame, alert_msg, (w // 2 - 200, h // 2 + 12), scale=0.9, color=WHITE, thickness=2, bold=True)


def main():
    if not hasattr(cv2, "imshow"):
        print(
            "[ERROR] OpenCV was built without GUI support (headless).\n"
            "Install a desktop build, e.g.: pip uninstall -y opencv-python-headless && pip install opencv-python"
        )
        sys.exit(1)

    parser = argparse.ArgumentParser(description="Real-Time Posture Monitor (shared engine with API)")
    parser.add_argument("--model", default="yolov8n-pose.pt", help="YOLOv8 pose model path")
    parser.add_argument("--source", default=0, help="Camera index or video path")
    parser.add_argument("--conf", default=0.5, type=float, help="Unused; kept for CLI compatibility")
    args = parser.parse_args()

    print("[INFO] Loading YOLOv8 models (same stack as /api/proctor)...")
    analyser = PostureAnalyser(pose_model=args.model)

    source = int(args.source) if str(args.source).isdigit() else args.source
    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        print(f"[ERROR] Cannot open camera/source: {source}")
        sys.exit(1)

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    prev_time = time.time()
    start_time = time.time()
    good_secs = 0.0
    alert_msg = ""
    alert_timer = 0.0
    bad_streak = 0.0
    snap_count = 0

    print("[INFO] Monitor running. Press Q to quit, S for snapshot.")
    cv2.namedWindow("Posture Monitor", cv2.WINDOW_NORMAL)
    cv2.resizeWindow("Posture Monitor", 1280, 720)

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        now = time.time()
        dt = now - prev_time
        prev_time = now
        fps = 1.0 / max(dt, 1e-6)
        session_s = now - start_time

        result_data = analyser.analyze_frame(frame, include_raw_kps=True)
        detected = result_data["status"] != "No Person"
        raw_kps = result_data.get("kps")

        if detected and raw_kps is not None:
            draw_skeleton(frame, raw_kps, result_data["status"])

        if detected and result_data["status"] == "Good":
            good_secs += dt
            bad_streak = 0.0
        elif detected:
            bad_streak += dt

        if bad_streak >= 10 and alert_timer <= 0:
            alert_msg = "⚠  CHECK YOUR POSTURE / SURROUNDINGS!"
            alert_timer = 3.0
            bad_streak = 0.0

        alert_timer = max(0.0, alert_timer - dt)

        draw_hud(frame, result_data, fps, session_s, good_secs, alert_msg, alert_timer)

        cv2.imshow("Posture Monitor", frame)
        key = cv2.waitKey(1) & 0xFF
        if key == ord("q"):
            break
        if key == ord("s"):
            snap_count += 1
            fname = f"snapshot_{snap_count:03d}.jpg"
            cv2.imwrite(fname, frame)
            print(f"[SNAP] Saved {fname}")
            alert_msg = f"Snapshot saved: {fname}"
            alert_timer = 2.0

    cap.release()
    cv2.destroyAllWindows()

    mins, secs = divmod(int(time.time() - start_time), 60)
    good_pct = int(100 * good_secs / max(1, time.time() - start_time))
    print("\n── Session Summary ──────────────────")
    print(f"Duration     : {mins:02d}:{secs:02d}")
    print(f"Good posture : {good_pct}%")
    print(f"Snapshots    : {snap_count}")


if __name__ == "__main__":
    main()
