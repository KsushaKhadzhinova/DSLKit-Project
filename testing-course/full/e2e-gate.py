"""Fails (exit 1) when any result of the end-to-end scripts in E2E_OUT (or this folder) is not Passed."""
import json
import sys
from e2e_env import OUT

bad = []
for name in sys.argv[1:] or ["editor", "palette", "extra", "critical-path", "auth", "scenarios"]:
    f = OUT / f"{name}-e2e.json"
    if not f.exists():
        bad.append(f"{name}: no result file {f}")
        continue
    data = json.loads(f.read_text(encoding="utf8"))
    rows = data.get("results") or data.get("scenarios") or []
    if not rows:
        bad.append(f"{name}: no results")
    for r in rows:
        if r.get("status") != "Passed":
            bad.append(f"{name}: {r.get('id')} {r.get('title') or r.get('goal')} -> {r.get('status')} {r.get('note', '')}")
    print(f"{name}: {len(rows)} results")
print("\n".join(bad) if bad else "all Passed")
sys.exit(1 if bad else 0)
