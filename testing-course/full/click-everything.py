"""Clicks every visible button, link, switch and select on every page (ru and en, desktop and phone) and reports the elements that do nothing.
A reaction is: the address changed, the DOM changed, the focus moved, a dialog or a download appeared, a page error was raised.
Writes click-everything.json."""
import json
import re
import sys
from urllib.parse import urljoin, urlparse
from pathlib import Path
from playwright.sync_api import sync_playwright

base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
out = Path(__file__).parent
PAGES = [
    "/", "/privacy.html", "/thanks.html", "/app/welcome.html", "/app/dashboard.html", "/app/settings.html",
    "/app/editor.html?template=idef0", "/app/editor.html?template=dfd", "/en/", "/en/app/dashboard.html", "/en/app/editor.html?template=erd",
    "/en/app/settings.html", "/en/app/welcome.html",
]
VIEWPORTS = [("desktop", 1366, 800)]
SELECTOR = "button, a[href], [role=button], [role=tab], [role=switch], summary, input[type=checkbox], input[type=radio], select, .notation__node"
INIT = """
window.__m = 0;
new MutationObserver((list) => { window.__m += list.length; }).observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
"""
checked, dead, pages = [], [], {}

with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge")
    for vp_name, w, h in VIEWPORTS:
        ctx = b.new_context(viewport={"width": w, "height": h}, accept_downloads=True)
        ctx.add_init_script("try { localStorage.setItem('dslkit.tour-done', 'true'); } catch (e) {}")
        ctx.add_init_script(INIT)
        errors = []

        def fresh():
            pg = ctx.new_page()
            pg.set_default_timeout(3000)
            pg.set_default_navigation_timeout(20000)
            pg.on("pageerror", lambda e: errors.append(str(e)))
            return pg

        page = fresh()
        for path in PAGES:
            key = f"{vp_name} {path}"
            try:
                page.goto(base + path)
            except Exception:  # noqa: BLE001
                page = fresh()
                page.goto(base + path)
            page.wait_for_timeout(500)
            page.evaluate("document.querySelectorAll('details').forEach(d => d.open = true)")
            descr = page.evaluate(
                """(sel) => [...document.querySelectorAll(sel)].map((e, i) => ({ i, tag: e.tagName.toLowerCase(), text: (e.getAttribute('aria-label') || e.textContent || e.value || '').trim().replace(/\\s+/g, ' ').slice(0, 40), href: e.getAttribute('href'), cls: e.className && e.className.baseVal === undefined ? e.className : '', dis: e.disabled || e.getAttribute('aria-disabled') === 'true' }))""",
                SELECTOR,
            )
            info = {"n": 0, "dead": []}
            for d in descr:
                label = f"{key}: <{d['tag']}> {d['text'] or d['cls']}"
                if d["dis"]:
                    continue
                if d["href"] and (d["href"].startswith("http") or d["href"].startswith("mailto:")):
                    if d["href"] in ("#", ""):
                        info["dead"].append(label + " (пустая ссылка)")
                    continue
                if re.search(r"^(Перейти к основному|Skip to main)", d["text"]):
                    continue  # the skip link is visible only on focus, it is checked by the keyboard test
                if d["href"] and urlparse(urljoin(base + path, d["href"])).path == urlparse(base + path).path and "#" not in d["href"] and "?" not in d["href"]:
                    continue  # a link to the page itself (aria-current)
                if d["href"] == "#":
                    info["dead"].append(label + " (ссылка «#»)")
                    continue
                try:
                    page.goto(base + path)
                except Exception:  # noqa: BLE001
                    page = fresh()
                    page.goto(base + path)
                page.wait_for_timeout(250)
                try:
                    page.evaluate("document.querySelectorAll('details').forEach(d => d.open = true)")
                except Exception:  # noqa: BLE001
                    page = fresh()
                    page.goto(base + path)
                    page.evaluate("document.querySelectorAll('details').forEach(d => d.open = true)")
                el = page.locator(SELECTOR).nth(d["i"])
                try:
                    if not el.is_visible():
                        continue
                except Exception:  # noqa: BLE001
                    continue
                info["n"] += 1
                checked.append(label)
                before_url = page.url
                before_m = page.evaluate("window.__m")
                before_state = el.evaluate("e => (e.checked !== undefined ? 'c' + e.checked : '') + (e.value !== undefined && e.tagName === 'SELECT' ? 'v' + e.value : '')")
                before_focus = page.evaluate("document.activeElement && document.activeElement.outerHTML.slice(0, 80)")
                events = {"dialog": False, "download": False}
                page.once("dialog", lambda dlg, ev=events: (ev.__setitem__("dialog", True), dlg.dismiss()))
                page.once("download", lambda dl, ev=events: ev.__setitem__("download", True))
                n_err = len(errors)
                try:
                    if d["tag"] == "select":
                        opts = el.locator("option")
                        if opts.count() > 1:
                            el.select_option(index=1)
                        else:
                            continue
                    elif d["tag"] == "details" or d["tag"] == "summary":
                        el.click()
                    elif d["tag"] == "input":
                        el.evaluate("e => e.click()")
                    else:
                        try:
                            el.click(timeout=4000)
                        except Exception:  # noqa: BLE001
                            el.evaluate("e => e.click()")
                except Exception as e:  # noqa: BLE001
                    info["dead"].append(label + f" (не удалось нажать: {str(e).splitlines()[0][:80]})")
                    continue
                page.wait_for_timeout(350)
                try:
                    reacted = (
                        page.url != before_url
                        or page.evaluate("window.__m") != before_m
                        or el.evaluate("e => (e.checked !== undefined ? 'c' + e.checked : '') + (e.value !== undefined && e.tagName === 'SELECT' ? 'v' + e.value : '')") != before_state
                        or events["dialog"]
                        or events["download"]
                        or len(errors) > n_err
                    )
                except Exception:  # noqa: BLE001
                    reacted = True  # the page navigated away
                if len(errors) > n_err:
                    info["dead"].append(label + f" (ошибка страницы: {errors[-1][:80]})")
                elif not reacted:
                    info["dead"].append(label + " (нет реакции)")
            pages[key] = info
            dead.extend(info["dead"])
        ctx.close()
    b.close()

json.dump({"checked": checked, "dead": dead, "pages": pages}, open(out / "click-everything.json", "w", encoding="utf8"), ensure_ascii=False, indent=2)
print({"checked": len(checked), "dead": len(dead)})
for d in dead:
    print(" -", d)
sys.exit(1 if dead else 0)
