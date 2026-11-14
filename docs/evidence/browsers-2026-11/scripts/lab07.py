"""Lab 7 (Socket.IO chat, port 3007, in-memory history): two separate contexts, join a room, room message, private message."""
from playwright.sync_api import sync_playwright
from evcommon import *

URL = "http://localhost:3007"
results = []
with sync_playwright() as p:
    for bname in BROWSERS:
        for width, height in WIDTHS:
            watch, steps, ok = Watch(), [], True
            b = launch(p, bname)
            ca = b.new_context(viewport={"width": width, "height": height})
            cb = b.new_context(viewport={"width": width, "height": height})
            A, B = ca.new_page(), cb.new_page()
            watch.attach(A); watch.attach(B)
            tag = f"{bname[:2]}{width}"
            try:
                for page, name in ((A, f"alice-{tag}"), (B, f"bob-{tag}")):
                    page.goto(URL)
                    page.fill("#username", name)
                    page.click("#login button[type=submit]")
                    page.wait_for_selector("#workspace:not([hidden])", timeout=10000)
                steps.append("two contexts connected (login): ok")
                room = f"room-{tag}"
                for page in (A, B):
                    page.fill("#room", room)
                    page.press("#room", "Enter")
                    page.wait_for_function("document.querySelector('#members').children.length > 0 && !document.querySelector('#members').textContent.includes('Nobody')", timeout=10000)
                A.wait_for_function(f"document.querySelector('#members').textContent.includes('bob-{tag}')", timeout=10000)
                steps.append("both joined the room, alice sees bob in members: ok")
                A.fill("#text", "hello from alice")
                A.press("#text", "Enter")
                B.get_by_text("hello from alice").first.wait_for(timeout=10000)
                steps.append("room message alice -> bob arrived: ok")
                B.screenshot(path=str(OUT / "lab-07" / f"{bname}-{width}.png"))
                A.get_by_label(f"Write a private message to bob-{tag}").first.click()
                A.fill("#text", "secret for bob")
                A.press("#text", "Enter")
                B.get_by_text("secret for bob").first.wait_for(timeout=10000)
                steps.append("private message alice -> bob arrived: ok")
                B.fill("#text", "reply from bob")
                B.press("#text", "Enter")
                A.get_by_text("reply from bob").first.wait_for(timeout=10000)
                steps.append("room message bob -> alice arrived: ok")
                A.screenshot(path=str(OUT / "lab-07" / f"{bname}-{width}-alice.png"))
            except Exception as e:
                ok = False
                steps.append("FAILED: " + str(e).splitlines()[0][:200])
                A.screenshot(path=str(OUT / "lab-07" / f"{bname}-{width}-failure.png"))
            results.append({"browser": bname, "width": width, "ok": ok, "steps": steps, **watch.summary()})
            print(bname, width, ok, steps)
            b.close()
save(results, "lab-07")
