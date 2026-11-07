import sys; sys.path.insert(0,'.')
from nav_common import *
with sync_playwright() as pw:
    s=Session(pw); p=s.page()
    for q in ['?my=','?my=nope','?tpl=','?template=constructor','?q=<b>x</b>','?p[]=1']:
        try:
            p.goto(url('app/settings.html'+q)); p.wait_for_timeout(500); print(q,'ok',p.title()[:20])
        except Exception as e: print(q,'ERR',str(e)[:60])
    s.close()
