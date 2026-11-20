"""End-to-end check of rotation and aspect ratio in Edge and Firefox: rotates a context between portrait and landscape devices,
asserts no horizontal scroll, visible 44 px controls and kept state, takes screenshots. Writes orientation-e2e.json."""
import json
import sys
from playwright.sync_api import sync_playwright
from e2e_env import OUT, SHOTS, launch

base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
results = []
PAGES = ["/index.html", "/app/dashboard.html", "/app/editor.html", "/app/welcome.html", "/app/docs.html", "/app/login.html", "/app/register.html"]
PAIRS = [("iPhone 13", "iPhone 13 landscape"), ("iPad (gen 7)", "iPad (gen 7) landscape"), ("Pixel 7", "Pixel 7 landscape"), ("Galaxy Z Fold 6", "Galaxy Z Fold 6 landscape")]
SIZES = {"square": (800, 800), "ultrawide": (2560, 1080), "ultrawide-3440": (3440, 1440), "narrow-split": (320, 900), "folded": (280, 653), "fold-unfolded": (673, 841), "fold-inner": (1768, 2208)}
OVERFLOW = "document.documentElement.scrollWidth - document.documentElement.clientWidth"
STATE = "() => { const i = document.querySelector('.code__input'); return [i.selectionStart, i.selectionEnd, i.value] }"


def check(id_, title, fn):
    try:
        fn()
        results.append({"id": id_, "kind": "e2e", "title": title, "status": "Passed", "note": ""})
    except Exception as e:  # noqa: BLE001
        results.append({"id": id_, "kind": "e2e", "title": title, "status": "Failed", "note": " ".join(str(e).splitlines()[:8])[:600]})


def yes(v, msg):
    if not v:
        raise AssertionError(msg)


def context(browser, engine, device=None, size=None):
    """A context for a Playwright device or a plain size; Firefox has no isMobile, so it keeps the touch and the size only."""
    options = dict(device) if device else {"viewport": {"width": size[0], "height": size[1]}}
    if engine == "firefox":
        options.pop("is_mobile", None)
    options["locale"] = "ru-RU"
    ctx = browser.new_context(**options)
    ctx.add_init_script("try{localStorage.setItem('dslkit.tour-done','true')}catch(e){}")
    return ctx


def small_targets(page):
    """Controls under 44 px; the avatar is 36 px but its ::after widens the hit area to 44 px (editor.css), so it is not counted."""
    return page.evaluate(
        """() => [...document.querySelectorAll('button, a[href], [role=button], input:not([type=hidden]), select, summary')]
        .filter(e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight && !e.closest('[hidden]'); })
        .filter(e => { const r = e.getBoundingClientRect(); return Math.min(r.width, r.height) < 43.5 && !e.matches('.editor-toolbar__avatar') && !(e.tagName === 'A' && e.closest('p, li, footer, .docs-content')); })
        .map(e => (e.className || e.tagName) + ':' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height)).slice(0, 5)"""
    )


def visit(page, url):
    """Open a page; a page that does not load is a failed check, not a crash of the whole run."""
    try:
        page.goto(url, wait_until="commit", timeout=15000)
        page.wait_for_load_state("load", timeout=5000)
        page.wait_for_timeout(300)
    except Exception as e:  # noqa: BLE001
        raise AssertionError(f"не открылась {url}: {str(e).splitlines()[0][:120]}") from e


def no_overflow(page):
    yes(page.evaluate(OVERFLOW) <= 0, f"overflow {page.evaluate(OVERFLOW)}")


