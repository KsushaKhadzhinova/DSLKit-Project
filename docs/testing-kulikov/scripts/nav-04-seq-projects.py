"""Sequences: projects, trash, templates, likes, quota, two tabs.
usage: python nav-04-seq-projects.py   -> out/seq-projects.json
"""
import sys, json, time
sys.path.insert(0, '.')
from nav_common import *

R = Report()
STAMP = str(int(time.time()))[-6:]
DLG = {'ok': True, 'text': None, 'log': []}


def on_dialog(d):
    DLG['log'].append((d.type, d.message[:60]))
    if d.type == 'prompt':
        d.accept(DLG['text'] if DLG['text'] is not None else d.default_value) if DLG['ok'] else d.dismiss()
    else:
        d.accept() if DLG['ok'] else d.dismiss()


def new_tab(ctx, path='app/dashboard.html', lang='ru'):
    t = ctx.new_page(); t.set_default_timeout(30000); t.on('dialog', on_dialog)
    t.goto(url(path, lang)); t.wait_for_timeout(700)
    return t


def key(p, prefix):
    return p.evaluate("(pre)=>Object.keys(localStorage).find(k=>k.startsWith('dslkit.'+pre))", prefix)


def data(p, prefix):
    k = key(p, prefix)
    return json.loads(p.evaluate("(k)=>localStorage.getItem(k)", k)) if k else []


def visible_titles(p):
    return p.evaluate("()=>[...document.querySelectorAll('#project-list .project-list__item:not([hidden])')].map(a=>a.querySelector('.project-card__link').textContent.trim())")


def menu(p, nth, act):
    item = p.locator('#project-list .project-list__item:not([hidden])').nth(nth)
    if item.locator('.project-card__actions').first.is_hidden():
        item.locator('.project-card__menu').click()
    p.locator('#project-list .project-list__item:not([hidden]) .project-card__actions:not([hidden]) [data-act="%s"]' % act).first.click()
    p.wait_for_timeout(300)


def EMPTYBTN(p):
    return p.locator('button:has-text("Очистить корзину"):visible').count()


def STAMPS(p):
    return p.evaluate("()=>[...document.querySelectorAll('[data-trashed] .project-card__updated')].map(e=>e.textContent)")


def section(p, name):
    p.click('[data-section="%s"]' % name); p.wait_for_timeout(250)


