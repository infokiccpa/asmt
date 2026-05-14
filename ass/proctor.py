import cv2
import numpy as np
import math
import base64
from collections import deque
from ultralytics import YOLO

# ─── COCO Keypoint Indices ────────────────────────────────────────────────────
NOSE, L_EYE, R_EYE, L_EAR, R_EAR = 0, 1, 2, 3, 4
L_SHLDR, R_SHLDR = 5, 6
L_ELBOW, R_ELBOW = 7, 8
L_WRIST, R_WRIST = 9, 10
L_HIP, R_HIP = 11, 12
L_KNEE, R_KNEE = 13, 14
L_ANKLE, R_ANKLE = 15, 16

CONF_THRESHOLD = 0.4

class PostureAnalyser:
    def __init__(self, pose_model="yolov8n-pose.pt", obj_model="yolov8n.pt"):
        self.pose_model = YOLO(pose_model)
        self.obj_model = YOLO(obj_model) # For phone/object detection
        self.history = deque(maxlen=30)

    def angle_between(self, a, b, c):
        ba = (a[0] - b[0], a[1] - b[1])
        bc = (c[0] - b[0], c[1] - b[1])
        dot = ba[0]*bc[0] + ba[1]*bc[1]
        mag = math.hypot(*ba) * math.hypot(*bc)
        if mag == 0: return 0.0
        return math.degrees(math.acos(max(-1, min(1, dot / mag))))

    def kp(self, keypoints, idx):
        if idx >= len(keypoints): return None
        x, y, c = keypoints[idx]
        return (int(x), int(y), float(c)) if float(c) > CONF_THRESHOLD else None

    def midpoint(self, p1, p2):
        return ((p1[0]+p2[0])//2, (p1[1]+p2[1])//2)

    def analyze_frame(self, frame, include_raw_kps: bool = False):
        pose_results = self.pose_model(frame, verbose=False, imgsz=320)
        obj_results = self.obj_model(frame, verbose=False, classes=[67, 73], conf=0.15, imgsz=320)


        issues = []
        deductions = 0
        status = "Good"
        objects_data = []
        keypoints_data = {}
        
        annotated_frame = frame.copy()
        if pose_results and len(pose_results) > 0:
            annotated_frame = pose_results[0].plot()
        if obj_results and len(obj_results) > 0:
            annotated_frame = obj_results[0].plot(img=annotated_frame)
            
        b64_image = ""
        if annotated_frame is not None:
            _, buffer = cv2.imencode('.jpg', annotated_frame)
            b64_image = base64.b64encode(buffer).decode('utf-8')

        # Check for multiple people
        if pose_results and pose_results[0].keypoints is not None and len(pose_results[0].keypoints) > 0:
            kps_all = pose_results[0].keypoints.data.cpu().numpy()
            boxes = pose_results[0].boxes
            
            # Find the largest person near the center (main user)
            center_x = frame.shape[1] / 2
            scores = []
            areas = []
            for i, box in enumerate(boxes):
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                box_area = (x2 - x1) * (y2 - y1)
                mid_x = (x1 + x2) / 2
                dist_from_center = abs(mid_x - center_x) / frame.shape[1]
                score = box_area * (1 - dist_from_center)
                scores.append(score)
                areas.append(box_area)
            
            if not scores:
                return {"status": "No Person", "score": 0, "issues": ["No person detected"], "objects": objects_data, "keypoints": keypoints_data, "annotated_image": b64_image}

            main_idx = int(np.argmax(scores))
            user_area = areas[main_idx]
            kps = kps_all[main_idx]

            # Populate keypoints for frontend visualization
            names = ["nose", "l_eye", "r_eye", "l_ear", "r_ear", "l_shldr", "r_shldr", "l_elbow", "r_elbow", "l_wrist", "r_wrist", "l_hip", "r_hip", "l_knee", "r_knee", "l_ankle", "r_ankle"]
            for i, name in enumerate(names):
                p = self.kp(kps, i)
                if p: keypoints_data[name] = {"x": p[0], "y": p[1], "conf": p[2]}

            # Check for OTHER significant people
            significant_others = 0
            for i, other_area in enumerate(areas):
                if i == main_idx: continue
                
                # Intelligent Check: Is this person looking at the screen?
                other_kps = kps_all[i]
                o_nose = self.kp(other_kps, NOSE)
                o_l_ear = self.kp(other_kps, L_EAR)
                o_r_ear = self.kp(other_kps, R_EAR)
                is_looking = False
                if o_nose and o_l_ear and o_r_ear:
                    d_l = math.hypot(o_nose[0]-o_l_ear[0], o_nose[1]-o_l_ear[1])
                    d_r = math.hypot(o_nose[0]-o_r_ear[0], o_nose[1]-o_r_ear[1])
                    o_ratio = d_l / max(d_r, 1)
                    if 0.6 < o_ratio < 1.6: # Looking forward
                        is_looking = True

                # Flag if they are large enough OR smaller but looking at screen
                if other_area > user_area * 0.45 or (other_area > user_area * 0.15 and is_looking):
                    significant_others += 1
            
            if significant_others > 0:
                issues.append(f"Multiple people ({significant_others + 1} detected)")
                deductions += 100
        else:
            return {"status": "No Person", "score": 0, "issues": ["No person detected"], "objects": objects_data, "keypoints": keypoints_data, "annotated_image": b64_image}

        # Check for phones/books
        if obj_results and len(obj_results[0].boxes) > 0:
            for box in obj_results[0].boxes:
                cls_id = int(box.cls[0])
                label = "Cell Phone" if cls_id == 67 else "Book/Notes"
                issues.append(f"Banned object detected: {label}")
                deductions += 100 # Critical violation
                xyxy = box.xyxy[0].cpu().numpy().tolist()
                objects_data.append({"label": label, "box": xyxy})

        # ── 3. Head Rotation & Orientation (Critical) ────────────────────────
        looking_away = False
        eyes_closed  = False

        l_ear = self.kp(kps, L_EAR)
        r_ear = self.kp(kps, R_EAR)
        nose = self.kp(kps, NOSE)
        l_shldr = self.kp(kps, L_SHLDR)
        r_shldr = self.kp(kps, R_SHLDR)

        # Horizontal (Left/Right)
        if l_ear and r_ear and nose:
            d_left = math.hypot(nose[0]-l_ear[0], nose[1]-l_ear[1])
            d_right = math.hypot(nose[0]-r_ear[0], nose[1]-r_ear[1])
            ratio = d_left / max(d_right, 1)
            if ratio > 2.8 or ratio < 0.35:
                issues.append("Looking sideways")
                looking_away = True
        elif nose and (not l_ear or not r_ear):
            issues.append("Head turned away")
            looking_away = True

        # Vertical (Up/Down)
        if nose and l_ear and r_ear:
            ear_avg_y = (l_ear[1] + r_ear[1]) / 2
            v_diff = nose[1] - ear_avg_y
            if v_diff > 55: # Looking down
                issues.append("Looking down")
                looking_away = True
            elif v_diff < -30: # Looking up
                issues.append("Looking up")
                looking_away = True

        # Eyes Closed Proxy
        if not looking_away and l_ear and r_ear:
            l_eye = self.kp(kps, L_EYE)
            r_eye = self.kp(kps, R_EYE)
            if (not l_eye or not r_eye):
                issues.append("Eyes closed/obscured")
                eyes_closed = True

        if looking_away or eyes_closed:
            deductions += 100

        # ── 4. Minor Posture Issues (Warning only) ───────────────────────────
        if l_shldr and r_shldr:
            sh_width = max(1, abs(l_shldr[0] - r_shldr[0]))
            tilt = abs(l_shldr[1] - r_shldr[1])
            tilt_ratio = tilt / sh_width
            if tilt_ratio > 0.22:
                issues.append("Shoulders uneven")
                deductions += 10

        if nose and l_shldr and r_shldr:
            sh_width = max(1, abs(l_shldr[0] - r_shldr[0]))
            shldr_mid_x = (l_shldr[0] + r_shldr[0]) / 2
            forward_px = abs(nose[0] - shldr_mid_x)
            forward_ratio = forward_px / sh_width
            if forward_ratio > 0.45:
                issues.append("Leaning significantly")
                deductions += 10

        score = max(0, 100 - deductions)
        self.history.append(score)
        avg_score = int(sum(self.history) / len(self.history))

        if avg_score >= 90: status = "Good"
        elif avg_score >= 50: status = "Warning"
        else: status = "Bad"

        out = {
            "status": status,
            "score": avg_score,
            "issues": issues,
            "objects": objects_data,
            "keypoints": keypoints_data,
            "annotated_image": b64_image,
        }
        if include_raw_kps:
            out["kps"] = kps
        return out
