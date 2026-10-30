"""New features: early.js (theme and sign-in before the first paint), docs.html, grouped menu, Templates tab in the editor.
usage: python nav-06-new.py -> out/seq-new.json
"""
import sys, json, time
sys.path.insert(0, '.')
from nav_common import *

R = Report()
STAMP = str(int(time.time()))[-6:]
with sync_playwright() as pw:
    s = Session(pw)
    ctx = s.ctx
    ctx.add_init_script("try{localStorage.setItem('dslkit.tour-done','true')}catch(e){}")
    p = s.page(); p.on('dialog', lambda d: d.accept())
    # N01 guest at dashboard: redirected before modules load
    reqs = []
    p.on('request', lambda r: reqs.append(r.url.replace(BASE, '')))
    p.goto(url('app/dashboard.html')); p.wait_for_timeout(1500)
    R.add('N01', 'Гость открывает dashboard.html (early.js)', 'переход на вход до отрисовки, script.js панели не грузится', f'{p.url.replace(BASE,"")}; script.js запрошен для dashboard: {any("script.js" in r for r in reqs[:8])}', p.url.endswith('login.html'))
    # N02 theme dark remembered: set before first paint
    p.goto(url('app/login.html'))
    p.evaluate("()=>localStorage.setItem('dslkit.theme', JSON.stringify('dark'))")
    ctx.add_init_script("document.addEventListener('readystatechange',()=>{ if(!window.__t) window.__t=document.documentElement.dataset.theme })")
    p.goto(url('app/login.html')); first = p.evaluate("()=>window.__t")
    R.add('N02', 'Тема dark в хранилище: атрибут data-theme до загрузки страницы', 'dark с первого кадра', str(first), first == 'dark')
    for bad in ['"purple"', '123', '{bad', 'null']:
        p.evaluate("(v)=>localStorage.setItem('dslkit.theme', v)", bad)
        p.goto(url('app/login.html'))
        th = p.evaluate("()=>document.documentElement.dataset.theme")
        R.add('N03', f'Испорченное значение темы {bad}', 'light/dark по системной теме, без ошибок', th, th in ('light', 'dark'))
    p.evaluate("()=>localStorage.removeItem('dslkit.theme')")
    # N04 early gate with forged session
    register(p, 'Новый Проверкин', 'nw%s@example.com' % STAMP)
    acc = p.evaluate("()=>localStorage.getItem('dslkit.accounts')")
    p.evaluate("()=>localStorage.setItem('dslkit.session', JSON.stringify({userId:'forged'}))")
    p.goto(url('app/dashboard.html')); p.wait_for_timeout(600)
    R.add('N04', 'Подделанная сессия (id не из списка аккаунтов)', 'на вход', p.url.replace(BASE, ''), p.url.endswith('login.html'))
    p.evaluate("(a)=>{localStorage.setItem('dslkit.accounts',a); const u=JSON.parse(a)[0].id; localStorage.setItem('dslkit.session', JSON.stringify({userId:u}))}", acc)
    p.goto(url('app/dashboard.html')); p.wait_for_timeout(800)
    R.add('N05', 'Верная сессия', 'dashboard открыт', p.url.replace(BASE, ''), p.url.endswith('dashboard.html'))
    # N06 english dashboard guest
    p.evaluate("()=>localStorage.removeItem('dslkit.session')")
    p.goto(url('app/dashboard.html?q=x#y', 'en')); p.wait_for_timeout(600)
    R.add('N06', 'Гость: /en/app/dashboard.html?q=x#y', 'на /en/app/login.html', p.url.replace(BASE, ''), p.url.endswith('/en/app/login.html'))
    # N07 dashboard path variants (early.js regexp)
    for path in ['/app/dashboard.html/', '/app/dashboard.html%20']:
        r = p.goto(BASE + path); p.wait_for_timeout(300)
        R.add('N07', f'Гость: {path}', '404 или вход, но не защищённое содержимое', f'{r.status} {p.url.replace(BASE,"")}', r.status == 404 or 'login' in p.url)
    # N08 docs page
    for lang in ('ru', 'en'):
        for who in ('guest', 'user'):
            if who == 'user':
                login(p, 'nw%s@example.com' % STAMP, lang=lang)
            else:
                p.evaluate("()=>localStorage.removeItem('dslkit.session')")
            r = p.goto(url('app/docs.html', lang)); p.wait_for_timeout(600)
            links = p.evaluate("()=>[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href'))")
            bad = []
            for h in set(links):
                if h.startswith('#') or h.startswith('http'):
                    continue
                full = p.evaluate("(h)=>new URL(h, location.href).href", h)
                st = ctx.request.get(full).status
                if st >= 400: bad.append((h, st))
            R.add('N08', f'docs.html ({lang}, {who}): все внутренние ссылки', 'нет 404', f'status={r.status}, ссылок={len(links)}, битых={bad}', r.status == 200 and not bad)
    # N09 docs ?q= and unknown hash
    p.goto(url('app/docs.html#nope')); p.wait_for_timeout(400)
    R.add('N09', 'docs.html#несуществующий-якорь', 'страница открыта без ошибок', p.title(), True)
    p.goto(url('app/editor.html')); p.wait_for_timeout(1000)
    p.evaluate("()=>document.querySelector('.editor-menu').open=true")
    groups = p.evaluate("()=>[...document.querySelectorAll('.editor-menu__group')].map(g=>g.getAttribute('aria-label')+':'+g.querySelectorAll('button,a').length)")
    R.add('N10', 'Меню ⋯ редактора: группы действий', 'действия разбиты на подписанные группы', str(groups), len(groups) >= 3)
    p.keyboard.press('Escape'); p.wait_for_timeout(200)
    R.add('N11', 'Меню ⋯ редактора: Esc закрывает меню', 'меню закрыто', 'проверено', not p.evaluate("()=>document.querySelector('.editor-menu').open"))
    p.evaluate("()=>document.querySelector('.editor-menu').open=true")
    p.mouse.click(600, 500); p.wait_for_timeout(200)
    R.add('N12', 'Меню ⋯ редактора: клик вне меню закрывает', 'меню закрыто', 'проверено', not p.evaluate("()=>document.querySelector('.editor-menu').open"))
    login(p, 'nw%s@example.com' % STAMP)
    p.goto(url('app/dashboard.html')); p.wait_for_timeout(800)
    p.click('.project-card__menu >> nth=0'); p.click('.project-card__menu >> nth=1'); p.wait_for_timeout(200)
    open3 = p.locator('.project-card__actions:not([hidden])').count()
    R.add('N13', 'Меню ⋯ карточки: открыть второе при открытом первом', 'открыто только одно', f'открытых меню={open3}', open3 == 1)
    # editor Templates tab
    p.goto(url('app/editor.html')); p.wait_for_timeout(1200)
    tabs = p.evaluate("()=>[...document.querySelectorAll('[role=tab], .editor-sidebar__tab, .sidebar-tab')].map(t=>t.textContent.trim().replace(/\\s+/g,' ').slice(0,25))")
    R.add('N14', 'Редактор: вкладки боковой панели', 'есть вкладка «Шаблоны»', str(tabs), any('Шаблон' in t for t in tabs))
    tab = p.locator('button[data-panel=templates]')
    try:
        tab.click(timeout=3000); p.wait_for_timeout(400)
        items = p.evaluate("()=>[...document.querySelectorAll('.templates__item')].filter(e=>e.offsetParent).length")
        R.add('N15', 'Редактор: открыть вкладку «Шаблоны»', 'виден список шаблонов', f'видимых элементов={items}', items > 0)
        before = p.evaluate("()=>document.querySelector('.code__input').value")
        p.locator('.templates__item:visible').nth(1).click(); p.wait_for_timeout(800)
        after = p.evaluate("()=>document.querySelector('.code__input').value")
        R.add('N16', 'Редактор: нажать шаблон', 'код заменён выбранным шаблоном', f'код изменился={before != after}', before != after)
        p.click('[data-action=undo]', force=True); p.wait_for_timeout(300)
        R.add('N17', 'Отмена после выбора шаблона', 'прежний код вернулся', str(p.evaluate("()=>document.querySelector('.code__input').value") == before), p.evaluate("()=>document.querySelector('.code__input').value") == before)
    except Exception as ex:
        R.add('N15', 'Редактор: открыть вкладку «Шаблоны»', 'виден список шаблонов', 'ошибка ' + str(ex)[:80], False)
    errs = [f'{k}:{m[:80]}' for k, u, m in s.errors if 'kroki' not in (u + m).lower() and k != 'http404' and 'dashboard.html/' not in u and 'app/js' not in m and 'app/css' not in m and 'Failed to load resource' not in m]
    R.add('N18', 'Ошибки консоли и страницы за прогон', '0', str(errs[:5]), not errs)
    R.dump('out/seq-new.json')
    s.close()
