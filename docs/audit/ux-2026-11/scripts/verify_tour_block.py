"""Check whether the first-run tour card blocks menu actions (Clarify, language switch)."""
import sys, time
sys.path.insert(0, __import__("os").path.dirname(__import__("os").path.abspath(__file__)))
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ux import launch, new_ctx, BASE, SIGN_IN
from playwright.sync_api import sync_playwright

def run(p, tour_done):
    b = launch(p, "edge")
    ctx = new_ctx(b, lang="ru")
    init = SIGN_IN + ("\nlocalStorage.setItem('dslkit.tour-done','1');" if tour_done else "")
    ctx.add_init_script(init)
    pg = ctx.new_page()
    pg.goto(BASE + "/app/editor.html")
    pg.wait_for_timeout(1500)
    pg.locator("summary", has_text="Ещё действия").first.click(timeout=5000)
    pg.wait_for_timeout(300)
    res = {}
    for label in ["Уточнить и дополнить", "Настройки"]:
        t = time.time()
        try:
            pg.get_by_text(label, exact=True).first.click(timeout=3000)
            res[label] = "clicked %.2fs" % (time.time() - t)
        except Exception as e:
            res[label] = "BLOCKED: " + str(e).split("\n")[0][:120]
        pg.keyboard.press("Escape")
        pg.wait_for_timeout(200)
    b.close()
    return res

with sync_playwright() as p:
    print("tour shown  :", run(p, False))
    print("tour skipped:", run(p, True))
