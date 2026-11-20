import sys, time
from playwright.sync_api import sync_playwright
b = sys.argv[1]
with sync_playwright() as p:
    br = getattr(p, b).launch(**({"channel": "msedge"} if b == "chromium" else {}))
    pg = br.new_page()
    failed = []
    pg.on("requestfailed", lambda r: failed.append(r.url[:90]))
    t = time.time()
    try:
        pg.goto("http://localhost:5173/", wait_until="load", timeout=30000)
        print("load ok", round(time.time()-t,1))
    except Exception as e:
        print("load ERR", round(time.time()-t,1), str(e).splitlines()[0][:150])
    print("failed", failed[:5])
    br.close()
