"""Properties panel and PlantUML/Mermaid export in Edge. Writes properties-e2e.json. Needs the site on :5173."""
import json
import sys
from playwright.sync_api import sync_playwright
from e2e_env import OUT, SHOTS, launch

base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
results = []
errors = []


def check(id_, title, fn):
    try:
        fn()
        results.append({"id": id_, "kind": "properties", "title": title, "status": "Passed", "note": ""})
    except Exception as e:  # noqa: BLE001
        results.append({"id": id_, "kind": "properties", "title": title, "status": "Failed", "note": " ".join(str(e).splitlines()[:6])[:500]})


def eq(a, b, msg=""):
    if a != b:
        raise AssertionError(f"{msg} expected {b!r}, got {a!r}")


def yes(v, msg):
    if not v:
        raise AssertionError(msg)


with sync_playwright() as p:
    b = launch(p)
    ctx = b.new_context(viewport={"width": 1366, "height": 900}, accept_downloads=True)
    ctx.add_init_script("(" + """() => { try { localStorage.setItem('dslkit.tour-done', 'true'); if (localStorage.getItem('dslkit.accounts') === null) {
        localStorage.setItem('dslkit.accounts', JSON.stringify([{ id: 'e2e0000000000001', name: 'Test User', email: 'e2e@example.com', salt: '00', hash: '00', iterations: 1, role: 'user' }]));
        localStorage.setItem('dslkit.session', JSON.stringify({ userId: 'e2e0000000000001' }));
        localStorage.setItem('dslkit.seeded.e2e0000000000001', 'true'); } } catch (e) { /* storage unavailable */ } }""" + ")()")
    page = ctx.new_page()
    page.set_default_timeout(8000)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" and "kroki" not in m.text.lower() and "Failed to load resource" not in m.text else None)
    code = lambda: page.evaluate("[...document.querySelectorAll('.code__line code')].map(e=>e.textContent).join('\\n')")  # noqa: E731

    def load(template, lang="en"):
        path = "/en/app/editor.html" if lang == "en" else "/app/editor.html"
        page.goto(f"{base}{path}?template={template}")
        page.wait_for_selector(".canvas__remote svg")
        page.wait_for_timeout(500)

    def open_export():
        """The export buttons sit in the sub-menu "Export" of the editor menu: open both."""
        if not page.locator(".editor-menu").first.evaluate("e => e.open"):
            page.click(".editor-menu__summary")
        if not page.locator(".editor-menu__sub").first.evaluate("e => e.open"):
            page.click(".editor-menu__subsummary")

    def pick(block_id):
        page.locator(f'.canvas__remote .notation__node[data-id="{block_id}"]').first.click()
        page.wait_for_timeout(300)

    def select_and_show():
        load("dfd")
        yes(page.locator(".props").is_hidden(), "the panel must be hidden before a pick")
        pick("2")
        yes(page.locator(".props").is_visible(), "the panel did not open")
        eq(page.input_value("#props-label"), "Take payment")
        eq(page.input_value("#props-kind"), "process")
        eq(page.inner_text("#props-id"), "2")

    check("PP-01", "Picking a block opens the panel with its id, label and kind", select_and_show)

    def change_label():
        load("dfd")
        pick("2")
        page.fill("#props-label", "Charge card")
        page.press("#props-label", "Enter")
        page.locator("#props-kind").focus()
        page.wait_for_timeout(600)
        yes('process 2 "Charge card"' in code(), code())
        yes("Charge card" in page.locator(".canvas__remote").inner_text(), "the drawing did not follow the code")
        yes("changed" in page.inner_text(".props__message"), page.inner_text(".props__message"))

    check("PP-02", "Changing the label rewrites the code and the drawing", change_label)

    def change_kind():
        load("dfd")
        pick("Bank")
        page.select_option("#props-kind", "store")
        page.wait_for_timeout(600)
        yes("store Bank" in code(), code())

    check("PP-03", "Changing the kind rewrites the keyword in the code", change_kind)

    def refused_kind():
        load("dfd")
        pick("1")
        before = code()
        page.select_option("#props-kind", "entity")
        page.wait_for_timeout(500)
        eq(code(), before, "the code must not change")
        yes("Not changed" in page.inner_text(".props__message"), page.inner_text(".props__message"))

    check("PP-04", "A change the strict gate refuses leaves the code and says why", refused_kind)

    def keyboard():
        load("dfd")
        pick("2")
        page.locator("#props-label").focus()
        page.keyboard.press("Escape")
        yes(page.evaluate("document.activeElement.classList.contains('notation__node')"), "Escape must return the focus to the block")
        eq(page.get_attribute(".props", "aria-labelledby"), "props-heading")

    check("PP-05", "Keyboard: Escape returns to the board; the panel is a labelled region", keyboard)

    def export_formats():
        load("uml-sequence")
        for button, ext, start in (("puml", ".puml", "@startuml"), ("mmd", ".mmd", "sequenceDiagram")):
            yes(page.get_attribute(f'[data-export="{button}"]', "aria-disabled") == "false", f"{button} is switched off")
            open_export()
            with page.expect_download() as info:
                page.click(f'[data-export="{button}"]')
            download = info.value
            yes(download.suggested_filename.endswith(ext), download.suggested_filename)
            text = open(download.path(), encoding="utf8").read()
            yes(text.startswith(start), text[:40])

    check("PP-06", "PlantUML and Mermaid files download with the right extension and content", export_formats)

    def export_refused():
        load("idef0")
        eq(page.get_attribute('[data-export="puml"]', "aria-disabled"), "true")
        open_export()
        yes("no exact mapping" in page.inner_text("[data-export-note]"), page.inner_text("[data-export-note]"))
        open_export()
        page.click('[data-export="mmd"]', force=True)
        page.wait_for_timeout(300)
        yes("no exact mapping" in page.inner_text(".canvas__status"), page.inner_text(".canvas__status"))

    check("PP-07", "A notation without a mapping is refused with a clear message", export_refused)

    def russian_and_dark():
        load("dfd", "ru")
        pick("2")
        eq(page.inner_text("#props-heading"), "Свойства блока")
        page.evaluate("document.documentElement.dataset.theme = 'dark'")
        page.wait_for_timeout(200)
        page.screenshot(path=str(SHOTS / "properties-ru-dark.png"))
        page.evaluate("document.documentElement.dataset.theme = 'light'")
        page.screenshot(path=str(SHOTS / "properties-ru-light.png"))

    check("PP-08", "Russian page speaks Russian; both themes render the panel", russian_and_dark)

    def mobile():
        page.set_viewport_size({"width": 375, "height": 800})
        load("dfd")
        pick("2")
        yes(page.locator(".props").is_visible(), "the panel is not visible on a phone")
        width = page.evaluate("document.querySelector('.props').getBoundingClientRect().right")
        yes(width <= 376, f"the panel overflows: {width}")
        page.set_viewport_size({"width": 1366, "height": 900})

    check("PP-09", "The panel fits a phone width", mobile)

    check("PP-10", "No errors in the browser console", lambda: yes(not errors, errors[:3]))
    b.close()

json.dump({"results": results, "console_errors": errors}, open(OUT / "properties-e2e.json", "w", encoding="utf8"), ensure_ascii=False, indent=2)
failed = [r for r in results if r["status"] != "Passed"]
for r in results:
    print(r["id"], r["status"], r["note"])
sys.exit(1 if failed else 0)
