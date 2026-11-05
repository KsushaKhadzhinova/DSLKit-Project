import sys; sys.path.insert(0,'.')
from nav_common import *
with sync_playwright() as pw:
    s=Session(pw); p=s.page()
    for path in ['/app/dashboard.html/','/app/dashboard.html/x']:
        r=p.goto(BASE+path); p.wait_for_timeout(1500)
        print(path,r.status,p.url, p.title(), p.locator('#project-list .project-list__item').count(), p.evaluate("()=>document.body.innerText.slice(0,80)").replace('\n',' '))
    print(s.errors[:6])
    s.close()
