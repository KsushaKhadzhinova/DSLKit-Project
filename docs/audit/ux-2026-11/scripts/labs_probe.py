import sys, json
sys.path.insert(0, str(__import__("pathlib").Path(__file__).parent))
from ux import *

URLS = {"lab04": "http://localhost:5174/", "lab05": "http://localhost:5178/", "pz03": "http://localhost:5175/", "pz04": "http://localhost:5176/", "pz01": "http://localhost:3100/"}
LIST = """() => [...document.querySelectorAll('a,button,input,select,textarea')].filter(e=>e.offsetParent).map(e=>e.tagName+'['+(e.type||'')+'] '+((e.innerText||e.getAttribute('aria-label')||e.placeholder||e.name||'').trim().slice(0,40))+(e.getAttribute('href')?' -> '+e.getAttribute('href'):'')).join('\\n')"""
with sync_playwright() as p:
    b = launch(p)
    for k, u in URLS.items():
        ctx = b.new_context(viewport={"width": 1366, "height": 900}, locale="ru-RU")
        pg = ctx.new_page()
        pg.set_default_timeout(60000)
        try:
            pg.goto(u, wait_until="domcontentloaded", timeout=90000)
            pg.wait_for_timeout(3000)
            print("=====", k, pg.title())
            print(pg.evaluate("document.body.innerText.slice(0,500)").replace("\n", " / "))
            print(pg.evaluate(LIST))
            shot(pg, f"lab-{k}-home")
        except Exception as e:
            print(k, "ERR", str(e)[:150])
        ctx.close()
