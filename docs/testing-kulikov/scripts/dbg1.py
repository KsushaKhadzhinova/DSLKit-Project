import sys,json; sys.path.insert(0,'.')
from nav_common import *
with sync_playwright() as pw:
    s=Session(pw); p=s.page(); p.on('dialog',lambda d:d.accept())
    register(p,'Дебаг Один','dbg%d@example.com'%int(time.time()))
    p.goto(url('app/dashboard.html')); p.wait_for_timeout(600)
    k=p.evaluate("()=>Object.keys(localStorage).find(k=>k.startsWith('dslkit.projects.'))")
    DAY=86400000
    p.evaluate("""([k,DAY])=>{const a=JSON.parse(localStorage[k]); const now=Date.now();
      a[0].trashedAt=now-29*DAY-60000; a[0].title='X29'; a[1].trashedAt=now+5*DAY; a[1].title='XFuture'; localStorage[k]=JSON.stringify(a);}""",[k,DAY])
    p.reload(); p.wait_for_timeout(700)
    p.click('[data-section=trash]'); p.wait_for_timeout(300)
    print(p.evaluate("()=>[...document.querySelectorAll('#project-list .project-list__item[data-trashed]')].map(e=>[e.hidden, e.textContent.trim().slice(0,90)])"))
    print(p.inner_text('#project-count'), p.evaluate("()=>localStorage.getItem('dslkit.dashboard')"))
    for q in ['?q=%3Cimg%20src%3Dx%3E','?q=%E0%A4%A','?q='+'я'*3000]:
        try:
            p.goto(url('app/dashboard.html'+q),timeout=8000); p.wait_for_timeout(500)
            print(q[:20], p.url[:60], p.title(), p.locator('.app-topbar__search-input').count(), p.inner_text('body')[:80].replace('\n',' '))
        except Exception as e: print(q[:20],'ERR',str(e)[:100])
    print(s.errors[-5:])
    s.close()
