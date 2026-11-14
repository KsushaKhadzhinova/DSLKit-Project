"""Lab 8 stack (Nginx on 127.0.0.1:8080 proxying /api to the backend, PostgreSQL), in Firefox and Edge at 1366 and 390 px.
Needs TESTPW in the environment (a random test password, never printed)."""
import os
import time
from playwright.sync_api import sync_playwright
from evcommon import *

URL = "http://127.0.0.1:8080"
PW = need("TESTPW")
results = []

with sync_playwright() as p:
    for bname in BROWSERS:
        for width, height in WIDTHS:
            if os.environ.get("ONLY") and os.environ["ONLY"] != f"{bname}:{width}":
                continue
            steps, watch = [], Watch()
            b = launch(p, bname)
            ctx = b.new_context(viewport={"width": width, "height": height})
            page = ctx.new_page()
            watch.attach(page)
            api = []
            page.on("request", lambda r: api.append(r.url) if "127.0.0.1:8080/api/" in r.url else None)
            page.on("dialog", lambda d: d.accept())
            email = f"e8{bname}{width}{int(time.time())}@example.test"
            title = f"Evidence {bname} {width} {int(time.time())}"
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
                page.fill("#new-title", title)
                page.fill("#new-code", "block A -> block B")
                page.get_by_role("button", name="Добавить").click()
                page.get_by_text(title, exact=True).first.wait_for(timeout=10000)
                steps.append("create diagram: ok")
                page.get_by_role("button", name=f"Изменить: {title}").click()
                page.get_by_label("Новое название").fill(title + " edited")
                # The list answers at once and the server answer comes later: wait for it, a reload before it aborts the request.
                with page.expect_response(lambda r: r.request.method in ("PATCH", "PUT") and "/api/" in r.url) as saved:
                    page.get_by_role("button", name=f"Сохранить: {title}").click()
                steps.append(f"save answered {saved.value.status}")
                page.get_by_text(title + " edited", exact=True).first.wait_for(timeout=10000)
                steps.append("edit diagram: ok")
                page.reload()
                page.get_by_text(title + " edited", exact=True).first.wait_for(timeout=10000)
                steps.append("reload keeps the session and the diagram (data came from PostgreSQL through /api): ok")
                page.screenshot(path=str(OUT / "lab-08" / f"{bname}-{width}.png"), full_page=False)
                page.get_by_role("button", name=f"Удалить: {title} edited").click()
                page.get_by_text(title + " edited", exact=True).wait_for(state="detached", timeout=10000)
                steps.append("delete diagram: ok")
                steps.append(f"{len(api)} requests went to http://127.0.0.1:8080/api/ (Nginx proxy)")
                ok = ok and len(api) > 0
            except Exception as e:
                ok = False
                steps.append("FAILED: " + str(e).splitlines()[0][:200])
                steps.append("body after failure: " + " | ".join(page.inner_text("body").split(chr(10)))[-300:])
                page.screenshot(path=str(OUT / "lab-08" / f"{bname}-{width}-failure.png"))
            results.append({"browser": bname, "width": width, "ok": ok, "steps": steps, **watch.summary()})
            print(bname, width, ok, steps)
            b.close()
if not os.environ.get("ONLY"):
    save(results, "lab-08")
