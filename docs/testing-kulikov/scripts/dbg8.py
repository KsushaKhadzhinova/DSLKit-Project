import sys; sys.path.insert(0,'.')
from nav_common import *
with sync_playwright() as pw:
    s=Session(pw); p=s.page()
    p.goto(url('app/settings.html')); p.wait_for_timeout(1500)
    print('opts',p.evaluate("()=>[...document.querySelectorAll('select')].map(s=>[s.id,s.options.length,s.value])"))
    st0=ls(p)
    for sel in ['#code-font-size','#autocomplete','#canvas-grid']:
        p.select_option(sel,index=1,timeout=3000) if p.locator(sel+' option').count()>1 else print('single option',sel); p.wait_for_timeout(400)
    st1=ls(p)
    print('selects change storage:', st0!=st1, {k:v[:80] for k,v in st1.items() if k not in st0 or st0[k]!=v})
    p.check('#theme-dark',force=True) if False else p.click('label[for=theme-dark]'); p.wait_for_timeout(400)
    print('theme attr after dark radio:', p.evaluate("()=>document.documentElement.dataset.theme"), ls(p).get('dslkit.theme'))
    p.reload(); p.wait_for_timeout(800)
    print('after reload font-size value:', p.input_value('#code-font-size'), 'grid', p.input_value('#canvas-grid'))
    u=p.url
    p.click('.app-nav button:has-text("Общие")'); p.wait_for_timeout(400)
    print('Общие on settings: url same', p.url==u, p.evaluate("()=>document.querySelector('.app-nav [aria-current]')?.textContent"))
    p.click('.settings-nav button:has-text("Горячие клавиши")'); p.wait_for_timeout(400)
    print('settings Горячие клавиши -> hash/url', p.url[-30:], p.evaluate("()=>document.activeElement.textContent.slice(0,30)"))
    s.close()
