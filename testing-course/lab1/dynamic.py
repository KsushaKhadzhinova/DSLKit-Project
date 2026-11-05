import html, json
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).parent
shots = root.parent / "screens"
base = "http://localhost:5173"
res = {}


def fill(page, name="  Анна Иванова  ", email="anna@example.com"):
    page.fill("#name", name); page.fill("#email", email)
    page.select_option("#notation", index=1); page.fill("#team", "5"); page.check("#consent")


def records(page):
    return json.loads(page.evaluate("localStorage.getItem('dslkit.waitlist')") or "[]")


def text_png(ctx, name, text):
    p = ctx.new_page(); p.set_viewport_size({"width": 900, "height": 300})
    p.set_content("<body style='margin:0;background:#1e1e1e'><pre style='color:#ddd;font:14px Consolas,monospace;padding:16px;margin:0;white-space:pre-wrap'>" + html.escape(text) + "</pre></body>")
    p.screenshot(path=str(shots / name), full_page=True); p.close()


with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge")

    ctx = b.new_context(viewport={"width": 1280, "height": 800}); page = ctx.new_page()
    page.goto(base + "/"); fill(page)
    page.locator("#waitlist").screenshot(path=str(shots / "11-uc-main-filled.png"))
    page.click("#waitlist-form button[type=submit]"); page.wait_for_url("**/thanks.html")
    rec = records(page)
    res["main"] = {"url": page.url.replace(base, ""), "count": len(rec), "name": rec[0]["name"], "fields": sorted(rec[0])}
    text_png(ctx, "12-uc-storage-record.png", "localStorage['dslkit.waitlist'] после отправки:\n" + json.dumps(rec, ensure_ascii=False, indent=2))

    page.goto(base + "/"); page.click("#waitlist-form button[type=submit]")
    res["empty"] = {"url": page.url.replace(base, ""), "visible_errors": page.locator("#waitlist-form [id$=-error]:visible").count(),
                    "focus": page.evaluate("document.activeElement.id"), "records": len(records(page))}
    page.fill("#name", "Анна"); page.locator("#name").blur()
    res["fix_name"] = {"name_error_visible": page.locator("#name-error").is_visible()}

    page.goto(base + "/"); fill(page); page.click("#waitlist-form button[type=submit]"); page.wait_for_url("**/thanks.html")
    res["duplicate"] = {"count": len(records(page))}

    ctx2 = b.new_context(viewport={"width": 1280, "height": 800}); ctx2.add_init_script("Storage.prototype.setItem = function(){ throw new DOMException('quota','QuotaExceededError') }")
    q = ctx2.new_page(); q.goto(base + "/"); fill(q); q.click("#waitlist-form button[type=submit]"); q.wait_for_url("**/thanks.html")
    res["storage_failure"] = {"url": q.url.replace(base, ""), "count": len(records(q))}
    q.screenshot(path=str(shots / "13-uc-storage-failure.png"))
    b.close()
(root / "dynamic-results.json").write_text(json.dumps(res, ensure_ascii=False, indent=2), encoding="utf8")
print(json.dumps(res, ensure_ascii=False))
