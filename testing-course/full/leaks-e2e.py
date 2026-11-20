"""Memory leak check of the editor and the dashboard in a real Chromium browser (Edge or the Playwright build). Writes leaks-e2e.json.

The page is used the way a person uses it, many times over: the panels of the activity bar are opened and closed, the notation
templates are switched, the dashboard dialogs are opened and cancelled. Before and after the cycles the garbage is collected and the
counters of the DevTools protocol are read (Memory.getDOMCounters: DOM nodes, event listeners, documents; Runtime.getHeapUsage:
the JavaScript heap). A page that cleans up after itself ends close to where it began; growth beyond the tolerance fails the check.

LEAK_CYCLES  how many times each action is repeated (default 50).
One browser at a time: the script opens a single browser and closes it at the end.
"""
import json
import os
import sys
from playwright.sync_api import sync_playwright
from e2e_env import OUT, answer, launch

base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
CYCLES = int(os.environ.get("LEAK_CYCLES") or 50)
WARMUP = 5  # the notation switch warms up through every notation once
# Tolerances: twice the largest growth measured over three runs of 50 cycles (nodes 32, listeners 0, heap 195 KB), never below the noise floor.
TOLERANCE = {"nodes": 100, "listeners": 20, "heapBytes": 1024 * 1024}
results = []
numbers = {}


def check(id_, title, fn):
    try:
        fn()
        results.append({"id": id_, "kind": "leak", "title": title, "status": "Passed", "note": ""})
    except Exception as e:  # noqa: BLE001
        results.append({"id": id_, "kind": "leak", "title": title, "status": "Failed", "note": " ".join(str(e).splitlines()[:12])[:700]})


def snapshot(page, cdp):
    """Collects the garbage twice, lets the page settle, and reads the counters of the browser."""
    for _ in range(2):
        cdp.send("HeapProfiler.collectGarbage")
        page.wait_for_timeout(150)
    dom = cdp.send("Memory.getDOMCounters")
    heap = cdp.send("Runtime.getHeapUsage")
    return {"documents": dom["documents"], "nodes": dom["nodes"], "listeners": dom["jsEventListeners"], "heapBytes": int(heap["usedSize"])}


def grow(name, page, cdp, cycle, rest=lambda: None, warmup=WARMUP):
    """Runs the warmup, takes the first snapshot, runs CYCLES times, takes the second one and records the difference.
    `rest` brings the page back to the same visible state before each snapshot, so the two are comparable."""
    for _ in range(warmup):
        cycle()
    rest()
    before = snapshot(page, cdp)
    for _ in range(CYCLES):
        cycle()
    rest()
    after = snapshot(page, cdp)
    diff = {key: after[key] - before[key] for key in before}
    numbers[name] = {"before": before, "after": after, "growth": diff, "cycles": CYCLES}
    print(f"{name}: growth {diff} over {CYCLES} cycles", flush=True)
    return diff


def within(name, diff):
    problems = [f"{key} grew by {diff[key]} (tolerance {TOLERANCE[key]})" for key in TOLERANCE if diff[key] > TOLERANCE[key]]
    # Documents are counted with the detached ones that are not collected yet: fewer is fine, more is a leaked document.
    if diff["documents"] > 0:
        problems.append(f"documents grew by {diff['documents']}")
    if problems:
        raise AssertionError(f"{name}: " + "; ".join(problems))


with sync_playwright() as p:
    b = launch(p)
    ctx = b.new_context(viewport={"width": 1366, "height": 800})
    # Pages of the application are for signed-in users; the starter projects are marked as already added.
    ctx.add_init_script("(" + """() => { try { if (localStorage.getItem('dslkit.accounts') === null) {
        localStorage.setItem('dslkit.accounts', JSON.stringify([{ id: 'e2e0000000000001', name: 'Test User', email: 'e2e@example.com', salt: '00', hash: '00', iterations: 1, role: 'user' }]));
        localStorage.setItem('dslkit.session', JSON.stringify({ userId: 'e2e0000000000001' }));
        localStorage.setItem('dslkit.tour-done', 'true');
        localStorage.setItem('dslkit.seeded.e2e0000000000001', 'true'); } } catch (e) { /* storage unavailable */ } }""" + ")()")
    page = ctx.new_page()
    page.set_default_timeout(8000)
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    cdp = ctx.new_cdp_session(page)
    cdp.send("Memory.getDOMCounters")

    page.goto(base + "/app/editor.html")
    page.wait_for_timeout(800)
    if page.locator(".tour").count() and page.locator(".tour").first.is_visible():
        page.click(".tour >> text=Пропустить")

    panels = ["files", "templates", "search", "git", "ai"]

    def panel_cycle():
        for name in panels:
            page.click(f'[data-panel="{name}"]')
            page.click(f'[data-panel="{name}"]')

    check("LEAK-01", f"Редактор: {CYCLES} раз открыть и закрыть панели (файлы, шаблоны, поиск, Git, AI), DOM и слушатели не растут", lambda: within("panels", grow("panels", page, cdp, panel_cycle)))

    page.click('[data-panel="templates"]')
    options = page.locator("[data-notation-select] option").count()
    state = {"i": 0}

    def notation_cycle():
        state["i"] = (state["i"] + 1) % options
        page.locator("[data-notation-select]").select_option(index=state["i"])
        page.wait_for_timeout(60)

    def notation_rest():
        state["i"] = 0
        page.locator("[data-notation-select]").select_option(index=0)
        page.wait_for_timeout(300)

    check("LEAK-02", f"Редактор: {CYCLES} раз переключить нотацию, DOM и слушатели не растут", lambda: within("notations", grow("notations", page, cdp, notation_cycle, notation_rest, warmup=options)))

    def run_cycle():
        page.click(".button--run", force=True)
        page.wait_for_timeout(60)

    check("LEAK-03", f"Редактор: {CYCLES} раз перерисовать диаграмму, DOM и слушатели не растут", lambda: within("render", grow("render", page, cdp, run_cycle)))

    # The dashboard: one project is saved from the editor, then its menu and the rename and delete dialogs are opened and cancelled.
    page.click('[data-action="save"]')
    page.wait_for_timeout(300)
    page.goto(base + "/app/dashboard.html")
    page.wait_for_timeout(600)
    cdp = ctx.new_cdp_session(page)
    cdp.send("Memory.getDOMCounters")

    def dialog_cycle():
        for act in ("rename", "remove"):
            answer(page, False)
            item = page.locator(".project-list__item[data-project]").first
            if not item.locator(f'[data-act="{act}"]').is_visible():
                item.locator(".project-card__menu").click()
            item.locator(f'[data-act="{act}"]').click()
            page.wait_for_timeout(60)

    def dialogs():
        yes_project = page.locator(".project-list__item[data-project]").count()
        if yes_project < 1:
            raise AssertionError("в списке нет проекта для проверки диалогов")
        return grow("dialogs", page, cdp, dialog_cycle)

    check("LEAK-04", f"Список проектов: {CYCLES} раз открыть и отменить диалоги переименования и удаления, DOM и слушатели не растут", lambda: within("dialogs", dialogs()))
    check("LEAK-05", "За время проверки в консоли страницы нет необработанных ошибок", lambda: (_ for _ in ()).throw(AssertionError(errors[:3])) if errors else None)
    b.close()

(OUT / "leaks-e2e.json").write_text(json.dumps({"numbers": numbers, "results": results}, ensure_ascii=False, indent=2), encoding="utf-8")
failed = [r for r in results if r["status"] != "Passed"]
for r in results:
    print(r["status"], r["id"], r["title"], r["note"])
sys.exit(1 if failed else 0)
