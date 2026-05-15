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

# Do not pre-download YOLO weights here — Render free-tier Docker builds often OOM or time out.
# Models download on first use at runtime (needs outbound network once).

# Set default port (Render overrides with $PORT at runtime)
ENV PORT=8000

# Run the API
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port $PORT"]
