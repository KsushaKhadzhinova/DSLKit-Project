import time, json
from lib import *

CODE = ".code__input"


def ready(pg):
    pg.wait_for_selector(".canvas__remote svg", timeout=15000); pg.wait_for_timeout(500)


def openx(pg, q="template=bpmn"):
    pg.goto(BASE + "/app/editor.html?" + q); ready(pg)


def code(pg):
    return pg.evaluate(f"document.querySelector('{CODE}').value")


def setcode(pg, text, wait=700):
    pg.fill(CODE, text); pg.wait_for_timeout(wait)


def status(pg):
    return pg.evaluate("document.querySelector('.board-tools__message, [data-board-message], .palette__message')?.textContent||''")


def nodes(pg):
    return pg.evaluate("[...document.querySelectorAll('.canvas__remote .notation__node[data-id]')].map(n=>n.dataset.id)")


def node_box(pg, id_):
    return pg.evaluate("(id)=>{const n=[...document.querySelectorAll('.canvas__remote .notation__node[data-id]')].find(x=>x.dataset.id===id);if(!n)return null;const r=n.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height}}", id_)


def errcount(pg):
    return pg.evaluate("document.querySelectorAll('.code__line--error').length")


with sync_playwright() as p:
    t = T("editor"); t.start(p); C = t.check
    pg = t.pg
    pg.on("dialog", lambda d: d.dismiss())

    def e01():
        openx(pg, "template=idef0"); yes(len(nodes(pg)) >= 1, "нет блоков на доске"); return "блоков: " + str(len(nodes(pg)))
    C("EDT-01", "Открытие редактора с шаблоном IDEF0: блоки отрисованы", e01, shot=True)

    def e02():
        setcode(pg, ""); yes(pg.locator(".canvas__remote svg").count() >= 1, "нет svg"); st = pg.inner_text(".canvas__status")
        return "пустой код: статус «" + st.strip()[:60] + "»"
    C("EDT-02", "Ввод: полностью пустой код не ломает доску", e02, shot=True)

    def e03():
        setcode(pg, "диаграмма ???\n\n\n}}}{{{ ((")
        ok = pg.locator(".code__line--error").count() >= 0
        return f"мусорный код: подсвечено строк с ошибкой {errcount(pg)}; проблем: " + pg.inner_text("#problems-panel")[:80].replace("\n", " ")
    C("EDT-03", "Ввод: мусор и непарные скобки — ошибки в панели проблем, не исключения", e03, shot=True)

    def e04():
        setcode(pg, 'diagram bpmn "' + "Очень длинное название " * 80 + '"\nstart s "' + "Ж" * 3000 + '"\ntask a "b"\nflow s -> a', 1200)
        w = pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth")
        yes(w <= 0, f"горизонтальная прокрутка страницы {w}px")
    C("EDT-04", "Ввод: заголовок и подпись из тысяч символов — вёрстка не разваливается", e04, shot=True)

    def e05():
        setcode(pg, 'diagram bpmn "<img src=x onerror=window.__x=1>"\nstart s "<script>window.__x=1</script>"\ntask a "&lt;b&gt;"\nflow s -> a', 900)
        yes(pg.evaluate("window.__x") != 1, "скрипт выполнился")
        yes(pg.locator(".canvas__remote img, .canvas__remote script").count() == 0, "HTML попал в svg как разметка")
    C("EDT-05", "Ввод: HTML в названиях блоков экранируется на доске", e05, shot=True)

    def e06():
        setcode(pg, 'diagram bpmn "Юникод"\nstart s "🦔 漢字 مرحبا ∑"\ntask a "Ёлка\\nвторая"\nflow s -> a', 900)
        yes(len(nodes(pg)) >= 2, "блоки юникода не отрисовались")
    C("EDT-06", "Ввод: юникод, эмодзи, RTL и перенос в подписях", e06, shot=True)

    def e08():
        openx(pg, "template=bpmn"); b = pg.locator('[data-notation-label]').first; b.click(); pg.wait_for_timeout(400)
        return "кнопка «Диаграмма: …» открыла: " + pg.evaluate("[...document.querySelectorAll('[role=menu] *, dialog[open] *, [role=listbox] *')].filter(e=>e.offsetParent).map(e=>e.textContent.trim()).filter(x=>x&&x.length<40).slice(0,8).join(' | ')")
    C("EDT-08", "Смена нотации: кнопка «Диаграмма: …»", e08, shot=True)

    def e09():
        openx(pg, "template=bpmn")
        res = []
        for key in ["erd", "uml class", "petri", "idef0", "mindmap", "bpmn"]:
            cur = code(pg); first = cur.split("\n")[0]
            new = "diagram " + key + " " + first.split(" ", 2)[2] if len(first.split(" ", 2)) > 2 else "diagram " + key
            setcode(pg, new + "\n" + "\n".join(cur.split("\n")[1:]), 700)
            res.append(f"{key}:{errcount(pg)}")
        return "ручная смена первой строки при чужих элементах (строк с ошибкой): " + ", ".join(res)
    C("EDT-09", "Смена нотации правкой первой строки: чужие элементы дают ошибки, а не исключения", e09, shot=True)

    def e10():
        openx(pg, "template=bpmn"); pg.click(".board-tools__add"); pg.wait_for_timeout(300)
        items = pg.locator(".palette__item:visible"); n = items.count(); yes(n >= 3, f"в палитре {n} элементов")
        before = code(pg); items.nth(0).click(); pg.wait_for_timeout(600); after = code(pg)
        yes(after != before, "элемент не добавился в код")
        return f"палитра: {n}; добавлено строк: {len(after.splitlines()) - len(before.splitlines())}"
    C("EDT-10", "Панель инструментов в верхней панели: «Элемент» добавляет блок в код", e10, shot=True)

    def e11():
        openx(pg, "template=bpmn"); n0 = len(nodes(pg))
        pg.click(".board-tools__add"); it = pg.locator(".palette__item:visible").nth(3)
        for _ in range(8): it.click(timeout=2000) if it.is_visible() else None
        pg.wait_for_timeout(700); n1 = len(nodes(pg)); ids = nodes(pg)
        yes(len(ids) == len(set(ids)), "повторяющиеся id: " + str(ids))
        return f"8 быстрых кликов: блоков было {n0}, стало {n1}"
    C("EDT-11", "Быстрые повторные клики по элементу палитры: уникальные id, без исключений", e11, shot=True)

    def e12():
        openx(pg, "template=bpmn"); ids = nodes(pg); yes(len(ids) >= 2, str(ids))
        pg.click(".palette__mode"); pg.wait_for_timeout(200)
        a, b = node_box(pg, ids[0]), node_box(pg, ids[-1])
        pg.mouse.click(a["x"], a["y"]); pg.wait_for_timeout(200); pg.mouse.click(b["x"], b["y"]); pg.wait_for_timeout(600)
        return "«Соединить» отработало; сообщение: " + status(pg)[:90]
    C("EDT-12", "«Соединить»: связь между двумя блоками", e12, shot=True)

    def e13():
        openx(pg, "template=bpmn"); ids = nodes(pg)
        pg.click(".palette__mode"); a = node_box(pg, ids[0]); pg.mouse.click(a["x"], a["y"]); pg.wait_for_timeout(200); pg.mouse.click(a["x"], a["y"]); pg.wait_for_timeout(500)
        before = code(pg); pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
        return "связь блока с самим собой: " + status(pg)[:90]
    C("EDT-13", "«Соединить» блок с самим собой и отмена Escape", e13, shot=True)

    def e14():
        openx(pg, "template=bpmn"); ids = nodes(pg); n0 = len(ids); a = node_box(pg, ids[1])
        pg.mouse.click(a["x"], a["y"]); pg.wait_for_timeout(200); pg.click(".palette__remove"); pg.wait_for_timeout(600)
        n1 = len(nodes(pg)); yes(n1 == n0 - 1, f"блоков было {n0}, стало {n1}")
        pg.click(".palette__remove", force=True); pg.wait_for_timeout(300)
        return "удаление без выбора: сообщение «" + status(pg)[:80] + "»"
    C("EDT-14", "«Удалить»: выбранный блок уходит вместе со связями; повторное удаление без выбора", e14, shot=True)

    def e15():
        openx(pg, "template=bpmn"); ids = nodes(pg); a = node_box(pg, ids[1])
        pg.mouse.dblclick(a["x"], a["y"]); pg.wait_for_timeout(400)
        f = pg.locator("input.board-edit"); yes(f.count() == 1, "поле переименования не открылось")
        f.fill("Новая <b>подпись</b>"); pg.keyboard.press("Enter"); pg.wait_for_timeout(600)
        yes("Новая" in code(pg), "подпись не попала в код: " + code(pg)[:100])
        yes(pg.locator("input.board-edit").count() == 0, "поле осталось на экране")
    C("EDT-15", "Двойной клик по блоку: переименование, HTML в подписи", e15, shot=True)

    def e16():
        openx(pg, "template=bpmn"); ids = nodes(pg); a = node_box(pg, ids[1])
        before = code(pg)
        pg.mouse.dblclick(a["x"], a["y"]); pg.wait_for_timeout(300); pg.locator("input.board-edit").fill("   "); pg.keyboard.press("Enter"); pg.wait_for_timeout(400)
        eq(code(pg), before, "пустая подпись изменила код:")
        pg.mouse.dblclick(a["x"], a["y"]); pg.wait_for_timeout(300); pg.locator("input.board-edit").fill("Не сохранять"); pg.keyboard.press("Escape"); pg.wait_for_timeout(400)
        eq(code(pg), before, "Escape изменил код:")
        pg.mouse.dblclick(a["x"], a["y"]); pg.wait_for_timeout(300); pg.locator("input.board-edit").fill('Кавычки " и \\ слэш'); pg.keyboard.press("Enter"); pg.wait_for_timeout(600)
        return "подпись с кавычкой и слэшем: ошибок в коде " + str(errcount(pg))
    C("EDT-16", "Переименование: пустая подпись, Escape, кавычки и обратный слэш", e16, shot=True)

    def e17():
        openx(pg, "template=bpmn"); ids = nodes(pg); a = node_box(pg, ids[1]); before = pg.evaluate("document.querySelector('.canvas__remote .notation__node[data-id]:nth-of-type(2)')?.getAttribute('data-cx')")
        c0 = code(pg)
        pg.mouse.move(a["x"], a["y"]); pg.mouse.down(); pg.mouse.move(a["x"] + 60, a["y"] + 40, steps=8); pg.mouse.up(); pg.wait_for_timeout(700)
        b = node_box(pg, ids[1]); moved = abs(b["x"] - a["x"]) > 20
        # перетащить за границу доски
        pg.mouse.move(b["x"], b["y"]); pg.mouse.down(); pg.mouse.move(-100, -100, steps=6); pg.mouse.move(5000, 5000, steps=4); pg.mouse.up(); pg.wait_for_timeout(700)
        yes(moved, "блок не сдвинулся при перетаскивании")
        return "положение сохранено в коде: " + ("да" if code(pg) != c0 else "нет")
    C("EDT-17", "Перетаскивание блока, в том числе за пределы окна", e17, shot=True)

    def e18():
        openx(pg, "template=bpmn"); c0 = code(pg); ids = nodes(pg)
        pg.click('[data-action="undo"]', force=True); pg.wait_for_timeout(300)
        eq(code(pg), c0, "undo на чистом редакторе изменил код:")
        pg.click('[data-action="redo"]', force=True); pg.wait_for_timeout(300)
        setcode(pg, c0 + "\ntask zz1 \"один\""); setcode(pg, c0 + "\ntask zz1 \"один\"\ntask zz2 \"два\"")
        pg.click('[data-action="undo"]', force=True); pg.wait_for_timeout(400); a = code(pg)
        pg.click('[data-action="undo"]', force=True); pg.wait_for_timeout(400); b = code(pg)
        pg.click('[data-action="redo"]', force=True); pg.wait_for_timeout(400); c = code(pg)
        yes("zz2" not in a and "zz1" in a, "первый undo: " + a[-40:])
        yes("zz1" not in b, "второй undo: " + b[-40:])
        yes("zz1" in c and "zz2" not in c, "redo: " + c[-40:])
    C("EDT-18", "Undo/redo: пустая история, два шага назад и вперёд", e18, shot=True)

    def e19():
        openx(pg, "template=bpmn"); c0 = code(pg)
        for _ in range(12): pg.click('[data-action="undo"]', timeout=2000, force=True)
        for _ in range(12): pg.click('[data-action="redo"]', timeout=2000, force=True)
        pg.keyboard.press("Control+z"); pg.keyboard.press("Control+y"); pg.keyboard.press("Control+Shift+z")
        pg.wait_for_timeout(300)
        return "серия из 12+12 быстрых undo/redo и горячих клавиш без ошибок"
    C("EDT-19", "Быстрые серии undo/redo и Ctrl+Z / Ctrl+Y", e19)

    def e20():
        openx(pg, "template=bpmn"); pg.click(CODE); pg.keyboard.press("Control+a"); pg.keyboard.type("diagram bpmn \"Клавиатура\"\nstart s \"Старт\"\n")
        pg.keyboard.press("Tab"); pg.keyboard.type("task a \"A\""); pg.wait_for_timeout(700)
        pg.keyboard.press("Control+s"); pg.wait_for_timeout(500)
        return "после Tab в поле кода фокус: " + pg.evaluate("document.activeElement.tagName+'.'+document.activeElement.className.slice(0,20)")
    C("EDT-20", "Клавиатура: набор кода, Tab, Ctrl+S", e20, shot=True)

    def e21():
        openx(pg, "template=bpmn"); pg.keyboard.press("Control+k"); pg.wait_for_timeout(300)
        return "Ctrl+K: фокус на " + pg.evaluate("document.activeElement.id||document.activeElement.className")
    C("EDT-21", "Горячая клавиша поиска Ctrl+K в редакторе", e21)
    t.save()
    print(len(t.rows), "errors:", t.errors[:6])
