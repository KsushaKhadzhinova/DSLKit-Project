import sys, time
sys.path.insert(0, str(__import__("pathlib").Path(__file__).parent))
from ux import *

with sync_playwright() as p:
    b = launch(p)
    ctx = new_ctx(b, signed_in=False)
    errs = []
    pg = page(ctx, errs)
    t = time.time()
    pg.goto(BASE + "/")
    print("landing", round(time.time() - t, 1))
    pg.click("a.button--hero")
    pg.wait_for_timeout(1500)
    print(pg.url)
    shot(pg, "probe-editor-guest")
    print("tour:", pg.locator(".tour").count(), pg.locator(".tour").first.inner_text() if pg.locator(".tour").count() else "")
    print(pg.evaluate("document.body.innerText.slice(0,1500)"))
    # try save as guest
    pg.keyboard.press("Escape")
    pg.click("[data-action=save]")
    pg.wait_for_timeout(800)
    print("after save:", pg.url)
    print(pg.evaluate("[...document.querySelectorAll('[role=status],[role=alert],.toast,.popup,[role=dialog],dialog')].map(e=>e.className+': '+e.innerText.slice(0,200)).join('\\n')"))
    shot(pg, "probe-editor-guest-save")
    print(errs)
    b.close()
