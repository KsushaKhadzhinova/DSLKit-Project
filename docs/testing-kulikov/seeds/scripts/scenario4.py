import sys; sys.path.insert(0, '.')
from common_ops import *

DAY = 86400000


def rec(k, v): print(k, v, flush=True)


def mk(t): return 'diagram bpmn "%s"\nstart s "Начало"\nend e "Конец"\nflow s -> e\n' % t


def stamps(u):
    return u.p.evaluate("()=>[...document.querySelectorAll('[data-trashed]:not([hidden])')].map(e=>e.querySelector('.project-card__link').textContent.trim()+' | '+e.querySelector('.project-card__updated').textContent.trim())")


with sync_playwright() as pw:
    b = pw.chromium.launch()
    u = User(b, 'Корзина', 'trash.user.r2@example.com').register()
    clear_projects(u)
    ages = [1, 15, 29, 29.9, 30, 31, 45]
    for d in ages: u.diagram(mk('Удалён %s дн. назад' % d))
    u.dash()
    for d in ages: u.card_act_title('Удалён %s дн. назад' % d, 'remove')
    u.p.click('[data-section="trash"]'); rec('trash right after delete', stamps(u))
    projs = u.get('projects.')
    now = int(time.time() * 1000)
    for pr in projs:
        d = float(pr['title'].split()[1]); pr['trashedAt'] = int(now - d * DAY)
    u.setj('projects.', projs)
    u.go('app/dashboard.html'); u.p.click('[data-section="trash"]'); u.p.wait_for_timeout(300)
    rec('trash after trashedAt shift', stamps(u)); rec('count', u.count_text())
    rec('stored after purge (30/31/45 must be gone)', [pr['title'] for pr in u.get('projects.')])
    rec('quota (deleted still count)', u.quota())
    snapshot(u, '../scenario-4.json')
    u.go('app/dashboard.html', 'en'); u.p.click('[data-section="trash"]'); rec('EN trash', stamps(u)); rec('EN count', u.count_text())
    u.go('app/dashboard.html'); u.p.click('[data-section="trash"]'); u.p.wait_for_timeout(200)
    u.card_act(0, 'restore'); rec('after restore trash', stamps(u))
    u.p.click('[data-section="mine"]'); rec('mine after restore', u.titles())
    u.p.click('[data-section="trash"]'); u.card_act(0, 'purge'); rec('after purge one', stamps(u))
    rec('search in trash', search(u, '15')); search(u, '')
    u.p.locator('[data-new-template] + button').click(); u.p.wait_for_timeout(300); rec('after empty', (stamps(u), u.count_text()))
    u.p.click('[data-section="mine"]'); u.card_act(0, 'remove')
    projs = u.get('projects.'); projs[0]['trashedAt'] = int(time.time() * 1000) + 5 * DAY
    u.setj('projects.', projs); u.go('app/dashboard.html'); u.p.click('[data-section="trash"]'); rec('future trashedAt', stamps(u))
    projs = u.get('projects.'); projs[0]['trashedAt'] = 'вчера'
    u.setj('projects.', projs); u.go('app/dashboard.html'); u.p.click('[data-section="trash"]'); rec('string trashedAt', (stamps(u), u.count_text()))
    rec('errors', u.errors); snapshot(u, '../scenario-4-corrupt-trashedAt.json'); b.close()
