"""Trash resurrect via stale tab, 200-project limit, XSS in title, rapid undo, storage disabled, offline, many redraws."""
import sys; sys.path.insert(0,'.')
from break_common import *
def setv(p, text, w=700):
    p.evaluate("t=>{const a=document.querySelector('textarea.code__input');a.value=t;a.dispatchEvent(new Event('input',{bubbles:true}));}", text); p.wait_for_timeout(w)
with sync_playwright() as pw:
    s = S(pw); p = s.page(); st=int(time.time())
    register(p, 'Anna Test', f'e{st}@x.io')
    p.goto(url('app/editor.html')); p.wait_for_timeout(1200)
    setv(p, 'diagram graph "<img src=x onerror=window.__t=1>"\nvertex a "<b>x</b>"\n', 1800)
    print('1 saved url', p.url[-20:])
    pid = p.url.split('p=')[1]
    # trash in other tab via storage (what dashboard delete does)
    p2 = s.page(); p2.goto(url('app/dashboard.html')); p2.wait_for_timeout(1000)
    print('1 dashboard xss executed:', p2.evaluate("window.__t"), 'title text:', p2.evaluate("document.body.innerText.includes('<img')"))
    key = p2.evaluate("Object.keys(localStorage).find(k=>k.startsWith('dslkit.projects.'))")
    p2.evaluate("""k=>{const a=JSON.parse(localStorage.getItem(k));a.forEach(x=>{if(x.title.includes('img'))x.trashedAt=Date.now()});localStorage.setItem(k,JSON.stringify(a))}""", key)
    before = p2.evaluate("k=>JSON.parse(localStorage.getItem(k)).length", key)
    setv(p, 'diagram graph "<img src=x onerror=window.__t=1>"\nvertex a "<b>x</b>"\nvertex b\n', 2000)
    after = p2.evaluate("k=>JSON.parse(localStorage.getItem(k)).filter(x=>x.title.includes('img')).map(x=>[x.id,!!x.trashedAt])", key)
    print('2 trashed in tab B, tab A autosaves ->', before, after, '(expect no live copy)')
    # 3. 200 limit
    p2.evaluate("""k=>{const a=JSON.parse(localStorage.getItem(k));const base=Date.now()-1e7;const mk=i=>({id:'z'+i,title:'Old '+i,notation:'graph',source:'diagram graph Old',created:base+i,updated:base+i});const arr=[...a,...Array.from({length:199},(_,i)=>mk(i))];localStorage.setItem(k,JSON.stringify(arr));window.__n=arr.length}""", key)
    print('3 seeded', p2.evaluate("window.__n"))
    p.goto(url('app/editor.html')); p.wait_for_timeout(800); setv(p,'diagram graph "Brand new 201"\nvertex q\n',2000)
    arr = p2.evaluate("k=>JSON.parse(localStorage.getItem(k)).map(x=>x.title)", key)
    print('3 after 201st project: count', len(arr), 'new present', 'Brand new 201' in arr, 'lost titles', [t for t in ['Old 0','Old 198'] if t not in arr])
    # 4. rapid undo/redo
    p.goto(url('app/editor.html')); p.wait_for_timeout(800)
    t=time.time()
    for i in range(60): setv(p, f'diagram graph "R{i}"\nvertex a\n', 5)
    for i in range(200): p.click('[data-action=undo]', timeout=3000) if i%2==0 else p.click('[data-action=redo]', timeout=3000)
    print('4 rapid ms', int((time.time()-t)*1000), 'errs', s.errs[-3:])
    # 5. memory: 300 redraws
    h0 = p.evaluate("performance.memory ? performance.memory.usedJSHeapSize : 0")
    for i in range(300): setv(p, f'diagram graph "M{i}"\nvertex a\nvertex b\nedge a -- b\n', 2)
    p.wait_for_timeout(1000)
    print('5 heap MB', h0>>20, '->', p.evaluate("performance.memory.usedJSHeapSize")>>20, 'DOM nodes', p.evaluate("document.getElementsByTagName('*').length"))
    # 6. resize mid-action + offline
    p.set_viewport_size({'width':320,'height':500}); setv(p,'diagram graph "Z"\nvertex a\n',200); p.set_viewport_size({'width':1920,'height':900})
    p.context.set_offline(True); setv(p,'diagram graph "Off"\nvertex a\n',800)
    print('6 offline status:', p.evaluate("document.querySelector('.canvas__status')?.textContent"))
    p.context.set_offline(False)
    print('ERRS', s.errs)
    # 7. storage disabled
    ctx2 = s.b.new_context(); ctx2.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new DOMException('denied','SecurityError')}})")
    q = ctx2.new_page(); errs=[]; q.on('pageerror', lambda e: errs.append(str(e)[:120]))
    for pg in ['index.html','app/login.html','app/register.html','app/editor.html','app/dashboard.html','app/settings.html']:
        q.goto(url(pg)); q.wait_for_timeout(600); print('7', pg, '->', q.url[len(BASE):], 'body len', q.evaluate("document.body.innerText.length"))
    q.goto(url('app/register.html')); q.fill('#name','Anna Test'); q.fill('#email','n@x.io'); q.fill('#password',PW); q.fill('#confirm',PW); q.click('#auth-form [type=submit]'); q.wait_for_timeout(1500)
    print('7 register w/o storage ->', q.url[len(BASE):], q.evaluate("document.querySelector('#auth-error')?.textContent"), errs)
    s.b.close()
