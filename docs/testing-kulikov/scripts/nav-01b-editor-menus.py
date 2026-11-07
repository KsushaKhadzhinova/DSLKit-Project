"""Editor: elements that are hidden until a menu or a panel is opened (the menu with dots, the activity panels).
usage: python nav-01b-editor-menus.py <ru|en>  -> out/crawl-<lang>-editormenus.json
"""
import sys, json
sys.path.insert(0, '.')
from nav_common import *

lang = sys.argv[1] if len(sys.argv) > 1 else 'ru'
GROUPS = [
    ('menu ⋯', "()=>document.querySelectorAll('.editor-menu, .editor-menu__sub').forEach(d=>d.open=true)", '.editor-menu__panel button, .editor-menu__panel a, .editor-menu__panel summary'),
    ('panel Файлы', "()=>document.querySelector('[data-panel=files]').click()", '.editor-sidebar button:visible, .editor-sidebar a:visible'),
    ('panel Шаблоны', "()=>document.querySelector('[data-panel=templates]').click()", '.editor-sidebar .templates__item:visible, .editor-sidebar select:visible'),
    ('panel Поиск', "()=>document.querySelector('[data-panel=search]').click()", '.editor-tools button:visible, .editor-tools input:visible'),
    ('panel Git', "()=>document.querySelector('[data-panel=git]').click()", '.editor-tools button:visible, .editor-tools input:visible'),
    ('panel AI', "()=>document.querySelector('[data-panel=ai]').click()", '.editor-tools button:visible, .editor-tools input:visible'),
]
out = []
with sync_playwright() as pw:
    s = Session(pw)
    s.ctx.add_init_script("try{localStorage.setItem('dslkit.tour-done','true')}catch(e){}")
    p = s.page()
    register(p, 'Меню Проверкин', 'menu%d@example.com' % int(time.time()), lang=lang)
    full = url('app/editor.html', lang)
    dialogs = []
    p.on('dialog', lambda d: (dialogs.append((d.type, d.message[:60])), d.dismiss() if d.type == 'confirm' else d.accept()))
    for name, prep, sel in GROUPS:
        p.goto(full); p.wait_for_timeout(1500)
        try:
            p.evaluate(prep); p.wait_for_timeout(400)
        except Exception as ex:
            out.append(dict(page='app/editor.html', lang=lang, auth='user', i=0, tag='-', act=name, text='(group)', href=None, type=None, result='PANEL NOT OPENED ' + str(ex)[:60], errors=[])); continue
        n = p.locator(sel).count()
        print(name, n, flush=True)
        for i in range(min(n, 40)):
            p.goto(full); p.wait_for_timeout(900)
            p.evaluate(prep); p.wait_for_timeout(300)
            el = p.locator(sel).nth(i)
            info = el.evaluate("e=>({tag:e.tagName.toLowerCase(),href:e.getAttribute('href'),type:e.getAttribute('type'),text:(e.getAttribute('aria-label')||e.textContent||'').replace(/\\s+/g,' ').trim().slice(0,40),act:e.dataset.action||e.dataset.import||e.dataset.export||e.dataset.template||''})")
            before = p.evaluate("()=>document.body.innerHTML.length+'|'+JSON.stringify(localStorage)+'|'+document.querySelector('.code__input').value.length")
            u0 = p.url; err0 = len(s.errors); d0 = len(dialogs)
            dl = []
            p.once('download', lambda d, dl=dl: dl.append(d.suggested_filename))
            try:
                if info['tag'] in ('input',) and info['type'] not in ('checkbox', 'file'):
                    el.fill('abc'); p.keyboard.press('Enter')
                elif info['tag'] == 'select':
                    el.select_option(index=1)
                elif info['type'] == 'file':
                    out.append(dict(page='app/editor.html', lang=lang, auth='user', i=i, act=name, result='file input (see E23)', errors=[], **{k: info[k] for k in ('tag', 'href', 'type', 'text')})); continue
                else:
                    el.click(timeout=4000)
                p.wait_for_timeout(700)
                after = p.evaluate("()=>document.body.innerHTML.length+'|'+JSON.stringify(localStorage)+'|'+document.querySelector('.code__input').value.length")
                parts = []
                if p.url != u0: parts.append('URL -> ' + p.url.replace(BASE, ''))
                if dl: parts.append('download ' + dl[0])
                if len(dialogs) > d0: parts.append('dialog ' + str(dialogs[-1]))
                if after != before and p.url == u0: parts.append('DOM/storage/code changed')
                res = ' | '.join(parts) or 'NO VISIBLE EFFECT'
            except Exception as ex:
                res = 'ERROR ' + str(ex).splitlines()[0][:100]
            out.append(dict(page='app/editor.html', lang=lang, auth='user', i=i, act=name + ' / ' + info['act'], result=res, errors=[f'{k}:{m[:80]}' for k, u, m in s.errors[err0:] if 'kroki' not in (u + m).lower() and k != 'http404'], **{k: info[k] for k in ('tag', 'href', 'type', 'text')}))
            print(out[-1]['act'], out[-1]['text'], '->', res, flush=True)
    json.dump(out, open(f'out/crawl-{lang}-editormenus.json', 'w'), indent=1)
    s.close()
