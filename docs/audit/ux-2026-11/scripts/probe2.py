import sys, time
sys.path.insert(0, str(__import__("pathlib").Path(__file__).parent))
from ux import *

with sync_playwright() as p:
    b = launch(p)
    ctx = new_ctx(b, seeded=False)
    errs = []
    pg = page(ctx, errs)
    pg.goto(BASE + "/app/dashboard.html")
    pg.wait_for_timeout(1500)
    shot(pg, "probe-dashboard")
    print(pg.evaluate("document.body.innerText.slice(0,1800)"))
    pg.goto(BASE + "/app/editor.html?template=bpmn")
    pg.wait_for_timeout(1200)
    pg.evaluate("localStorage.setItem('dslkit.tour-done','1')")
    pg.reload()
    pg.wait_for_timeout(1200)
    pg.click(".editor-menu__summary")
    pg.wait_for_timeout(300)
    print("MENU:", pg.evaluate("[...document.querySelectorAll('.editor-menu__panel button, .editor-menu__panel a, .editor-menu__panel summary, .editor-menu__title')].map(e=>(e.getAttribute('data-action')||'')+' | '+e.innerText.trim().replace(/\\n/g,' ')).join('\\n')"))
    shot(pg, "probe-menu")
    pg.keyboard.press("Escape")
    print("tabs:", pg.evaluate("[...document.querySelectorAll('.problems__tab')].map(e=>e.innerText).join(',')"))
    print(errs)
    b.close()
