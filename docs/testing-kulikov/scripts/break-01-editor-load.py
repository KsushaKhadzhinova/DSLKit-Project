"""Big sources, garbage, XSS in labels. Prints timings and errors."""
import sys; sys.path.insert(0,'.')
from break_common import *
def graph(n): return 'diagram graph "G"\nmode directed\n' + ''.join(f'vertex v{i} "N{i}"\n' for i in range(n)) + ''.join(f'edge v{i} -> v{i+1}\n' for i in range(n-1))
with sync_playwright() as pw:
    s = S(pw); p = s.page()
    register(p, 'Tester', f'b{int(time.time())}@x.io')
    p.goto(url('app/editor.html')); p.wait_for_timeout(1500)
    ta = p.locator('textarea.code__input')
    def setv(text, label):
        t=time.time()
        p.evaluate("t=>{const a=document.querySelector('textarea.code__input');a.value=t;a.dispatchEvent(new Event('input',{bubbles:true}));}", text)
        p.wait_for_timeout(50)
        # time until main thread is free
        p.evaluate("()=>new Promise(r=>setTimeout(r,0))")
        print(label, 'len', len(text), 'blocked ms', int((time.time()-t)*1000), 'svg', p.evaluate("document.querySelectorAll('svg *').length"), 'errs', s.errs[-2:])
    for n in (100, 1000, 3000, 10000):
        try: setv(graph(n), f'graph{n}')
        except Exception as e: print('EXC', n, str(e)[:100])
    setv('x'*100000, '100KB garbage one line')
    setv('diagram graph "'+'a'*100000+'"\n', '100KB title')
    setv('\n'.join('vertex a%d "%s"'%(i,'ё‮😀\u0000') for i in range(500)), 'unicode/RLO/NUL')
    # XSS labels
    setv('diagram graph "<img src=x onerror=window.__x=1>"\nmode directed\nvertex a "<script>window.__x=2</script>"\nvertex b "</text><image href=x onerror=window.__x=3>"\nedge a -> b "\\"><svg onload=window.__x=4>"\n', 'xss')
    p.wait_for_timeout(500)
    print('XSS executed:', p.evaluate("window.__x"))
    print('ERRS', s.errs)
    s.b.close()
