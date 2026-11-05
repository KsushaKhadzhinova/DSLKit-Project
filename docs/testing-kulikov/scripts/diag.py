import sys; sys.path.insert(0,'.')
from nav_common import *
import time
with sync_playwright() as pw:
    b=pw.chromium.launch(); c=b.new_context(); p=c.new_page()
    pend=set()
    p.on('request',lambda r:pend.add(r.url)); p.on('requestfinished',lambda r:pend.discard(r.url)); p.on('requestfailed',lambda r:pend.discard(r.url))
    for u in ['index.html','en/app/dashboard.html','app/dashboard.html','en/app/dashboard.html']:
        t=time.time()
        try: p.goto(url(u),timeout=15000,wait_until='load'); print(u,'ok',round(time.time()-t,2))
        except Exception as e: print(u,'TIMEOUT',round(time.time()-t,2),[x.replace(BASE,'') for x in pend])
    b.close()
