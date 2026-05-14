@echo off
set "PATH=%LOCALAPPDATA%\Node\node-v20.12.2-win-x64;%PATH%"

echo Starting Python API (Port 8000)...
start "ICCPA Python API" cmd /k "cd ass && call venv\Scripts\activate.bat && uvicorn main:app --reload --host 0.0.0.0 --port 8000"

echo Starting Backend Node Server (Port 5000)...
start "ICCPA Node Backend" cmd /k "cd backend && node server.js"

echo Starting Frontend Next.js Server (Port 3000)...
start "ICCPA Next.js Frontend" cmd /k "cd frontend && npm run dev"

echo All development servers are starting in separate windows!
