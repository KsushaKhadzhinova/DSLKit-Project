import sys; sys.path.insert(0, '.')
from common_ops import *
def rec(k, v): print(k, v, flush=True)
with sync_playwright() as pw:
    b = pw.chromium.launch()
    u = User(b, 'Студент ИТиВП', 'student.itivp@example.com'); load_snapshot(u, '../scenario-1.json'); p = u.p
    u.dash(); search(u, '')
    i = [k for k, t in enumerate(u.titles()) if 'BPMN' in t][0]
    p.locator('#project-list .project-list__item:not([hidden]) .project-card__link').nth(i).click()
    p.wait_for_selector('.notation__node'); p.wait_for_timeout(600)
    # rename T1 by the pencil button: an input opens over the block
    p.locator('.notation__node[data-id="T1"]').click(force=True); p.wait_for_timeout(200)
    p.click('.palette__edit'); p.wait_for_selector('.board-edit')
    p.fill('.board-edit', 'Архивировать заказ'); p.keyboard.press('Enter'); p.wait_for_timeout(700)
    rec('rename T1', p.inner_text('.palette__message'))
    # rename t1 by a double click, finish with a click elsewhere (blur keeps the text)
    p.locator('.notation__node[data-id="t1"]').dblclick(force=True); p.wait_for_selector('.board-edit')
    p.fill('.board-edit', 'Проверить заказ и оплату'); p.keyboard.press('Enter'); p.wait_for_timeout(700)
    rec('rename t1', p.inner_text('.palette__message'))
    # drag g1 a bit
    box = p.locator('.notation__node[data-id="g1"]').bounding_box()
    x, y = box['x'] + box['width']/2, box['y'] + box['height']/2
    p.mouse.move(x, y); p.mouse.down(); p.mouse.move(x, y + 40, steps=8); p.mouse.up(); p.wait_for_timeout(700)
    u.save(); rec('status', u.status()); rec('code', u.code()); rec('errors', u.errors)
    u.dash(); search(u, ''); snapshot(u, '../scenario-1.json'); b.close()
