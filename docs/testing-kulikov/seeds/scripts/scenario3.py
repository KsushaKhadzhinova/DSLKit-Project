import sys, json; sys.path.insert(0, '.')
from common_ops import *


def rec(k, v): print(k, v, flush=True)


big = 'diagram mindmap "Большой проект 100 КБ"\nroot r "Корень"\n' + ''.join(
    'topic t%d "Тема номер %d для заполнения объёма проекта"\nbranch r -> t%d\n' % (i, i, i) for i in range(1, 1000))
rec('big size bytes', len(big.encode('utf-8')))
BP = 'diagram bpmn "%s"\nstart s "Начало"\nend e "Конец"\nflow s -> e\n'
with sync_playwright() as pw:
    b = pw.chromium.launch()
    import os
    if not os.path.exists("../scenario-3a-empty.json"):
        a = User(b, 'Пустой', 'empty.user.r2@example.com').register()
        rec('A cleared', clear_projects(a))
        a.dash(); rec('A titles', a.titles()); rec('A count', a.count_text()); rec('A quota', a.quota())
        for sec in ['templates', 'shared', 'trash']:
            a.p.click('[data-section="%s"]' % sec); a.p.wait_for_timeout(250); rec('A ' + sec, (len(a.titles()), a.count_text()))
        a.p.click('[data-section="mine"]'); rec('A search on empty', search(a, 'abc')); search(a, '')
        a.go('app/dashboard.html', 'en'); a.p.click('[data-section="mine"]'); rec('A EN count', a.count_text())
        a.p.reload(); a.p.wait_for_timeout(600)
        rec('A after reload (starters must not return)', (len(a.titles()), a.count_text()))
        rec('A errors', a.errors); snapshot(a, '../scenario-3a-empty.json')


    u = User(b, 'Граничный', 'boundary.user.r4@example.com').register()
    rec('B cleared', clear_projects(u))
    rec('one line', u.diagram('diagram idef0 "Одна строка"'))
    rec('letter A', u.diagram(BP % 'A'))
    rec('spaces title', u.diagram(BP % '     '))
    for _ in range(2): rec('same title', u.diagram(BP % 'Одинаковое'))
    rec('same title idef0', u.diagram('diagram idef0 "Одинаковое"'))
    t0 = time.time(); u.p.set_default_timeout(90000); rec('100KB', u.diagram(big)); rec('100KB seconds', round(time.time() - t0, 1))
    u.dash(); rec('titles', u.titles()); rec('count', u.count_text()); rec('quota', u.quota())
    rec('stored titles', [(x['title'], len(x['source'])) for x in u.get('projects.')])
    idx = u.titles().index('Одна строка')
    DLG['text'] = '   '; u.card_act(idx, 'rename'); rec('rename to spaces', u.titles())
    DLG['text'] = 'Я'; u.card_act(idx, 'rename'); rec('rename to Я', u.titles()); DLG['text'] = None
    u.card_act(0, 'template'); u.p.click('[data-section="templates"]'); u.p.wait_for_timeout(300)
    rec('templates', (u.titles(), u.count_text()))
    for q in ['одинак', ' ', 'Я']:
        u.p.click('[data-section="mine"]'); rec('search %r' % q, search(u, q))
    search(u, '')
    for s_ in ['oldest', 'name', 'newest']: rec('sort ' + s_, sort(u, s_))
    u.go('app/dashboard.html', 'en'); u.p.click('[data-section="mine"]')
    rec('EN titles', u.titles()); rec('EN count', u.count_text()); rec('EN quota', u.quota())
    i = [k for k, t in enumerate(u.titles()) if 'Большой' in t][0]
    t0 = time.time(); u.p.locator('#project-list .project-list__item:not([hidden]) .project-card__link').nth(i).click()
    u.p.wait_for_selector('.code__input'); u.p.wait_for_timeout(1500)
    rec('open 100KB seconds', round(time.time() - t0, 1)); rec('100KB status', u.status()); rec('code len', len(u.code()))
    rec('B errors', u.errors)
    u.dash(); snapshot(u, '../scenario-3b-boundary.json')
    A = json.load(open('../scenario-3a-empty.json', encoding='utf-8')); B = json.load(open('../scenario-3b-boundary.json', encoding='utf-8'))
    json.dump({'users': [A, B]}, open('../scenario-3.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    b.close()
