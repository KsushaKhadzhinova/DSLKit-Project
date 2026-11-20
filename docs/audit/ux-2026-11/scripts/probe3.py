import sys, time
sys.path.insert(0, str(__import__("pathlib").Path(__file__).parent))
from ux import *

with sync_playwright() as p:
    b = launch(p)
    ctx = new_ctx(b, seeded=True, init="localStorage.setItem('dslkit.tour-done','1')")
    errs = []
    pg = page(ctx, errs)
    pg.goto(BASE + "/app/dashboard.html")
    pg.wait_for_timeout(1500)
    shot(pg, "probe-dashboard2")
    print(pg.evaluate("document.querySelector('#project-list').innerHTML.slice(0,3500)"))
    print("COUNT", pg.inner_text("#project-count"))
    pg.goto(BASE + "/app/editor.html?template=bpmn")
    pg.wait_for_timeout(1500)
    pg.click(".board-tools__add")
    pg.wait_for_timeout(300)
    shot(pg, "probe-palette")
    print("PAL", pg.evaluate("[...document.querySelectorAll('.palette__item')].map(e=>e.innerText.trim()+'|'+e.className).join('\\n')"))
    print("toolbar", pg.evaluate("[...document.querySelectorAll('.board-tools button')].map(e=>(e.getAttribute('aria-label')||e.innerText)+'|'+e.className).join('\\n')"))
    print(errs)
    b.close()
