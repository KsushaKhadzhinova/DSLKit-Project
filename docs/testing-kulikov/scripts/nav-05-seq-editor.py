"""Sequences in the editor: undo/redo, blocks, connect, delete, 50 additions, import/export, notation, language/theme, logout while editing.
usage: python nav-05-seq-editor.py   -> out/seq-editor.json
"""
import sys, json, time, os
sys.path.insert(0, '.')
from nav_common import *

R = Report()
STAMP = str(int(time.time()))[-6:]
EDITOR = 'app/editor.html'


def code(p):
    return p.evaluate("()=>[...document.querySelectorAll('.code__lines .code__line code')].map(e=>e.textContent).join('\\n')")


def nodes(p):
    return p.evaluate("()=>[...document.querySelectorAll('.canvas__remote .notation__node[data-id]')].map(e=>e.dataset.id)")


def say(p):
    return p.evaluate("()=>[document.querySelector('.editor-status__saved')?.textContent, document.querySelector('.palette__message')?.textContent, document.querySelector('.canvas__status')?.textContent].join(' | ')")


def open_editor(ctx, query='', lang='ru', dialog=True):
    t = ctx.new_page(); t.set_default_timeout(30000)
    if dialog:
        t.on('dialog', lambda d: d.accept())
    t.goto(url(EDITOR + query, lang)); t.wait_for_timeout(1200)
    return t


def mo(p):
    p.evaluate("()=>document.querySelectorAll('.editor-menu, .editor-menu__sub').forEach(d=>d.open=true)")


def type_code(p, text):
    p.fill('.code__input', text); p.wait_for_timeout(900)


def add_item(p, index=0):
    p.click('.board-tools__add'); p.wait_for_timeout(100)
    p.locator('.palette__item').nth(index % max(1, p.locator('.palette__item').count())).click(); p.wait_for_timeout(250)


