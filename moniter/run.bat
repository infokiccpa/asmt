@echo off
echo Installing dependencies...
pip install -r requirements.txt
echo.
echo Starting Posture Monitor...
python main.py
pause
