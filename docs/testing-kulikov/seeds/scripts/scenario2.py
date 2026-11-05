import sys; sys.path.insert(0, '.')
from common_ops import *
from dsl import *


def rec(k, v): print(k, v, flush=True)


with sync_playwright() as pw:
    b = pw.chromium.launch()
    u = User(b, 'Аналитик Компании', 'analyst.company.en@example.com', lang='en').register()  # EN interface this time
    rec('cleared', clear_projects(u))
    for i, (name, d) in enumerate(COMPANY.items()):
        rec(name, u.diagram(d, typed=(i == 0)))
    u.dash(); rec('titles', u.titles()); rec('count', u.count_text()); rec('quota', u.quota())
    rec('search "Org"', search(u, 'Org')); rec('search RU word in EN UI', search(u, 'орг')); rec('search upper', search(u, 'ОРГ')); search(u, '')
    for f in ['bpmn', 'erd', 'dfd', 'idef0']: rec('chip ' + f, chip(u, f))
    chip(u, 'all')
    for k in ['c4', 'epc', 'orgchart', 'network', 'decision', 'mindmap']:
        u.p.select_option('#notation-filter', k); u.p.wait_for_timeout(200); rec('other ' + k, u.titles())
    u.p.select_option('#notation-filter', '')
    for s_ in ['oldest', 'name', 'newest']: rec('sort ' + s_, sort(u, s_))
    u.go('app/dashboard.html', 'ru'); rec('RU titles', u.titles()); rec('RU count', u.count_text()); rec('RU quota', u.quota())
    rec('RU sort name', sort(u, 'name'))
    rec('RU other values', u.p.evaluate("()=>[...document.querySelectorAll('#notation-filter option')].map(o=>o.textContent)"))
    p = u.p
    for key in ['mindmap', 'orgchart']:
        u.dash(); idx = [i for i, t in enumerate(u.titles()) if COMPANY[key].split('"')[1] in t][0]
        p.locator('#project-list .project-list__item:not([hidden]) .project-card__link').nth(idx).click()
        p.wait_for_selector('.notation__node'); p.wait_for_timeout(500)
        n0 = p.locator('.notation__node[data-id]').count()
        p.click('.board-tools__add'); p.locator('.palette__item').nth(1).click(); p.wait_for_timeout(700)
        n1 = p.locator('.notation__node[data-id]').count()
        rec(key + ' add', (n0, n1, p.inner_text('.palette__message')))
        u.save()
    rec('errors', u.errors)
    u.dash(); snapshot(u, '../scenario-2.json')
    b.close()
