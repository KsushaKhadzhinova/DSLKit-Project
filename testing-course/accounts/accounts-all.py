"""Runs every accounts script, one process per browser (Edge and Firefox side by side), then the gate. Exit 1 when anything failed."""
import os
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).parent
SCRIPTS = ["isolation.py", "roles_projects.py", "storage_states.py", "ai_offline_mobile.py", "course_app.py"]
browsers = os.environ.get("ACC_BROWSERS", "msedge,firefox").split(",")
for script in SCRIPTS:
    procs = [subprocess.Popen([sys.executable, "-u", str(HERE / script)], env={**os.environ, "ACC_BROWSERS": b}) for b in browsers]
    for p in procs:
        p.wait()
sys.exit(subprocess.call([sys.executable, str(HERE / "accounts-gate.py")]))
