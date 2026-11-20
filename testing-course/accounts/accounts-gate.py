"""Fails (exit 1) when any row of the accounts-*.json results (E2E_OUT or this folder) is not Passed, or when a suite has no rows."""
import json
import sys
from acc_env import OUT

SUITES = ["isolation", "roles", "storage", "ai", "course"]
bad, total = [], 0
for name in SUITES:
    files = sorted(OUT.glob(f"accounts-{name}.json")) + sorted(OUT.glob(f"accounts-{name}-*.json"))
    if not files:
        bad.append(f"{name}: no result file in {OUT}")
        continue
    for f in files:
        rows = json.loads(f.read_text(encoding="utf8")).get("results", [])
        if not rows:
            bad.append(f"{f.name}: no results")
        total += len(rows)
        for r in rows:
            if r.get("status") != "Passed":
                bad.append(f"{f.name}: {r['id']} [{r.get('browser')}] {r.get('severity', '')} {r['title']} -> {r['status']} {r.get('note', '')[:200]}")
print(f"{total} rows checked")
print("\n".join(bad) if bad else "all Passed")
sys.exit(1 if bad else 0)
