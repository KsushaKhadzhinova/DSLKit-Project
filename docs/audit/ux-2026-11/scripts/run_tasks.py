"""Driver: runs every task segment of tasks_body.py in its own try/except so one crash does not lose the rest.
Usage: python run_tasks.py <engine edge|firefox> <lang ru|en> <device desktop|mobile> <name> [T1 T2 ...]"""
import re
import sys
import textwrap
import traceback
from pathlib import Path

body = (Path(__file__).parent / "tasks_body.py").read_text(encoding="utf-8")
only = sys.argv[5:]
head, rest = body.split("with sync_playwright() as p:\n", 1)
rest, trailer = rest.split("    t_all = ", 1)
trailer = "t_all = " + trailer
segs = re.split(r"\n    # ---- ", rest)
setup = segs[0]
g = {"__name__": "__main__", "__file__": __file__}
exec(compile(head, "head", "exec"), g)
from playwright.sync_api import sync_playwright  # noqa: E402

p = sync_playwright().start()
g["p"] = p
exec(compile(textwrap.dedent(setup), "setup", "exec"), g)
for seg in segs[1:]:
    tid = seg.split()[0]
    if only and not any(tid.startswith(o) for o in only):
        continue
    try:
        exec(compile(textwrap.dedent("    # ---- " + seg), tid, "exec"), g)
    except Exception:  # noqa: BLE001
        msg = traceback.format_exc().splitlines()[-1][:200]
        print("SEGMENT FAILED", tid, msg)
        (g["Task"].ALL[-1].friction.append(f"SCRIPT/SEGMENT ABORTED: {msg}") if g["Task"].ALL else None)
        g["errs"].append("segment failed " + tid)
import json
(g["LOGS"] / f"{g['name']}.json").write_text(json.dumps({"tag": g["tag"], "tasks": [x.dump() for x in g["Task"].ALL], "errors": g["errs"][:40], "dialogs": g["dialogs"]}, ensure_ascii=False, indent=1), encoding="utf-8")
print("done")
