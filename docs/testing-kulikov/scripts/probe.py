from lib import *
import time
with sync_playwright() as p:
    t=T("probe"); t.start(p); pg=t.pg
    pg.on("requestfailed",lambda r:print("FAILED",r.url[:100]))
    for u in ["/app/login.html","/app/register.html","/app/login.html"]:
        t0=time.time()
        try: pg.goto(BASE+u,wait_until="domcontentloaded"); pg.wait_for_load_state("load",timeout=15000)
        except Exception as e: print("ERR",str(e)[:100])
        print(u,time.time()-t0)
