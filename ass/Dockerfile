# Use Python base image
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libtesseract-dev \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Pre-download YOLO models so the service starts without internet access
RUN python -c "from ultralytics import YOLO; YOLO('yolov8n-pose.pt'); YOLO('yolov8n.pt')"

# Set default port
ENV PORT=8000

# Run the API
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port $PORT"]
