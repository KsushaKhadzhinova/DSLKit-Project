import html, subprocess, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).parent
out = root / "screens"
out.mkdir(exist_ok=True)
base = "http://localhost:5173"


def console_png(page, name, cmd):
    text = subprocess.run(cmd, shell=True, capture_output=True, text=True, encoding="utf8", cwd=root.parent).stdout
    page.set_content(
        "<body style='margin:0;background:#1e1e1e'><pre style='color:#ddd;font:14px Consolas,monospace;padding:16px;margin:0;white-space:pre-wrap;width:1000px'>"
        + html.escape(f"> {cmd}\n\n{text}") + "</pre></body>")
    page.screenshot(path=str(out / name), full_page=True)


with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge")
    page = b.new_page(viewport={"width": 1280, "height": 800})
    page.goto(base + "/"); page.screenshot(path=str(out / "01-home.png"))
    page.goto(base + "/en/"); page.screenshot(path=str(out / "02-home-en.png"))
    page.goto(base + "/#waitlist-form")
    page.click("#waitlist-form button[type=submit]")
    page.locator("#waitlist").screenshot(path=str(out / "03-form-errors.png"))
    page.fill("#name", "Анна Иванова"); page.fill("#email", "anna@example.com")
    page.select_option("#notation", index=1); page.fill("#team", "5"); page.check("#consent")
    page.locator("#waitlist").screenshot(path=str(out / "04-form-filled.png"))
    page.click("#waitlist-form button[type=submit]")
    page.wait_for_timeout(800)
    page.screenshot(path=str(out / "05-form-submitted.png"))
    page.goto(base + "/app/editor.html"); page.wait_for_timeout(800)
    page.screenshot(path=str(out / "06-editor.png"))
    page.goto(base + "/app/dashboard.html"); page.wait_for_timeout(500)
    page.screenshot(path=str(out / "07-dashboard.png"))
    page.goto(base + "/no-such-page"); page.screenshot(path=str(out / "08-404.png"))
    c = b.new_page(viewport={"width": 1040, "height": 400})
    console_png(c, "09-console-lab2.png", "node testing-course/lab2/run.js")
    console_png(c, "10-console-lab3.png", "node testing-course/lab3/run.js")
    b.close()
print(sorted(x.name for x in out.iterdir()))
