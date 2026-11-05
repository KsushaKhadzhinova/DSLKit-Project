import json
from projects_helpers import *
from lib import *


def ed_ready(pg):
    pg.wait_for_selector(".canvas__remote svg", timeout=20000); pg.wait_for_timeout(600)


with sync_playwright() as p:
    t = T("extra"); t.start(p); C = t.check
    pg = setup(t)

    vals = {"мусор": "{{garbage", "объект": '{"a":1}', "null в массиве": "[1,2,null,{}]", "title числом": '[{"id":"x","title":5,"source":"a","updated":1}]',
            "без notation": '[{"id":"x","title":"Без нотации","source":"a","updated":1}]',
            "notation неизвестная": '[{"id":"y","title":"Неизв","notation":"zzz","source":"diagram zzz","updated":1}]',
            "updated=1e999": '[{"id":"z","title":"Бесконечность","notation":"bpmn","source":"x","updated":1e999}]',
            "updated=Infinity-строка": '[{"id":"z","title":"Строка","notation":"bpmn","source":"x","updated":"сегодня"}]',
            "created строкой": '[{"id":"z","title":"C","notation":"bpmn","source":"x","updated":5,"created":"x"}]',
            "notation числом": '[{"id":"z","title":"N","notation":5,"source":"x","updated":5}]'}
    for name, v in vals.items():
        def f(v=v):
            setkey(pg, "projects", v); pg.goto(BASE + "/app/dashboard.html"); pg.wait_for_timeout(2500)
            c = pg.locator("#project-count").inner_text().strip()
            yes(c != "", f"dashboard не инициализировался (счётчик пуст, показано статичных карточек: {cards(pg)})")
            return "счётчик: " + c
        C("COR-01-" + str(list(vals).index(name) + 1), f"Повреждённый список проектов: {name}", f, shot=True)
    setkey(pg, "projects", [])

    def f_chip():
        pg.goto(BASE + "/app/dashboard.html"); ready(pg)
        n0 = cards(pg)
        for chip in ["bpmn", "erd", "dfd", "idef0"]:
            pg.click(f'[data-filter="{chip}"]'); pg.wait_for_timeout(250)
            print(chip, cards(pg))
        pg.click('[data-filter="bpmn"]'); pg.wait_for_timeout(250); n = cards(pg)
        yes(n >= 1, f"фильтр BPMN даёт {n} карточек при {n0} проектах")
        return f"всего {n0}, BPMN: {n}"
    C("PRJ-17", "Фильтр BPMN на «Мои проекты» у нового пользователя", f_chip, shot=True)

    def f_two():
        setup(t); pg2 = t.pg
        pg2.goto(BASE + "/app/editor.html?template=bpmn"); ed_ready(pg2)
        pg2.fill(".code__input", 'diagram bpmn "Общий"\nstart s "A"'); pg2.wait_for_timeout(600); pg2.click('[data-action="save"]'); pg2.wait_for_timeout(700)
        url = pg2.url; b = t.page(); b.goto(url); ed_ready(b)
        pg2.goto(BASE + "/app/dashboard.html"); ready(pg2)
        pg2.fill("#app-search", "Общий"); pg2.wait_for_timeout(300)
        act(pg2, "remove", 0, accept=True)
        b.fill(".code__input", 'diagram bpmn "Общий после удаления"\nstart s "B"'); b.wait_for_timeout(600); b.click('[data-action="save"]'); b.wait_for_timeout(700)
        pg2.goto(BASE + "/app/dashboard.html"); ready(pg2); pg2.fill("#app-search", "Общий"); pg2.wait_for_timeout(300)
        names = titles(pg2); b.close()
        return "после удаления в одной вкладке и сохранения в другой видны: " + " | ".join(names)
    C("TWO-02", "Проект удалён в одной вкладке, во второй нажато «Сохранить»", f_two, shot=True)

    def f_edt10():
        t.new_ctx(); g = t.pg
        g.goto(BASE + "/app/editor.html?template=bpmn"); ed_ready(g)
        g.click(".board-tools__add"); g.wait_for_timeout(300)
        names = g.locator(".palette__item:visible").all_inner_texts()
        before = g.evaluate("document.querySelector('.code__input').value")
        g.locator(".palette__item:visible").nth(3).click(); g.wait_for_timeout(700)
        after = g.evaluate("document.querySelector('.code__input').value")
        msg = g.evaluate("[...document.querySelectorAll('[role=status]')].map(e=>e.textContent.trim()).filter(Boolean).join(' / ')")
        yes(after != before, "задача не добавилась; сообщение: " + msg[:100])
        return "палитра: " + ", ".join(names) + "; добавлена строка: " + after.splitlines()[-1][:40]
    C("EDT-10b", "Палитра BPMN: добавление «Задача» меняет код", f_edt10, shot=True)

    def f_ctrl():
        g = t.pg; g.goto(BASE + "/app/editor.html?template=bpmn"); ed_ready(g)
        hdr = g.evaluate("[...document.querySelectorAll('a[hreflang],a.header__lang,[data-action=theme],#theme-toggle,[data-theme-toggle]')].map(e=>e.tagName+'|'+(e.id||e.className)+'|'+e.offsetParent+'|'+(e.getAttribute('href')||e.dataset.action||''))")
        return "язык/тема в редакторе: " + "; ".join(hdr)
    C("LNG-04", "Где в редакторе переключатели языка и темы", f_ctrl)

    def f_theme():
        g = t.pg
        g.click('[data-action="theme"]', force=True); g.wait_for_timeout(500)
        a = g.evaluate("document.documentElement.dataset.theme||getComputedStyle(document.body).backgroundColor")
        g.screenshot(path=SC + "THM-04-editor-theme.png")
        g.reload(); ed_ready(g)
        b = g.evaluate("document.documentElement.dataset.theme||getComputedStyle(document.body).backgroundColor")
        yes(a == b, f"тема не сохранилась после перезагрузки: {a} -> {b}")
        return f"тема после переключения: {a}; после перезагрузки: {b}"
    C("THM-04", "Редактор: кнопка «Тема» переключает тему, выбор переживает перезагрузку", f_theme, shot=True)
    t.save()
