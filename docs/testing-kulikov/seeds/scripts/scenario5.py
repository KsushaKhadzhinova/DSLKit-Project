import sys; sys.path.insert(0, '.')
from common_ops import *


def rec(k, v): print(k, v, flush=True)


with sync_playwright() as pw:
    b = pw.chromium.launch()
    u = User(b, 'Общие', 'shared.user@example.com').register()
    clear_projects(u)
    u.dash('shared'); n = len(u.titles()); rec('examples', n); rec('count', u.count_text()); rec('quota start', u.quota())
    hearts = lambda: u.p.evaluate("()=>[...document.querySelectorAll('#project-list .project-list__item:not([hidden]) [data-act=like]')].map(b=>b.getAttribute('aria-pressed'))")
    for i in range(n):
        u.card_act(i, 'like')
        if i in (0, 3, 4, 5, 6, 32): rec('after like #%d' % (i + 1), u.quota())
    rec('pressed after 33 likes', hearts().count('true'))
    u.p.click('[data-section="mine"]'); rec('mine', len(u.titles())); rec('unique titles', len(set(u.titles())))
    u.p.click('[data-section="shared"]')
    u.card_act(0, 'like'); rec('unlike #1 pressed', hearts()[0])
    u.p.click('[data-section="mine"]'); rec('mine after unlike (copy stays?)', len(u.titles()))
    u.p.click('[data-section="shared"]'); u.card_act(0, 'like'); u.p.click('[data-section="mine"]'); rec('mine after re-like (second copy?)', len(u.titles()))
    u.p.click('[data-section="shared"]')
    for i in range(n): u.card_act(i, 'copy-template')
    for i in range(n): u.card_act(i, 'copy')
    u.card_act(0, 'copy'); u.card_act(0, 'copy-template')
    u.p.click('[data-section="mine"]'); rec('mine total', u.count_text()); rec('quota', u.quota())
    u.p.click('[data-section="templates"]'); rec('templates total', u.count_text())
    rec('likes', u.get('likes-'))
    rec('stored count / unique titles', (len(u.get('projects.')), len({x['title'] for x in u.get('projects.')})))
    u.p.click('[data-section="shared"]')
    rec('search "uml"', search(u, 'uml')); search(u, '')
    for f in ['bpmn', 'erd', 'dfd', 'idef0']: rec('chip ' + f, chip(u, f))
    chip(u, 'all')
    for s_ in ['oldest', 'name']: rec('sort ' + s_, sort(u, s_)[:5])
    sort(u, 'newest')
    u.go('app/dashboard.html', 'en'); u.p.click('[data-section="shared"]'); rec('EN shared count', u.count_text()); rec('EN first', u.titles()[:3]); rec('EN like label', u.p.inner_text('#project-list [data-act=like]'))
    u.p.click('[data-section="mine"]'); rec('EN quota', u.quota()); rec('EN mine count', u.count_text())
    rec('errors', u.errors); snapshot(u, '../scenario-5.json'); b.close()
