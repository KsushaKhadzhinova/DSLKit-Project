import sys; sys.path.insert(0,'.')
from nav_common import *
with sync_playwright() as pw:
    s=Session(pw); p=s.page(); p.on('dialog',lambda d:d.accept())
    register(p,'Дебаг Семь','d7%d@example.com'%int(time.time()))
    p.goto(url('app/dashboard.html')); p.wait_for_selector('#project-list .project-list__item',state='attached'); p.wait_for_timeout(1200)
    p.locator('#project-list .project-list__item:not([hidden]) .project-card__menu').nth(0).click()
    p.locator('.project-card__actions:not([hidden]) [data-act=remove]').first.click(); p.wait_for_timeout(400)
    t2=s.ctx.new_page(); t2.on('dialog',lambda d:d.accept()); t2.goto(url('app/dashboard.html')); t2.wait_for_selector('#project-list .project-list__item',state='attached'); t2.wait_for_timeout(1500)
    t2.click('[data-section=trash]'); t2.wait_for_timeout(400)
    js="()=>[...document.querySelectorAll('#project-list .project-list__item')].filter(e=>!e.hidden).map(e=>e.dataset.trashed+':'+e.textContent.trim().slice(0,12))"
    print('t2 trash view', t2.evaluate(js), t2.inner_text('#project-count'))
    print(t2.evaluate("()=>[document.querySelector('.dashboard__title').textContent, localStorage.getItem('dslkit.dashboard')]"))
    print('card html', t2.evaluate("()=>document.querySelector('#project-list [data-trashed]:not([hidden])').outerHTML.slice(0,900)"))
    s.close()
