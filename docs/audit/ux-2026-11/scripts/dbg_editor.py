import os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ux import launch, new_ctx, BASE, SIGN_IN
from playwright.sync_api import sync_playwright
out = []
with sync_playwright() as p:
    b = launch(p, "edge"); c = new_ctx(b, lang="ru"); c.add_init_script(SIGN_IN + "\nlocalStorage.setItem('dslkit.tour-done','1');"); pg = c.new_page()
    pg.goto(BASE + "/app/editor.html", timeout=20000); pg.wait_for_timeout(1500)
    for tour in ["tour shown"]:
        pg.locator("summary").nth(0).click(timeout=4000)
        pg.wait_for_timeout(300)
        out.append("summary opened: " + str(pg.evaluate("() => document.querySelector('summary').parentElement.open")))
        for label in ["Уточнить и дополнить", "Настройки"]:
            t = time.time()
            try:
                pg.get_by_text(label, exact=True).first.click(timeout=3000)
                out.append(f"{label}: clicked {time.time()-t:.2f}s")
            except Exception as e:
                out.append(f"{label}: BLOCKED " + str(e).split("\n")[0][:150])
            pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
            pg.locator("summary").nth(0).click(timeout=4000)
    print("\n".join(out), flush=True)
    os._exit(0)
