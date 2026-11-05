import sys; sys.path.insert(0,'.')
from common_ops import *
from dsl import *
R = []
def rec(k, v): R.append((k, v)); print(k, v, flush=True)
with sync_playwright() as pw:
    b = pw.chromium.launch()
    u = User(b, 'Студент ИТиВП', 'student.itivp@example.com').register()
    rec('cleared starters', clear_projects(u))
    first = True
    for name, d in COURSE.items():
        st = u.diagram(d, typed=first)   # the first diagram is typed key by key, the others are pasted
        first = False
        rec(name, st)
    # palette tools on BPMN: add, connect, rename, drag
    p = u.p
    u.dash(); 
    idx = [i for i, t in enumerate(u.titles()) if 'BPMN' in t][0]
    p.locator('#project-list .project-list__item:not([hidden]) .project-card__link').nth(idx).click()
    p.wait_for_selector('.notation__node'); p.wait_for_timeout(600)
    before = u.code()
    p.click('.board-tools__add'); p.wait_for_timeout(200)
    items = p.locator('.palette__item')
    rec('palette items', items.count())
    items.nth(1).click(); p.wait_for_timeout(700)
    rec('after add', p.inner_text('.palette__message'))
    nodes = p.locator('.notation__node[data-id]')
    rec('nodes', nodes.count())
    # connect last two nodes
    p.click('.palette__mode'); p.wait_for_timeout(200)
    ids = p.evaluate("()=>[...document.querySelectorAll('.notation__node[data-id]')].map(n=>n.dataset.id)")
    rec('ids', ids)
    p.locator(f'.notation__node[data-id="{ids[-1]}"]').click(force=True); p.wait_for_timeout(200)
    p.locator(f'.notation__node[data-id="{ids[0]}"]').click(force=True); p.wait_for_timeout(600)
    rec('connect', p.inner_text('.palette__message'))
    # rename: select a node, double click
    p.locator('.notation__node[data-id="t1"]').dblclick(force=True); p.wait_for_timeout(500)
    rec('rename msg', p.inner_text('.palette__message'))
    # drag t2
    box = p.locator('.notation__node[data-id="t2"]').bounding_box()
    if box:
        x, y = box['x'] + box['width']/2, box['y'] + box['height']/2
        p.mouse.move(x, y); p.mouse.down(); p.mouse.move(x+60, y+40, steps=8); p.mouse.up(); p.wait_for_timeout(700)
    rec('drag changed code', u.code() != before)
    rec('code tail', u.code()[-300:])
    u.save()
    rec('status', u.status())
    # list checks
    u.dash()
    rec('titles', u.titles()); rec('count', u.count_text()); rec('quota', u.quota())
    rec('search "ЛР4"', search(u, 'ЛР4')); rec('search "лр4" lower', search(u, 'лр4'))
    rec('search none', search(u, 'zzzz')); search(u, '')
    for f in ['bpmn', 'erd', 'dfd', 'idef0']: rec('chip ' + f, chip(u, f))
    chip(u, 'all')
    rec('other filter petri', (u.p.select_option('#notation-filter', 'petri'), u.titles())[1]); u.p.select_option('#notation-filter', '')
    for s_ in ['oldest', 'name', 'newest']: rec('sort ' + s_, sort(u, s_))
    u.go('app/dashboard.html', 'en'); rec('EN titles', u.titles()); rec('EN count', u.count_text()); rec('EN quota', u.quota())
    rec('EN search', search(u, 'DFD'))
    rec('errors', u.errors)
    snapshot(u, '../scenario-1.json')
    u.p.screenshot(path='../scenario-1-dashboard-en.png')
    b.close()
