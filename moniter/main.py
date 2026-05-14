"""
Shim: the posture monitor now lives under ass/ (same code as the deployed API).

Prefer:
  cd ass && python scripts/posture_monitor_cli.py

Or run this file from the repo root; it forwards to the CLI above.
"""
import runpy
import sys
from pathlib import Path

_REPO = Path(__file__).resolve().parent.parent
_CLI = _REPO / "ass" / "scripts" / "posture_monitor_cli.py"
if not _CLI.is_file():
    print(f"[ERROR] Expected CLI at {_CLI}")
    sys.exit(1)

runpy.run_path(str(_CLI), run_name="__main__")