with sync_playwright() as p:
    for engine in ("chromium", "firefox"):
        tag = "edge" if engine == "chromium" else "firefox"
        try:
            b = launch(p) if engine == "chromium" else p.firefox.launch()
        except Exception as e:  # noqa: BLE001  Firefox is not installed on every machine: say so, do not fail the run
            results.append({"id": f"ORI-{tag}-launch", "kind": "e2e", "title": f"{tag}: браузер запускается", "status": "Skipped", "note": str(e).splitlines()[0][:200]})
            continue
        errors = []
        for portrait, landscape in PAIRS:
            name = portrait.replace(" ", "-").replace("(", "").replace(")", "")
            ctx = context(b, engine, device=p.devices[portrait])
            page = ctx.new_page()
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.set_default_timeout(20000)
            for path in PAGES:
                check(f"ORI-{tag}-{name}-{path}-portrait", f"{tag} {portrait} {path}: нет горизонтальной прокрутки", lambda: (visit(page, base + path), no_overflow(page)))
            page.goto(base + "/app/editor.html", wait_until="domcontentloaded")
            page.wait_for_timeout(500)
            if not page.locator(".code__input").is_visible():
                page.evaluate("() => document.querySelector('.editor-bottom-nav [data-view=\"code\"], [data-view=\"code\"]')?.click()")
                page.wait_for_timeout(300)
            page.fill(".code__input", "box A\nbox B\nA -> B\nbox C\nbox D\nC -> D")
            page.evaluate("() => { const i = document.querySelector('.code__input'); i.focus(); i.setSelectionRange(8, 14); }")
            before = page.evaluate(STATE)
            page.screenshot(path=str(SHOTS / f"orientation-{tag}-{name}-portrait.png"))
            vp = p.devices[landscape]["viewport"]
            page.set_viewport_size({"width": vp["width"], "height": vp["height"]})
            page.wait_for_timeout(500)
            check(f"ORI-{tag}-{name}-state", f"{tag} {portrait}: после поворота код и выделение сохранены", lambda: yes(before == page.evaluate(STATE), f"{before} != {page.evaluate(STATE)}"))
            check(f"ORI-{tag}-{name}-landscape-overflow", f"{tag} {landscape}: редактор без горизонтальной прокрутки", lambda: no_overflow(page))
            check(f"ORI-{tag}-{name}-landscape-mode", f"{tag} {landscape}: страница знает, что она в альбомной ориентации", lambda: yes(page.evaluate("document.documentElement.dataset.orientation") == "landscape", "orientation"))
            check(f"ORI-{tag}-{name}-landscape-panes", f"{tag} {landscape}: код и холст видны одновременно", lambda: yes(page.locator(".editor-panel").is_visible() and page.locator(".canvas").is_visible(), "одна из панелей скрыта"))
            check(f"ORI-{tag}-{name}-landscape-targets", f"{tag} {landscape}: видимые элементы управления не меньше 44 px", lambda: yes(not small_targets(page), str(small_targets(page))))
            page.screenshot(path=str(SHOTS / f"orientation-{tag}-{name}-landscape.png"))
            vp = p.devices[portrait]["viewport"]
            page.set_viewport_size({"width": vp["width"], "height": vp["height"]})
            page.wait_for_timeout(400)
            check(f"ORI-{tag}-{name}-back", f"{tag} {portrait}: после обратного поворота состояние то же", lambda: yes(before == page.evaluate(STATE), "state"))
            ctx.close()
        for label, size in SIZES.items():
            ctx = context(b, engine, size=size)
            page = ctx.new_page()
            page.on("pageerror", lambda e: errors.append(str(e)))
            for path in PAGES:
                check(f"ORI-{tag}-{label}-{path}", f"{tag} {label} {size[0]}x{size[1]} {path}: нет горизонтальной прокрутки", lambda: (visit(page, base + path), no_overflow(page)))
            page.goto(base + "/app/editor.html", wait_until="domcontentloaded")
            page.wait_for_timeout(400)
            page.screenshot(path=str(SHOTS / f"orientation-{tag}-{label}.png"))
            ctx.close()
        check(f"ORI-{tag}-errors", f"{tag}: нет ошибок скриптов", lambda: yes(not errors, str(errors[:3])))
        b.close()

json.dump({"results": results}, open(OUT / "orientation-e2e.json", "w", encoding="utf8"), ensure_ascii=False, indent=2)
failed = [r for r in results if r["status"] == "Failed"]
for r in failed:
    print(r["id"], "Failed", r["title"], "|", r["note"])
print({"total": len(results), "passed": len(results) - len(failed), "failed": len(failed)})
sys.exit(1 if failed else 0)
