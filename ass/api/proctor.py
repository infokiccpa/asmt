from fastapi import APIRouter, UploadFile, File
import cv2
import numpy as np
import base64
from proctor import PostureAnalyser
import io
from PIL import Image

router = APIRouter()
analyser = PostureAnalyser(pose_model="yolov8n-pose.pt")

@router.post("/analyze")
async def analyze_posture(file: UploadFile = File(...)):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if frame is None:
        return {"error": "Invalid image"}
        
    result = analyser.analyze_frame(frame)
    return result

@router.post("/analyze-base64")
async def analyze_base64(data: dict):
    image_data = data.get("image")
    if not image_data:
        return {"error": "No image data"}
        
    if "base64," in image_data:
        image_data = image_data.split("base64,")[1]
        
    img_bytes = base64.b64decode(image_data)
    nparr = np.frombuffer(img_bytes, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if frame is None:
        return {"error": "Invalid image"}
        
    result = analyser.analyze_frame(frame)
    return result
