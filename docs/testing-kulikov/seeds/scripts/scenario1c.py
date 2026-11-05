import sys; sys.path.insert(0, '.')
from common_ops import *
from sclib import DLG
def rec(k, v): print(k, v, flush=True)
with sync_playwright() as pw:
    b = pw.chromium.launch()
    u = User(b, 'Студент ИТиВП', 'student.itivp@example.com'); load_snapshot(u, '../scenario-1.json'); p = u.p
    u.dash(); search(u, '')
    i = [k for k, t in enumerate(u.titles()) if 'BPMN' in t][0]
    p.locator('#project-list .project-list__item:not([hidden]) .project-card__link').nth(i).click()
    p.wait_for_selector('.notation__node'); p.wait_for_timeout(600)
    # the stray link t1 -> t2 is removed by hand in the code (select the line text and delete it)
    txt = u.code().replace('flow t1 -> t2\n', '')
    p.fill('.code__input', txt); p.wait_for_timeout(800)
    # rename the added task T1 with the Edit tool (select the block, press the pencil, answer the prompt)
    DLG['text'] = 'Архивировать заказ'
    p.locator('.notation__node[data-id="T1"]').click(force=True); p.wait_for_timeout(200)
    p.click('.palette__edit'); p.wait_for_timeout(600); rec('rename', p.inner_text('.palette__message')); DLG['text'] = None
    # connect: t3 -> T1 exists? make T1 -> g2
    p.click('.palette__mode'); p.wait_for_timeout(200)
    p.locator('.notation__node[data-id="t3"]').click(force=True); p.wait_for_timeout(200)
    p.locator('.notation__node[data-id="T1"]').click(force=True); p.wait_for_timeout(500); rec('connect t3->T1', p.inner_text('.palette__message'))
    p.locator('.notation__node[data-id="T1"]').click(force=True); p.wait_for_timeout(200)
    p.locator('.notation__node[data-id="g2"]').click(force=True); p.wait_for_timeout(500); rec('connect T1->g2', p.inner_text('.palette__message'))
    p.click('.palette__mode'); u.save(); rec('status', u.status()); rec('code', u.code()); rec('errors', u.errors)
    p.evaluate("()=>localStorage.setItem('dslkit.tour-done','1')")
    u.dash(); search(u, ''); snapshot(u, '../scenario-1.json'); b.close()
