"""Lab 5 client (Vite, port 5178) against the lab 3 API (port 3000, temporary SQLite), in Firefox and Edge at 1366 and 390 px.
Needs TESTPW in the environment (a random test password, never printed)."""
import time
from playwright.sync_api import sync_playwright
from evcommon import *

URL = "http://localhost:5178"
PW = need("TESTPW")
results = []

with sync_playwright() as p:
    for bname in BROWSERS:
        for width, height in WIDTHS:
            steps, watch = [], Watch()
            b = launch(p, bname)
            ctx = b.new_context(viewport={"width": width, "height": height})
            page = ctx.new_page()
            watch.attach(page)
            page.on("dialog", lambda d: d.accept())
            email = f"ev{bname}{width}{int(time.time())}@example.test"
            title = f"Evidence {bname} {width}"
            ok = True
            try:
                page.goto(URL)
                page.wait_for_selector("#auth-email")
                page.get_by_role("button", name="Нужна регистрация").click()
                page.fill("#auth-email", email)
                page.fill("#auth-password", PW)
                page.get_by_role("button", name="Зарегистрироваться").click()
                page.wait_for_selector("#new-title", timeout=15000)
                steps.append("register + sign in: ok")
                page.get_by_role("article").first.wait_for(timeout=15000)
                page.fill("#new-title", title)
                page.fill("#new-code", "block A -> block B")
                page.get_by_role("button", name="Добавить").click()
                page.get_by_text(title, exact=True).first.wait_for(timeout=10000)
                steps.append("create diagram: ok")
                page.get_by_role("button", name=f"Изменить: {title}").click()
                page.get_by_label("Новое название").fill(title + " edited")
                page.get_by_role("button", name=f"Сохранить: {title}").click()
                page.get_by_text(title + " edited", exact=True).first.wait_for(timeout=10000)
                steps.append("edit diagram: ok")
                page.fill("#search", "edited")
                page.wait_for_timeout(1500)
                n = page.get_by_role("article").count()
                steps.append(f"search 'edited': {n} card(s)")
                ok = ok and n == 1
                page.fill("#search", "")
                page.wait_for_timeout(1500)
                more = page.get_by_role("button", name="Загрузить ещё")
                if more.count():
                    before = page.get_by_role("article").count()
                    more.first.click()
                    page.wait_for_function("n => document.querySelectorAll('article').length > n", arg=before, timeout=10000)
                    steps.append(f"load more: {before} -> {page.get_by_role('article').count()} cards")
                else:
                    steps.append("load more: button not shown (list shorter than a page)")
                    ok = False
                page.screenshot(path=str(OUT / "lab-05" / f"{bname}-{width}.png"), full_page=False)
                page.fill("#search", "edited")
                page.wait_for_timeout(1500)
                page.get_by_role("button", name=f"Удалить: {title} edited").click()
                page.wait_for_function("() => document.querySelectorAll('article').length === 0", timeout=10000)
                steps.append("delete diagram: ok")
            except Exception as e:
                ok = False
                steps.append("FAILED: " + str(e).splitlines()[0][:200])
                page.screenshot(path=str(OUT / "lab-05" / f"{bname}-{width}-failure.png"))
            results.append({"browser": bname, "width": width, "ok": ok, "steps": steps, **watch.summary()})
            print(bname, width, ok, steps)
            b.close()
save(results, "lab-05")