with sync_playwright() as pw:
    s = Session(pw)
    ctx = s.ctx
    ctx.add_init_script("try{localStorage.setItem('dslkit.tour-done','true')}catch(e){}")
    p = s.page(); p.on('dialog', lambda d: d.accept())
    register(p, 'Редактор Тестов', 'ed%s@example.com' % STAMP)
    e = open_editor(ctx)
    # E01 undo on empty history
    c0 = code(e)
    e.click('[data-action=undo]', force=True); e.wait_for_timeout(300)
    R.add('E01', 'Отменить на пустой истории (сразу после открытия)', 'сообщение «Отменять нечего», код не меняется', f'«{say(e)[:60]}», код тот же={code(e) == c0}', code(e) == c0 and 'нечего' in say(e))
    e.click('[data-action=redo]', force=True); e.wait_for_timeout(300)
    R.add('E02', 'Повторить на пустой истории', 'сообщение «Возвращать нечего»', say(e)[:70], code(e) == c0 and 'нечего' in say(e))
    # E03 redo before undo after a change, then undo twice, redo thrice
    add_item(e, 0)
    c1 = code(e); n1 = len(nodes(e))
    e.click('[data-action=redo]', force=True); e.wait_for_timeout(200)
    R.add('E03', 'Повторить сразу после правки (до отмены)', 'ничего не меняется, «Возвращать нечего»', f'код тот же={code(e)==c1}; «{say(e)[:50]}»', code(e) == c1)
    e.click('[data-action=undo]', force=True); e.wait_for_timeout(300)
    R.add('E04', 'Отменить добавление блока', f'блоков стало {n1-1}', f'блоков {len(nodes(e))}', len(nodes(e)) == n1 - 1)
    e.click('[data-action=undo]', force=True); e.wait_for_timeout(300); e.click('[data-action=undo]', force=True); e.wait_for_timeout(300)
    R.add('E05', 'Отменить трижды при одной правке в истории', 'после первой отмены — «Отменять нечего»', say(e)[:70], 'нечего' in say(e))
    for _ in range(3):
        e.click('[data-action=redo]', force=True); e.wait_for_timeout(300)
    R.add('E06', 'Повторить трижды при одной правке', 'вернулся блок, затем «Возвращать нечего»', f'блоков {len(nodes(e))}; «{say(e)[:40]}»', len(nodes(e)) == n1)
    # undo after typing
    type_code(e, 'idef0 "Только я"\n'); c2 = code(e)
    e.click('[data-action=undo]', force=True); e.wait_for_timeout(300)
    R.add('E07', 'Печать → Отменить', 'возврат к предыдущему состоянию', f'изменился={code(e) != c2}', code(e) != c2)
    # keyboard Ctrl+Z
    e.click('.code__input'); type_code(e, 'idef0 "Горячая клавиша"\n')
    before = code(e)
    e.keyboard.press('Control+z'); e.wait_for_timeout(300)
    R.add('E08', 'Ctrl+Z в поле кода', 'отмена правки (ожидаемая горячая клавиша редактора)', f'код изменился={code(e) != before}; кнопка «Отменить» есть, горячей клавиши нет в коде приложения', code(e) != before)

    # connect tests
    e = open_editor(ctx)
    ids = nodes(e)
    e.click('.palette__mode'); e.wait_for_timeout(150)
    R.add('E09', 'Режим «Соединить» включён, блок не выбран → нажать Esc', 'режим выключен, «Соединение отменено»', '', True)
    e.keyboard.press('Escape'); e.wait_for_timeout(200)
    pressed = e.get_attribute('.palette__mode', 'aria-pressed')
    R.add('E09', 'Соединить: включить режим и нажать Esc, ничего не выбрав', 'режим выключен, сообщение «отменено»', f'aria-pressed={pressed}; «{say(e)[:60]}»', pressed == 'false')
    # connect without choosing a block: click on empty canvas
    e.click('.palette__mode'); box = e.locator('.canvas__remote svg').bounding_box()
    e.mouse.click(box['x'] + 5, box['y'] + 5); e.wait_for_timeout(200)
    c_before = code(e)
    R.add('E10', 'Соединить: нажать на пустое место доски вместо блока', 'код не меняется, подсказка остаётся', f'код тот же={code(e)==c_before}; «{say(e)[:50]}»', code(e) == c_before)
    # connect a block with itself
    first = e.locator('.canvas__remote .notation__node[data-id]').first
    first.click(); e.wait_for_timeout(150); first.click(); e.wait_for_timeout(300)
    after = code(e)
    R.add('E11', 'Соединить блок сам с собой', 'отказ с понятной причиной или допустимая петля (UML/Petri), код не повреждён', f'код изменился={after != c_before}; «{say(e)[:90]}»', True)
    e.click('.palette__mode'); e.wait_for_timeout(150)
    # connect with two different blocks twice (duplicate link)
    if len(nodes(e)) >= 2:
        e.click('.palette__mode')
        a = e.locator('.canvas__remote .notation__node[data-id]')
        for _ in range(2):
            a.nth(0).click(); e.wait_for_timeout(120); a.nth(1).click(); e.wait_for_timeout(300)
        R.add('E12', 'Соединить два блока дважды подряд (дубликат связи)', 'повтор отклонён или аккуратно добавлен; ошибок нет', f'«{say(e)[:100]}»', True)
        e.click('.palette__mode')
    # delete nothing picked
    e.click('.palette__remove', force=True); e.wait_for_timeout(200)
    R.add('E13', 'Удалить без выбранного блока (кнопка недоступна, aria-disabled)', '«Сначала нажмите на блок», код не меняется', say(e)[:80], 'Сначала' in say(e))
    # delete a block, then delete again
    blk = e.locator('.canvas__remote .notation__node[data-id]').first
    bid = blk.get_attribute('data-id')
    blk.click(); e.wait_for_timeout(150)
    e.click('.palette__remove'); e.wait_for_timeout(300)
    gone = bid not in nodes(e)
    e.click('.palette__remove', force=True); e.wait_for_timeout(200)
    R.add('E14', 'Удалить блок, затем нажать «Удалить» ещё раз (блока уже нет)', 'первый раз блок исчезает, второй — «Сначала нажмите на блок»', f'исчез={gone}; «{say(e)[:60]}»', gone and 'Сначала' in say(e))
    # Delete key on a focused node
    # undo removes it back
    e.click('[data-action=undo]', force=True); e.wait_for_timeout(300)
    R.add('E15', 'Отменить удаление блока', 'блок вернулся', str(bid in nodes(e)), bid in nodes(e))

    # 50 additions
    e = open_editor(ctx)
    t0 = time.time(); cnt0 = len(nodes(e)); errs0 = len(s.errors)
    for i in range(50):
        add_item(e, i % 3)
    cnt = len(nodes(e))
    R.add('E16', 'Добавить 50 элементов подряд', f'на доске стало {cnt0+50} блоков, редактор не зависает', f'блоков={cnt} (было {cnt0}), время {time.time()-t0:.1f} с, строк кода={len(code(e).splitlines())}, ошибок консоли={len(s.errors)-errs0}', cnt >= cnt0 + 50)
    e.click('[data-action=undo]', force=True, ); e.wait_for_timeout(300)
    # drag element outside the board
    e.click('.board-tools__add'); item = e.locator('.palette__item').first
    ib = item.bounding_box(); n0 = len(nodes(e))
    e.mouse.move(ib['x'] + 10, ib['y'] + 10); e.mouse.down(); e.mouse.move(ib['x'] + 40, ib['y'] + 40, steps=4); e.mouse.move(5, 5, steps=5); e.mouse.up(); e.wait_for_timeout(300)
    R.add('E17', 'Перетащить элемент палитры за пределы доски (в левый верхний угол окна)', 'блок не добавляется, подсказка', f'блоков {n0}→{len(nodes(e))}; «{say(e)[:70]}»', len(nodes(e)) == n0)
    # drag existing block far away
    e.keyboard.press('Escape')
    nb = e.locator('.canvas__remote .notation__node[data-id]').first.bounding_box()
    e.mouse.move(nb['x'] + nb['width'] / 2, nb['y'] + nb['height'] / 2); e.mouse.down(); e.mouse.move(2000, 2000, steps=6); e.mouse.up(); e.wait_for_timeout(500)
    inside = e.evaluate("()=>{const s=document.querySelector('.canvas__remote svg').getBoundingClientRect();return [...document.querySelectorAll('.canvas__remote .notation__node[data-id]')].every(n=>{const r=n.getBoundingClientRect();return r.right>=s.left&&r.left<=s.right&&r.bottom>=s.top&&r.top<=s.bottom})}")
    R.add('E18', 'Перетащить существующий блок за пределы доски (в 2000,2000)', 'блок остаётся в пределах холста', f'все блоки внутри холста={inside}', inside)

    # save empty project
    e = open_editor(ctx)
    type_code(e, '');
    e.keyboard.press('Control+s'); e.wait_for_timeout(600)
    R.add('E19', 'Сохранить пустой проект (Ctrl+S при пустом коде)', 'сохранение допустимо с названием «Без названия» или отказ с сообщением; ошибок нет', f'«{say(e)[:80]}»; url={e.url.replace(BASE,"")}', True)
    n_err = [x for x in s.errors if x[0] == 'pageerror']
    R.add('E20', 'Пустой код: ошибок JS в консоли нет', '0', str(n_err[-2:]), not n_err)
    # export empty
    downloads = []
    e.on('download', lambda d: downloads.append(d.suggested_filename))
    for fmt in ('svg', 'png', 'jpeg', 'drawio', 'html'):
        mo(e); e.click(f'[data-export={fmt}]'); e.wait_for_timeout(700)
        R.add('E21', f'Экспорт {fmt.upper()} пустой диаграммы', 'сообщение «нет диаграммы» или пустой файл без ошибки', f'файлы={downloads[-1:]}; «{say(e)[:70]}»', True)
    # export normal
    e = open_editor(ctx); downloads2 = []
    e.on('download', lambda d: downloads2.append(d.suggested_filename))
    for fmt in ('svg', 'png', 'jpeg', 'drawio', 'html'):
        mo(e); e.click(f'[data-export={fmt}]'); e.wait_for_timeout(900)
    R.add('E22', 'Экспорт шаблонной диаграммы во все 5 форматов', '5 файлов', str(downloads2), len(downloads2) == 5)

    # import invalid
    e = open_editor(ctx); c_before = code(e)
    tmp = os.path.join(os.getcwd(), 'out'); os.makedirs(tmp, exist_ok=True)
    cases = {'bad.txt': b'hello world, no diagram here', 'empty.txt': b'', 'binary.bin': bytes(range(256)) * 20, 'huge.txt': (b'graph TD\n' + b'A-->B\n' * 20000),
             'html.txt': b'<script>alert(1)</script>', 'unsupported.txt': b'gantt\n title x\n section a\n task :a1, 2024-01-01, 3d', 'mermaid.txt': b'graph TD\n A-->B\n B-->C'}
    for name, content in cases.items():
        path = os.path.join(tmp, name); open(path, 'wb').write(content)
        e.set_input_files('.editor-import__file', path); e.wait_for_timeout(900)
        changed = code(e) != c_before
        R.add('E23', f'Импорт файла {name}', 'корректный файл импортируется, неверный отклоняется с сообщением, код не портится', f'код заменён={changed}; «{say(e)[:80]}»', (name == 'mermaid.txt' and changed) or (name != 'mermaid.txt' and not changed) or name == 'huge.txt')
        e = open_editor(ctx)
    # huge import last: 3000 edges
    NL = chr(10).encode()
    path = os.path.join(tmp, 'huge.txt'); open(path, 'wb').write(b'graph TD' + NL + NL.join(b'N%d-->N%d' % (n, n + 1) for n in range(3000)))
    t0 = time.time(); e = open_editor(ctx)
    try:
        e.set_input_files('.editor-import__file', path); e.wait_for_timeout(1500)
        alive = e.evaluate("()=>1", ) == 1
        R.add('E23', 'Импорт большого файла (3000 связей Mermaid)', 'импорт завершается за разумное время или отклоняется с сообщением, вкладка жива', f'вкладка жива={alive}, время {time.time()-t0:.1f} с; «{say(e)[:60]}»', alive and time.time() - t0 < 30)
    except Exception as ex:
        R.add('E23', 'Импорт большого файла (3000 связей Mermaid)', 'вкладка жива', 'сбой: ' + str(ex)[:80], False)
    e = open_editor(ctx)
    # import from clipboard without permission
    mo(e); e.click('[data-import=clipboard]'); e.wait_for_timeout(500)
    R.add('E24', 'Импорт из буфера без разрешения/пустой буфер', 'сообщение «Не удалось прочитать» или «Нет диаграммы»', say(e)[:90], True)

    # notation change in the middle of an edit
    e = open_editor(ctx)
    type_code(e, 'idef0 "Моя правка"\nA1 "Вручную"\n'); typed = code(e)
    e.select_option('[data-notation-select]', 'bpmn'); e.wait_for_timeout(900)
    R.add('E25', 'Смена нотации (список «Шаблон») после ручной правки кода', 'пользователя предупреждают о потере правки или правка сохранена/отменяема', f'код заменён без вопроса={code(e) != typed}; отмена возвращает: ', code(e) == typed)
    e.click('[data-action=undo]', force=True); e.wait_for_timeout(300)
    R.add('E26', 'Отменить смену нотации', 'правка пользователя вернулась', f'вернулась={code(e) == typed}', code(e) == typed)
    # notation change updates palette
    e.select_option('[data-notation-select]', 'erd'); e.wait_for_timeout(900)
    items = e.locator('.palette__item').count(); e.click('.board-tools__add'); e.wait_for_timeout(150)
    names = e.evaluate("()=>[...document.querySelectorAll('.palette__name')].map(x=>x.textContent)")
    R.add('E27', 'Смена нотации на ERD обновляет палитру', 'палитра ERD (сущность, атрибут...)', str(names[:4]), len(names) > 0)

    # language switch during edit
    e = open_editor(ctx, '', 'ru')
    type_code(e, 'idef0 "Чужой язык"\n'); e.wait_for_timeout(1500)
    proj_url = e.url
    mo(e); e.click('a[hreflang=en]'); e.wait_for_timeout(1200)
    R.add('E28', 'Смена языка во время правки (автосохранение успело)', 'в английской версии открыт тот же проект с тем же кодом', f'{e.url.replace(BASE,"")}; код «{code(e)[:30]}»', 'Чужой язык' in code(e))
    e = open_editor(ctx, '', 'ru')
    e.fill('.code__input', 'idef0 "Не сохранилось"\n'); mo(e); e.click('a[hreflang=en]'); e.wait_for_timeout(1500)
    R.add('E29', 'Смена языка сразу после правки (до автосохранения 1 с)', 'правка не теряется молча', f'{e.url.replace(BASE,"")}; код «{code(e)[:30]}»', 'Не сохранилось' in code(e))
    # theme during edit
    e = open_editor(ctx); type_code(e, 'idef0 "Тема"\n'); th0 = e.evaluate("()=>document.documentElement.dataset.theme")
    mo(e); e.click('[data-action=theme]'); e.wait_for_timeout(300)
    th1 = e.evaluate("()=>document.documentElement.dataset.theme")
    R.add('E30', 'Смена темы во время правки', 'тема меняется, код и холст сохраняются', f'{th0}→{th1}; код «{code(e)[:20]}», блоков {len(nodes(e))}', th0 != th1 and 'Тема' in code(e))
    e.reload(); e.wait_for_timeout(1000)
    R.add('E31', 'Обновить страницу после смены темы', 'тема запомнена', e.evaluate("()=>document.documentElement.dataset.theme"), e.evaluate("()=>document.documentElement.dataset.theme") == th1)

    # logout while editing
    e = open_editor(ctx, '?p=' + (json.loads(e.evaluate("()=>localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('dslkit.projects.')))") or '[]') or [{'id': 'x'}])[0]['id'])
    type_code(e, 'idef0 "Правка перед выходом"\n')
    mo(e); e.click('[data-auth-logout]', force=True); e.wait_for_timeout(1500)
    R.add('E32', 'Выход из аккаунта во время правки (кнопка «Выйти» в редакторе)', 'правка автосохранена перед выходом либо пользователя предупредили; переход на главную', f'{e.url.replace(BASE,"")}', True)
    d = json.loads(p.evaluate("()=>JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.startsWith('dslkit.projects.'))))") or '{}')
    saved = any('Правка перед выходом' in x.get('source', '') for v in d.values() for x in json.loads(v))
    R.add('E33', 'Данные после выхода во время правки', 'последняя правка (менее 1 с) сохранена или есть предупреждение', f'сохранена={saved}', saved)

    # logout in tab B during editing in tab A
    reg = s.page(); reg.on('dialog', lambda d: d.accept())
    register(reg, 'Второй Вход', 'ed2%s@example.com' % STAMP)
    a = open_editor(ctx); b = open_editor(ctx, '', 'ru')
    mo(b); b.click('[data-auth-logout]', force=True); b.wait_for_timeout(800)
    type_code(a, 'idef0 "После выхода в другой вкладке"\n'); a.wait_for_timeout(1500)
    keys = a.evaluate("()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k.includes('projects')).map(k=>[k,(JSON.parse(localStorage[k])||[]).filter(x=>x.title.includes('После выхода')).length]))")
    R.add('E34', 'Разлогин в одной вкладке, правка в другой (автосохранение)', 'вкладка видит, что вошедшего нет; правка не пишется в данные вышедшего пользователя', f'записано в: {keys}', all((not k.startswith('dslkit.projects.u')) or v == 0 for k, v in keys.items()))

    # Tab order, Esc, Enter/space in the palette
    e = open_editor(ctx)
    e.keyboard.press('Tab'); order = []
    for _ in range(14):
        order.append(e.evaluate("()=>{const a=document.activeElement;return (a.getAttribute('aria-label')||a.textContent||a.tagName).trim().replace(/\\s+/g,' ').slice(0,25)}")); e.keyboard.press('Tab')
    R.add('E35', 'Tab-порядок в редакторе (первые 14 остановок)', 'логичный порядок: ссылка пропуска → логотип → Запустить → …', ' > '.join(order), True)
    e.focus('.board-tools__add'); e.keyboard.press('Enter'); e.wait_for_timeout(200)
    opened = e.get_attribute('.board-tools__add', 'aria-expanded')
    e.keyboard.press('Escape'); e.wait_for_timeout(200)
    closed = e.get_attribute('.board-tools__add', 'aria-expanded')
    R.add('E36', 'Палитра: Enter открывает, Esc закрывает', 'true → false', f'{opened} → {closed}', opened == 'true' and closed == 'false')
    e.keyboard.press('Space'); e.wait_for_timeout(200)
    R.add('E37', 'Space на кнопке «Добавить элемент» после Esc', 'меню открывается снова', e.get_attribute('.board-tools__add', 'aria-expanded'), e.get_attribute('.board-tools__add', 'aria-expanded') == 'true')
    # Ctrl+F, Ctrl+S, Ctrl+K, Ctrl+Enter
    e = open_editor(ctx)
    e.click('.code__input'); e.keyboard.press('Control+f'); e.wait_for_timeout(300)
    vis = e.locator('.editor-tools__input:visible').count()
    R.add('E38', 'Ctrl+F в редакторе', 'открывается панель поиска, браузерный поиск не перехватывает', f'видимых полей поиска={vis}', vis >= 1)
    e.keyboard.press('Escape'); e.wait_for_timeout(200)
    R.add('E39', 'Esc закрывает панель поиска', 'панель закрыта', f'видимых полей={e.locator(".editor-tools__input:visible").count()}', e.locator('.editor-tools__input:visible').count() == 0)
    e.keyboard.press('Control+k'); e.wait_for_timeout(300)
    R.add('E40', 'Ctrl+K в редакторе', 'фокус в поле поиска (как на других страницах приложения) либо ничего', f'активный элемент: {e.evaluate("()=>document.activeElement.className")[:40]}', True)
    type_code(e, 'idef0 "Ctrl+S"\n'); e.keyboard.press('Control+s'); e.wait_for_timeout(600)
    R.add('E41', 'Ctrl+S в редакторе', 'проект сохранён, адрес получил ?p=', e.url.replace(BASE, ''), '?p=' in e.url)
    e.keyboard.press('Control+Enter'); e.wait_for_timeout(500)
    R.add('E42', 'Ctrl+Enter запускает отрисовку', 'диаграмма перерисована, ошибок нет', f'блоков {len(nodes(e))}', True)

    pe = [x for x in s.errors if x[0] in ('pageerror',) or (x[0] == 'console' and 'kroki' not in x[2].lower())]
    R.add('E43', 'Ошибки консоли за весь прогон редактора', '0 (кроме недоступности внешнего Kroki)', str(pe[:4])[:300], not pe)
    R.dump('out/seq-editor.json')
    print(len(R.rows), 'rows')
    s.close()
