# Posture monitor (local)

Logic is shared with the Python API under `ass/` (`proctor.py` and `/api/proctor/*`).

- **Desktop webcam UI:** from repo root, `python moniter/main.py` (shim) or `cd ass && python scripts/posture_monitor_cli.py`
- **HTTP API (Render / Docker):** deploy the `ass` service only; no separate `moniter` service.

For the OpenCV window, use a non-headless OpenCV build (e.g. `opencv-python`). The `ass` server image uses `opencv-python-headless`, which is correct for production.