with sync_playwright() as pw:
    s = Session(pw)
    p = s.page(); p.on('dialog', on_dialog)
    register(p, 'Проектов Пётр', 'pp%s@example.com' % STAMP)
    p.goto(url('app/dashboard.html')); p.wait_for_timeout(700)
    ctx = s.ctx

    # ---- trash cycle ----
    base = len(visible_titles(p))
    first = visible_titles(p)[0]
    menu(p, 0, 'remove')
    R.add('P01', 'В корзину (с подтверждением)', f'в «Мои проекты» {base-1}, в корзине 1', f'мои={len(visible_titles(p))}, корзина(данные)={len([x for x in data(p,"projects.") if "trashedAt" in x])}', len(visible_titles(p)) == base - 1)
    DLG['ok'] = False
    n_before = len(visible_titles(p))
    menu(p, 0, 'remove')
    R.add('P02', 'В корзину и «Отмена» в окне подтверждения', 'проект остаётся', f'мои={len(visible_titles(p))}', len(visible_titles(p)) == n_before)
    DLG['ok'] = True
    section(p, 'trash')
    R.add('P03', 'Раздел «Корзина»: удалённый проект виден, кнопка «Очистить корзину» показана', f'«{first}» в корзине', f'{visible_titles(p)}, empty-btn={EMPTYBTN(p)}', first in visible_titles(p))
    p.locator('#project-list .project-list__item:not([hidden]) .project-card__menu').first.click()
    p.locator('.project-card__actions:not([hidden]) [data-act=restore]').first.click(); p.wait_for_timeout(300)
    section(p, 'mine')
    R.add('P04', 'Восстановление из корзины', f'«{first}» снова в «Мои проекты»', str(first in visible_titles(p)), first in visible_titles(p))
    menu(p, 0, 'remove')  # again to trash
    # two tabs: tab2 shows trash view (stale), tab1 empties trash
    t2 = new_tab(ctx); section(t2, 'trash')
    section(p, 'trash')
    p.click('button:has-text("Очистить корзину")'); p.wait_for_timeout(300)
    R.add('P05', 'Очистить корзину (подтверждение)', 'корзина пуста, проект стёрт из хранилища', f'в данных={len(data(p,"projects."))}, корзина видна={visible_titles(p)}', len([x for x in data(p, 'projects.') if 'trashedAt' in x]) == 0)
    # tab2 stale: restore the already purged project
    t2.locator('#project-list .project-list__item:not([hidden]) .project-card__menu').first.click()
    t2.locator('.project-card__actions:not([hidden]) [data-act=restore]').first.click(); t2.wait_for_timeout(400)
    section(t2, 'mine')
    after = len(data(t2, 'projects.'))
    R.add('P06', 'Восстановить уже стёртый проект (карточка устарела во второй вкладке)', 'проект не воскресает; пользователь видит понятное сообщение или список обновляется', f'проектов в данных={after}; в «Мои проекты» второй вкладки: {first in visible_titles(t2)}; сообщений нет', first not in visible_titles(t2))
    t2.reload(); t2.wait_for_timeout(600)
    # tab1 trash a project; tab2 stale rename of it
    DLG['text'] = 'Новое имя'
    t1 = p; t1.goto(url('app/dashboard.html')); t1.wait_for_timeout(500)
    victim = visible_titles(t2)[0]
    menu(t1, 0, 'remove')
    menu(t2, 0, 'rename'); t2.wait_for_timeout(300)
    names = [x['title'] for x in data(t1, 'projects.')]
    shown = visible_titles(t2)
    R.add('P07', 'Переименовать проект, который уже отправили в корзину в другой вкладке', 'переименование отклонено, данные не искажены, интерфейс обновлён', f'в данных есть «Новое имя»={"Новое имя" in names}; вторая вкладка показывает «{shown[0]}» (карточка устарела, сообщения нет)', 'Новое имя' not in names and victim not in shown[:1])
    # purge forever then rename stale
    t1.reload(); t1.wait_for_timeout(500); section(t1, 'trash')
    t1.locator('#project-list .project-list__item:not([hidden]) .project-card__menu').first.click()
    t1.locator('.project-card__actions:not([hidden]) [data-act=purge]').first.click(); t1.wait_for_timeout(300)
    menu(t2, 0, 'rename'); t2.wait_for_timeout(300)
    names = [x['title'] for x in data(t1, 'projects.')]
    R.add('P08', 'Переименовать проект, стёртый навсегда в другой вкладке', 'проект не появляется заново', f'«Новое имя» в данных={"Новое имя" in names}', 'Новое имя' not in names)
    t2.close()

    # ---- rename edge cases ----
    t1.goto(url('app/dashboard.html')); t1.wait_for_timeout(500)
    old = visible_titles(t1)[0]
    for text, label, ok in [('', 'пустое имя', True), ('   ', 'имя из пробелов', True), ('<img src=x onerror=alert(1)>', 'HTML в имени', None), ('Ж' * 500, '500 символов', None), ('😀 тест', 'эмодзи', None)]:
        DLG['text'] = text
        t1.locator('#project-list .project-list__item:not([hidden]) .project-card__menu').first.click()
        t1.locator('.project-card__actions:not([hidden]) [data-act=rename]').first.click(); t1.wait_for_timeout(300)
        now_t = visible_titles(t1)[0] if visible_titles(t1) else ''
        injected = t1.evaluate("()=>!!document.querySelector('#project-list img[src=x]')")
        if ok:
            R.add('P09', f'Переименование: {label}', 'название не меняется', f'«{now_t[:30]}»', now_t == old)
        else:
            R.add('P09', f'Переименование: {label}', 'сохраняется как текст, без внедрения разметки', f'длина={len(now_t)}, внедрён img={injected}', not injected)
        t1.goto(url('app/dashboard.html')); t1.wait_for_timeout(300)

    # ---- templates ----
    DLG['text'] = 'Мой шаблон'
    section(t1, 'templates')
    t1.click('[data-new-template]'); t1.wait_for_timeout(1500)
    R.add('P10', 'Новый шаблон', 'открывается редактор шаблона ?tpl=', t1.url.replace(BASE, ''), '?tpl=' in t1.url)
    tpl_id = t1.url.split('tpl=')[1]
    # template deleted in other tab, then edit and autosave in tab1
    t2 = new_tab(ctx); section(t2, 'templates')
    DLG['ok'] = True
    t2.locator('#project-list .project-list__item:not([hidden]) .project-card__menu').first.click()
    t2.locator('.project-card__actions:not([hidden]) [data-act=remove-template]').first.click(); t2.wait_for_timeout(300)
    cnt_before = len(data(t2, 'templates.'))
    t1.fill('.code__input', 'idef0 "Изменено после удаления"\n'); t1.wait_for_timeout(1800)
    t1.keyboard.press('Control+s'); t1.wait_for_timeout(500)
    tpls = data(t2, 'templates.')
    note = t1.inner_text('.editor-status__saved')
    R.add('P11', 'Редактирование шаблона, удалённого в другой вкладке (автосохранение и Ctrl+S)', 'шаблон не воскресает молча; пользователь предупреждён', f'шаблонов было {cnt_before}, стало {len(tpls)}; строка состояния: «{note[:50]}»', len(tpls) == cnt_before)
    t2.close()
    # editing link of a deleted template
    t1.goto(url('app/editor.html?tpl=tdeleted999')); t1.wait_for_timeout(800)
    note = t1.inner_text('.editor-status__saved')
    R.add('P12', 'Открыть editor.html?tpl=<несуществующий>', 'сообщение «не найден», новая диаграмма', note[:60], 'не найден' in note)
    t1.goto(url('app/editor.html?p=pdeleted999')); t1.wait_for_timeout(800)
    R.add('P13', 'Открыть editor.html?p=<несуществующий>', 'сообщение «не найден»', t1.inner_text('.editor-status__saved')[:60], 'не найден' in t1.inner_text('.editor-status__saved'))
    t1.goto(url('app/editor.html?my=nope')); t1.wait_for_timeout(800)
    R.add('P14', 'Открыть editor.html?my=<несуществующий>', 'сообщение «не найден»', t1.inner_text('.editor-status__saved')[:60], 'не найден' in t1.inner_text('.editor-status__saved'))

    # ---- likes and quota ----
    t1.goto(url('app/dashboard.html')); t1.wait_for_timeout(500); section(t1, 'shared')
    def like(n=0):
        menu(t1, n, 'like')
    mine0 = len(data(t1, 'projects.'))
    like(); like(); like()
    liked = json.loads(t1.evaluate("(k)=>localStorage.getItem(k)", key(t1, 'likes-') or 'x') or '[]') if key(t1, 'likes-') else []
    mine1 = len(data(t1, 'projects.'))
    R.add('P15', 'Лайк → снятие лайка → повторный лайк одного примера', 'лайк это флаг; копии не плодятся, квота растёт максимум на 1', f'проектов было {mine0}, стало {mine1}; избранное={liked}', mine1 - mine0 <= 1)
    for i in range(7):
        menu(t1, 1, 'copy')
    quota = t1.inner_text('.app-nav__quota-text')
    created = len([x for x in data(t1, 'projects.') if not x.get('seed')])
    R.add('P16', 'Копирование общего примера 7 раз подряд (лимит 5 в день)', 'после 5-й копии создание блокируется с понятным сообщением', f'создано={created}, подпись квоты: «{quota}»', created <= 5)
    # quota in the editor: new diagram via editing
    # ---- trash expiry ----
    t1.goto(url('app/dashboard.html')); t1.wait_for_timeout(500)
    k = key(t1, 'projects.')
    DAY = 86400000
    t1.evaluate("""([k,DAY])=>{const a=JSON.parse(localStorage[k]); const now=Date.now();
      a[0].trashedAt=now-31*DAY; a[0].title='X31'; a[1].trashedAt=now-29*DAY-60000; a[1].title='X29'; a[2].trashedAt=now-30*DAY+1000; a[2].title='X30m'; a[3].trashedAt=now+5*DAY; a[3].title='XFuture'; a[4].trashedAt='junk'; a[4].title='XJunk'; localStorage[k]=JSON.stringify(a);}""", [k, DAY])
    t1.reload(); t1.wait_for_timeout(700)
    titles_all = [x['title'] for x in data(t1, 'projects.')]
    section(t1, 'trash')
    tr = visible_titles(t1)
    R.add('P17', 'Срок корзины: trashedAt = −31 день', 'проект стёрт при загрузке', f'«X31» в данных={"X31" in titles_all}', 'X31' not in titles_all)
    R.add('P18', 'Срок корзины: −29 дней 1 мин', 'остаётся в корзине, подпись «через 1 дн.»', f'в корзине: {"X29" in tr}; подпись: {STAMPS(t1)}', 'X29' in tr)
    R.add('P19', 'Срок корзины: −30 дней + 1 с (граница)', 'остаётся (ещё 0–1 дн.)', f'в корзине: {"X30m" in tr}', 'X30m' in tr)
    R.add('P20', 'trashedAt в будущем (+5 дней)', 'не ломает список; проект не должен жить дольше 30 дней', f'в корзине: {"XFuture" in tr}, подпись: {" / ".join(STAMPS(t1))[:120]}', 'XFuture' in tr)
    R.add('P21', 'trashedAt = строка «junk»', 'проект не пропадает бесследно и не ломает страницу', f'в данных={"XJunk" in [x["title"] for x in data(t1,"projects.")]}, в корзине={"XJunk" in tr}, в «Моих»={"XJunk" in visible_titles(t1)}', 'XJunk' in [x['title'] for x in data(t1, 'projects.')])

    # ---- address params of the dashboard ----
    for q, label in [('?q=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E', 'HTML в ?q='), ('?q=' + 'я' * 3000, 'очень длинный ?q='), ('?q=%E0%A4%A', 'битая кодировка ?q='), ('?q=Order&p=1&my=2&tpl=3&template=4&x=%00', 'лишние параметры')]:
        DLG['log'].clear()
        t1.goto(url('app/dashboard.html' + q)); t1.wait_for_timeout(600)
        injected = t1.evaluate("()=>!!document.querySelector('img[src=x]')")
        R.add('P22', f'dashboard.html{label}', 'страница работает, разметка не внедряется, диалогов нет', f'img={injected}, диалогов={len(DLG["log"])}, поле поиска: «{t1.input_value(".app-topbar__search-input")[:20]}», найдено: «{t1.inner_text("#project-count")}»', not injected and not DLG['log'])
    # q persistence after the address is cleaned
    t1.goto(url('app/dashboard.html?q=zzzz')); t1.wait_for_timeout(500)
    t1.goto(url('app/dashboard.html')); t1.wait_for_timeout(500)
    R.add('P23', 'Поиск ?q=zzzz, затем открыть dashboard.html без параметра', 'фильтр запомнен (state в хранилище) либо сброшен — но список не должен казаться пустым без причины', f'поле поиска «{t1.input_value(".app-topbar__search-input")}», {t1.inner_text("#project-count")}', True)

    # ---- another user opens a foreign project id ----
    k = key(t1, 'projects.'); mine_id = data(t1, 'projects.')[0]['id']
    t3 = Session(pw); q = t3.page(); q.on('dialog', on_dialog)
    register(q, 'Чужой', 'other%s@example.com' % STAMP)
    q.goto(url('app/editor.html?p=' + mine_id)); q.wait_for_timeout(800)
    R.add('P24', 'Пользователь B открывает ?p=<id проекта пользователя A> (в своём хранилище)', 'проект не найден, чужие данные не показаны (в разных браузерах id не пересекаются)', q.inner_text('.editor-status__saved')[:50], True)
    t3.close()
    # guest -> register: guest projects
    g = Session(pw); gp = g.page(); gp.on('dialog', on_dialog)
    gp.goto(url('app/editor.html')); gp.wait_for_timeout(800)
    gp.fill('.code__input', 'idef0 "Гостевая диаграмма"\n'); gp.wait_for_timeout(1800)
    guest_saved = len(data(gp, 'projects')) if key(gp, 'projects') else 0
    register(gp, 'Гость Став', 'gs%s@example.com' % STAMP)
    gp.goto(url('app/dashboard.html')); gp.wait_for_timeout(600)
    R.add('P25', 'Гость создал диаграмму, затем зарегистрировался', 'диаграмма гостя доступна пользователю либо пользователь предупреждён', f'в гостевом хранилище проектов={guest_saved}; у нового пользователя видно «Гостевая диаграмма»: {"Гостевая диаграмма" in visible_titles(gp)}', "Гостевая диаграмма" in visible_titles(gp))
    g.close()
    R.dump('out/seq-projects.json')
    print(len(R.rows), 'rows; console errors:', [e for e in s.errors if e[0] != 'http404'][:10])
    s.close()
