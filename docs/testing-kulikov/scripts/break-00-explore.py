import sys; sys.path.insert(0,'.')
from break_common import *
with sync_playwright() as pw:
    s = S(pw); p = s.page()
    register(p, 'Tester', f'a{int(time.time())}@x.io')
    p.goto(url('app/editor.html')); p.wait_for_timeout(1500)
    print(p.title(), p.url)
    print(p.evaluate("[...document.querySelectorAll('button,[role=tab],textarea,select,input')].map(e=>e.tagName+'#'+e.id+'.'+(e.className||'').toString().split(' ')[0]+'|'+(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,30)).join(' ; ')"))
    print(s.errs)
