"""Accessibility check with axe-core: index, editor, dashboard and sign-in, in the light and the dark theme.

Fails (exit 1) when any page has a violation of impact serious or critical. Writes axe-e2e.json to E2E_OUT.
Needs the site on :5173 (or the address in the first argument) and `npm ci` (axe-core is read from node_modules).
"""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
from e2e_env import OUT, SHOTS, launch

base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
AXE = (Path(__file__).resolve().parents[2] / "node_modules" / "axe-core" / "axe.min.js").read_text(encoding="utf8")
PAGES = [
    ("index", "/", False),
    ("editor", "/app/editor.html?template=idef0&tl=en", True),
    ("dashboard", "/app/dashboard.html", True),
    ("sign-in", "/app/login.html", False),
]
BAD = {"serious", "critical"}
results = []

SIGNED_IN = """() => { try { localStorage.setItem('dslkit.tour-done', 'true'); if (localStorage.getItem('dslkit.accounts') === null) {
    localStorage.setItem('dslkit.accounts', JSON.stringify([{ id: 'e2e0000000000001', name: 'Test User', email: 'e2e@example.com', salt: '00', hash: '00', iterations: 1, role: 'user' }]));
    localStorage.setItem('dslkit.session', JSON.stringify({ userId: 'e2e0000000000001' }));
    localStorage.setItem('dslkit.seeded.e2e0000000000001', 'true'); } } catch (e) { /* storage unavailable */ } }"""

with sync_playwright() as p:
    b = launch(p)
    for theme in ("light", "dark"):
        for name, path, signed_in in PAGES:
            ctx = b.new_context(viewport={"width": 1366, "height": 900}, color_scheme=theme)
            ctx.add_init_script(f"(() => {{ try {{ localStorage.setItem('theme', '{theme}'); }} catch (e) {{ /* storage unavailable */ }} }})()")
            if signed_in:
                ctx.add_init_script("(" + SIGNED_IN + ")()")
            page = ctx.new_page()
            page.goto(base + path)
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(700)
            actual = page.evaluate("document.documentElement.dataset.theme || ''")
            page.evaluate(AXE)
            raw = page.evaluate("axe.run(document, { resultTypes: ['violations'] }).then((r) => r.violations)")
            found = [
                {"id": v["id"], "impact": v["impact"], "help": v["help"], "nodes": [n["target"] for n in v["nodes"][:5]]}
                for v in raw
                if v["impact"] in BAD
            ]
            status = "Passed" if not found and actual == theme else "Failed"
            note = json.dumps(found, ensure_ascii=False)[:1500] if found else ("" if actual == theme else f"theme is {actual!r}, expected {theme!r}")
            results.append({"id": f"AX-{name}-{theme}", "kind": "axe", "title": f"{name} page, {theme} theme: no serious or critical violations", "status": status, "note": note})
            if status == "Failed":
                SHOTS.mkdir(parents=True, exist_ok=True)
                page.screenshot(path=str(SHOTS / f"axe-{name}-{theme}.png"))
            ctx.close()
    b.close()

json.dump({"results": results}, open(OUT / "axe-e2e.json", "w", encoding="utf8"), ensure_ascii=False, indent=2)
for r in results:
    print(r["status"], r["id"], r["note"])
sys.exit(1 if any(r["status"] != "Passed" for r in results) else 0)
