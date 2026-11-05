import sys; sys.path.insert(0, '.')
from common_ops import *
def rec(k, v): print(k, v, flush=True)
with sync_playwright() as pw:
    b = pw.chromium.launch()
    u = User(b, 'Студент ИТиВП', 'student.itivp@example.com'); load_snapshot(u, '../scenario-1.json'); p = u.p
    p.evaluate("()=>localStorage.setItem('dslkit.tour-done','1')")
    u.dash(); search(u, '')
    i = [k for k, t in enumerate(u.titles()) if 'BPMN' in t][0]
    p.locator('#project-list .project-list__item:not([hidden]) .project-card__link').nth(i).click()
    p.wait_for_selector('.notation__node'); p.wait_for_timeout(600)
    # remove the dangling E1 and the extra flow by hand-made undo: select E1, press the delete button
    p.locator('.notation__node[data-id="E1"]').click(force=True); p.wait_for_timeout(200)
    p.click('.palette__remove'); p.wait_for_timeout(500); rec('remove E1', p.inner_text('.palette__message'))
    # restore the clean text and keep working by tools
    p.click('.board-tools__add'); rec('items', p.evaluate("()=>[...document.querySelectorAll('.palette__item')].map(b=>b.dataset.keyword)"))
    p.locator('.palette__item[data-keyword="task"]').click(); p.wait_for_timeout(700); rec('add task', p.inner_text('.palette__message'))
    ids = p.evaluate("()=>[...document.querySelectorAll('.notation__node[data-id]')].map(n=>n.dataset.id)"); new = ids[-1]; rec('new id', new)
    # connect t3 -> new
    p.click('.palette__mode'); p.wait_for_timeout(200)
    p.locator('.notation__node[data-id="t3"]').click(force=True); p.wait_for_timeout(200)
    p.locator(f'.notation__node[data-id="{new}"]').click(force=True); p.wait_for_timeout(600); rec('connect', p.inner_text('.palette__message'))
    p.click('.palette__mode'); p.wait_for_timeout(200)  # leave connect mode
    # rename the new task: select, Edit button, prompt
    from sclib import DLG
    DLG['text'] = 'Архивировать заказ'
    p.locator(f'.notation__node[data-id="{new}"]').click(force=True); p.wait_for_timeout(200)
    p.click('.palette__edit'); p.wait_for_timeout(600); rec('rename', p.inner_text('.palette__message')); DLG['text'] = None
    # drag t2 right-down
    box = p.locator('.notation__node[data-id="t2"]').bounding_box(); c0 = u.code()
    x, y = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
    p.mouse.move(x, y); p.mouse.down(); p.mouse.move(x + 50, y + 30, steps=8); p.mouse.up(); p.wait_for_timeout(700)
    rec('drag changed code', u.code() != c0); u.save(); rec('status', u.status()); rec('code', u.code())
    rec('errors', u.errors)
    u.dash(); search(u, ''); snapshot(u, '../scenario-1.json'); b.close()
