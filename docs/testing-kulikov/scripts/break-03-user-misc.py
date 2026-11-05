"""Misc user-side breaking: CRLF paste, XSS names, quota, disabled storage, bad import, EN leftovers, logout in 2nd tab."""
import sys; sys.path.insert(0,'.')
from break_common import *
def setv(p, text):
    p.evaluate("t=>{const a=document.querySelector('textarea.code__input');a.value=t;a.dispatchEvent(new Event('input',{bubbles:true}));}", text); p.wait_for_timeout(700)
with sync_playwright() as pw:
    s = S(pw); p = s.page(); st=int(time.time())
    # A. XSS in name
    register(p, 'Anna Test', f'c{st}@x.io')
    p.goto(url('app/editor.html')); p.wait_for_timeout(1200)
    # B. CRLF / U+2028
    for label, txt in [('CRLF','diagram graph "G"\r\nmode directed\r\nvertex a\r\n'), ('U+2028','diagram graph "G" vertex a\nvertex b'), ('NUL+RLO','diagram graph "‮\u0000"\nvertex a')]:
        n=len(s.errs); setv(p, txt); print('B', label, 'new errors:', s.errs[n:], 'code lines now:', p.evaluate("document.querySelectorAll('.code__line').length"))
    # C. stale canvas after error
    setv(p,'diagram graph "G"\nmode directed\nvertex a\nvertex b\nedge a -> b\n'); 
    print('C svg text count ok', p.evaluate("document.querySelectorAll('.canvas svg text').length"))
    # D. quota
    p.evaluate("""()=>{let i=0;try{let s='x'.repeat(1<<20);while(true){localStorage.setItem('fill'+i++,s)}}catch(e){window.__full=i}}""")
    print('D filled MB', p.evaluate("window.__full"))
    n=len(s.errs); setv(p,'diagram graph "Quota"\nvertex a\n'); p.click('[data-action=save]'); p.wait_for_timeout(800)
    print('D after save on full storage: status=', p.evaluate("document.querySelector('.editor-status__saved')?.textContent"), 'errors', s.errs[n:])
    p.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('fill')).forEach(k=>localStorage.removeItem(k))")
    # E. bad import file
    p.set_input_files('input.editor-import__file', files=[{'name':'x.png','mimeType':'image/png','buffer':bytes(range(256))*50}]); p.wait_for_timeout(800)
    print('E bad import: note=', p.evaluate("document.querySelector('.editor-status__saved')?.textContent"), 'code=', repr(p.evaluate("document.querySelector('textarea.code__input').value")[:60]))
    p.set_input_files('input.editor-import__file', files=[{'name':'big.txt','mimeType':'text/plain','buffer':b'a'*(3*1024*1024)}]); p.wait_for_timeout(3000)
    print('E2 30MB import: code len', p.evaluate("document.querySelector('textarea.code__input').value.length"), s.errs[-1:])
    # F. second tab logout
    p2 = s.page(); p2.goto(url('app/dashboard.html')); p2.wait_for_timeout(800)
    p2.evaluate("localStorage.removeItem('dslkit.session')"); p.wait_for_timeout(800)
    print('F editor tab after logout elsewhere:', p.url, 'still shows editor:', p.locator('textarea.code__input').count())
    p.click('[data-action=save]'); p.wait_for_timeout(500)
    print('F saving while logged out ->', p.evaluate("Object.keys(localStorage).filter(k=>k.includes('projects'))"))
    # G. EN page russian leftovers
    pe = s.page(); pe.goto(url('app/editor.html','en')); pe.wait_for_timeout(1500)
    import re
    txt = pe.evaluate("document.body.innerText + [...document.querySelectorAll('[aria-label],[title],[placeholder]')].map(e=>(e.getAttribute('aria-label')||'')+' '+(e.title||'')+' '+(e.placeholder||'')).join(' ')")
    print('G cyrillic on /en editor:', sorted(set(re.findall(r'[А-Яа-яЁё][А-Яа-яЁё \.,:\-]{3,40}', txt)))[:25])
    for pg in ['app/dashboard.html','app/settings.html','app/login.html','app/register.html','app/welcome.html','index.html']:
        pe.goto(url(pg,'en')); pe.wait_for_timeout(800)
        t = pe.evaluate("document.documentElement.outerHTML")
        print('G', pg, sorted(set(re.findall(r'[А-Яа-яЁё][А-Яа-яЁё \.,:\-]{3,40}', re.sub(r'<script.*?</script>|<!--.*?-->','',t,flags=re.S))))[:8])
    print('ERRS', s.errs)
    s.b.close()
