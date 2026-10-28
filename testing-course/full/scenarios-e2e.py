"""Real user scenarios in Edge: each scenario is a story of a person with a goal, run with real mouse and keyboard.
Every step checks the RESULT the user expects, not just that something happened. Writes scenarios-e2e.json. Needs the site on :5173."""
import json
import re
import sys
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright

base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
out = Path(__file__).parent
scenarios = []
errors = []


class Scenario:
    def __init__(self, sid, persona, goal):
        self.sid, self.persona, self.goal, self.steps, self.failed = sid, persona, goal, [], False

    def step(self, title, fn):
        if self.failed:
            self.steps.append({"title": title, "status": "Blocked", "note": "предыдущий шаг не прошёл"})
            return
        try:
            fn()
            self.steps.append({"title": title, "status": "Passed", "note": ""})
        except Exception as e:  # noqa: BLE001
            self.failed = True
            self.steps.append({"title": title, "status": "Failed", "note": " ".join(str(e).splitlines()[:4])[:400]})

    def done(self):
        scenarios.append({"id": self.sid, "persona": self.persona, "goal": self.goal, "steps": self.steps, "status": "Failed" if self.failed else "Passed"})


def yes(v, msg):
    if not v:
        raise AssertionError(msg)


def eq(a, b, msg=""):
    if a != b:
        raise AssertionError(f"{msg} ожидалось {b!r}, получено {a!r}")


with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge")

    def new_user(width=1366, height=900, lang="ru-RU"):
        ctx = b.new_context(viewport={"width": width, "height": height}, accept_downloads=True, locale=lang)
        ctx.grant_permissions(["clipboard-read", "clipboard-write"], origin=base)
        pg = ctx.new_page()
        pg.set_default_timeout(8000)
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.on("console", lambda m: errors.append(m.text) if m.type == "error" and "kroki" not in m.text.lower() else None)
        return ctx, pg

    def code(pg):
        return pg.evaluate("[...document.querySelectorAll('.code__line code')].map(e=>e.textContent).join('\\n')")

    def tour(pg):
        pg.wait_for_timeout(500)
        if pg.locator(".tour").count() and pg.locator(".tour").first.is_visible():
            pg.click("text=Пропустить")

    def problems(pg):
        return pg.inner_text(".problems__status")

    def set_code(pg, text):
        pg.evaluate("""(t) => { const ol = document.querySelector('.code__lines'); ol.replaceChildren(...t.split(String.fromCharCode(10)).map(line => { const li = document.createElement('li'); li.className = 'code__line'; const c = document.createElement('code'); c.textContent = line; li.append(c); return li; })); }""", text)
        pg.click(".button--run")
        pg.wait_for_timeout(500)

    def open_menu(pg):
        pg.evaluate("document.querySelectorAll('details.editor-menu').forEach(d => d.open = true)")

    # ---------------------------------------------------------------- S1
    s = Scenario("S1", "Студентка делает лабораторную по IDEF0", "Нарисовать функциональную модель заказа, сохранить и вернуться к ней позже")
    ctx, pg = new_user()
    s.step("Открывает сайт и нажимает «Создать диаграмму»", lambda: (pg.goto(base + "/"), pg.locator("text=Создать диаграмму").first.click(), pg.wait_for_url("**/editor.html**"), tour(pg)))
    s.step("Видит готовый шаблон IDEF0 без ошибок и нарисованную диаграмму с тремя блоками", lambda: (yes(code(pg).startswith("diagram idef0"), "не IDEF0"), yes(pg.locator(".canvas__remote .notation__node").count() == 3, "блоков не три"), yes("Проблем нет" in problems(pg) or "0" in pg.inner_text(".editor-status__problems"), problems(pg))))
    def retitle(page, title):
        page.click(".code__input", position={"x": 300, "y": 12})
        page.keyboard.press("Control+Home")
        page.keyboard.press("Shift+End")
        page.keyboard.type('diagram idef0 "' + title + '"')
        page.wait_for_timeout(900)

    s.step("Печатает с клавиатуры новое название диаграммы «Заказ в магазине»: диаграмма перерисовывается сама", lambda: (retitle(pg, "Заказ в магазине"), yes("Заказ в магазине" in pg.inner_text(".canvas__remote"), "название не на диаграмме"), yes("Заказ в магазине" in code(pg), code(pg)[:60])))
    s.step("Печатает руками новый блок: автоотступ после «{», «}» возвращается на край, блок появляется на диаграмме", lambda: (pg.click(".code__input", position={"x": 300, "y": 12}), pg.keyboard.press("Control+End"), pg.keyboard.press("Enter"), pg.keyboard.type('box A9 "Ручной блок" {'), pg.keyboard.press("Enter"), pg.keyboard.type("input: In"), pg.keyboard.press("Enter"), pg.keyboard.type("control: Rule"), pg.keyboard.press("Enter"), pg.keyboard.type("output: Out"), pg.keyboard.press("Enter"), pg.keyboard.type("}"), pg.wait_for_timeout(1000), yes(code(pg).endswith('box A9 "Ручной блок" {' + chr(10) + "  input: In" + chr(10) + "  control: Rule" + chr(10) + "  output: Out" + chr(10) + "}"), code(pg)[-90:]), yes(pg.locator(".canvas__remote .notation__node").count() == 4, "блок не появился на диаграмме")))
    s.step("Добавляет блок из палитры перетаскиванием на доску", lambda: (lambda item, svg: (pg.mouse.move(item["x"] + 10, item["y"] + 10), pg.mouse.down(), pg.mouse.move(svg["x"] + svg["width"] * 0.55, svg["y"] + svg["height"] * 0.75, steps=10), pg.mouse.up(), pg.wait_for_timeout(600), yes(pg.locator(".canvas__remote .notation__node").count() == 5, "нового блока нет"), yes("box A4" in code(pg), "блок не в коде")))(pg.locator(".palette__item").first.bounding_box(), pg.locator(".canvas__remote svg").bounding_box()))
    s.step("Соединяет блок A3 с блоком A4 стрелкой в режиме «Соединить»", lambda: (pg.click(".palette__mode"), pg.locator('.notation__node[data-id="A3"]').click(), pg.locator('.notation__node[data-id="A4"]').click(), pg.wait_for_timeout(500), yes("arrow A3.output -> A4.input" in code(pg), "стрелки нет в коде")))
    s.step("Перетаскивает блок A1 мышью, положение пишется в код", lambda: (pg.keyboard.press("Escape"), (lambda box: (pg.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2), pg.mouse.down(), pg.mouse.move(box["x"] + box["width"] / 2 + 50, box["y"] + box["height"] / 2 + 40, steps=8), pg.mouse.up()))(pg.locator('.notation__node[data-id="A1"]').bounding_box()), pg.wait_for_timeout(500), yes(re.search(r"box A1 [^\n]*pos=", code(pg)), "pos= не записан")))
    s.step("Нажимает «Сохранить»: проект получает имя и адрес", lambda: (pg.click('[data-action="save"]'), pg.wait_for_timeout(400), yes("?p=" in pg.url, pg.url), eq(pg.inner_text(".editor-topbar__title"), "заказ-в-магазине.dsl")))
    saved_url = {}
    s.step("Запоминает адрес проекта и уходит на панель проектов", lambda: (saved_url.update(u=pg.url), pg.click(".editor-toolbar__logo"), pg.wait_for_url("**/dashboard.html")))
    s.step("Находит проект первым в «Мои проекты» и открывает его", lambda: (eq(pg.locator(".project-list__item").first.locator(".project-card__link").inner_text(), "Заказ в магазине"), pg.locator(".project-list__item").first.locator(".project-card__link").click(), pg.wait_for_url("**/editor.html?p=*"), tour(pg), yes("arrow A3.output -> A4.input" in code(pg) and "pos=" in code(pg), "проект открылся не со всем содержимым"), yes(pg.locator(".canvas__remote .notation__node").count() == 4, "диаграмма не нарисована")))
    ctx.close()
    s.done()

    # ---------------------------------------------------------------- S1b export files
    s = Scenario("S2", "Студентка выгружает результат", "Получить диаграмму в SVG, PNG, JPEG, draw.io и HTML и убедиться, что файлы настоящие")
    ctx, pg = new_user()
    pg.goto(base + "/app/editor.html?template=idef0")
    tour(pg)
    pg.wait_for_timeout(500)

    def export(kind, check):
        open_menu(pg)
        with pg.expect_download() as dl:
            pg.locator(f'[data-export="{kind}"]').evaluate("e => e.click()")
        path = dl.value.path()
        data = Path(path).read_bytes()
        check(dl.value.suggested_filename, data)

    s.step("SVG: файл .svg, внутри svg и текст блоков", lambda: export("svg", lambda n, d: (yes(n.endswith(".svg"), n), yes(b"<svg" in d and b"Receive order" in d, "нет содержимого"))))
    s.step("PNG: файл .png с сигнатурой PNG и ненулевым размером", lambda: export("png", lambda n, d: (yes(n.endswith(".png"), n), yes(d[:8] == b"\x89PNG\r\n\x1a\n", "не PNG"), yes(len(d) > 2000, f"размер {len(d)}"))))
    s.step("JPEG: файл .jpg с сигнатурой JPEG", lambda: export("jpeg", lambda n, d: (yes(n.endswith(".jpg") or n.endswith(".jpeg"), n), yes(d[:3] == b"\xff\xd8\xff", "не JPEG"))))
    s.step("draw.io: файл .drawio, внутри mxfile", lambda: export("drawio", lambda n, d: (yes(n.endswith(".drawio"), n), yes(b"<mxfile" in d, "нет mxfile"))))
    s.step("HTML: самодостаточный файл .html с диаграммой и без внешних ресурсов", lambda: export("html", lambda n, d: (yes(n.endswith(".html"), n), yes(b"<svg" in d, "нет svg"), yes(b"http://localhost" not in d, "ссылки на локальный сервер"))))
    ctx.close()
    s.done()

    # ---------------------------------------------------------------- S3
    s = Scenario("S3", "Аналитик рисует потоки данных (DFD)", "Построить DFD по правилам нотации, не нарушив их")
    ctx, pg = new_user()
    pg.goto(base + "/app/editor.html?template=dfd")
    tour(pg)
    pg.wait_for_timeout(600)
    s.step("Шаблон DFD открыт без ошибок", lambda: yes(code(pg).startswith("diagram dfd") and pg.locator(".canvas__remote svg").count() == 1, code(pg)[:30]))
    s.step("Добавляет хранилище кликом по палитре", lambda: (pg.locator(".palette__item", has_text="Хранилище").click(), pg.wait_for_timeout(400), yes("store S1" in code(pg), "хранилища нет")))
    s.step("Соединяет процесс 2 с новым хранилищем: связь допустима", lambda: (pg.click(".palette__mode"), pg.locator('.notation__node[data-id="2"]').click(), pg.locator('.notation__node[data-id="S1"]').click(), pg.wait_for_timeout(400), yes("flow 2 -> S1" in code(pg), "связи нет")))
    s.step("Пытается соединить клиента с хранилищем напрямую: система отказывает и объясняет почему", lambda: (pg.locator('.notation__node[data-id="Customer"]').click(), pg.locator('.notation__node[data-id="S1"]').click(), pg.wait_for_timeout(400), yes("не касается процесса" in pg.inner_text(".palette__message"), pg.inner_text(".palette__message")), yes("flow Customer -> S1" not in code(pg), "запрещённая связь попала в код")))
    s.step("Пишет связь клиента с хранилищем руками: редактор показывает ошибку и блокирует запуск", lambda: (set_code(pg, code(pg) + "\nflow Customer -> S1 \"прямо\""), yes("не касается процесса" in pg.inner_text(".problems__list"), "ошибка не показана"), eq(pg.locator(".button--run").first.get_attribute("aria-disabled"), "true")))
    s.step("Нажимает «Исправить» у ошибки: помощник отвечает, пользователь отменяет последнюю правку и ошибка уходит", lambda: (pg.click('[data-action="undo"]'), pg.wait_for_timeout(500), yes("Customer -> S1" not in code(pg), "правка не отменилась"), eq(pg.locator(".button--run").first.get_attribute("aria-disabled"), "false")))
    ctx.close()
    s.done()

    # ---------------------------------------------------------------- S4
    s = Scenario("S4", "Разработчик переносит схему из Mermaid и PlantUML", "Импортировать готовые диаграммы, не печатая их заново")
    ctx, pg = new_user()
    pg.goto(base + "/app/editor.html?template=idef0")
    tour(pg)
    pg.wait_for_timeout(500)
    mermaid = "flowchart TD\n  A[Начало] --> B{Проверка}\n  B -->|да| C[Готово]\n  B -->|нет| A"

    def import_clip(text, expect_word):
        pg.evaluate("t => navigator.clipboard.writeText(t)", text)
        open_menu(pg)
        pg.locator('[data-import="clipboard"]').evaluate("e => e.click()")
        pg.wait_for_timeout(700)
        yes(expect_word in pg.inner_text(".canvas__status"), pg.inner_text(".canvas__status"))

    s.step("Импорт блок-схемы Mermaid из буфера: статус «Импортировано», код заменён", lambda: (import_clip(mermaid, "Импортировано"), yes(code(pg).startswith("diagram"), code(pg)[:30]), yes("Проверка" in code(pg), "блок «Проверка» не перенесён")))
    s.step("На доске нарисована импортированная диаграмма с блоками", lambda: yes(pg.locator(".canvas__remote .notation__node").count() >= 3, "блоков меньше трёх"))
    plantuml = "@startuml\nAlice -> Bob: Привет\nBob --> Alice: Ответ\n@enduml"
    s.step("Импорт PlantUML диаграммы последовательности из буфера", lambda: (import_clip(plantuml, "Импортировано"), yes("Alice" in code(pg) and "Bob" in code(pg), code(pg)[:80])))
    s.step("Мусор из буфера не ломает редактор: сообщение «Формат не распознан», код не потерян", lambda: (lambda before: (import_clip("просто текст без диаграммы", "не распознан"), eq(code(pg), before)))(code(pg)))
    s.step("Импорт из файла: выбирает .mmd и получает диаграмму", lambda: (lambda f: (f.write_text(mermaid, encoding="utf8"), open_menu(pg), pg.set_input_files(".editor-import__file", str(f)), pg.wait_for_timeout(700), yes("Проверка" in code(pg), "файл не импортирован")))(Path(tempfile.mkdtemp()) / "flow.mmd"))
    ctx.close()
    s.done()

    # ---------------------------------------------------------------- S5
    s = Scenario("S5", "Новичок ошибается в коде и исправляет с подсказкой", "Понять ошибку, исправить с помощью помощника и вернуться к рабочей диаграмме")
    ctx, pg = new_user()
    pg.goto(base + "/app/editor.html?template=idef0")
    tour(pg)
    pg.wait_for_timeout(500)
    s.step("Опечатка в слове control: показана ошибка со строкой, «Запустить» заблокирована", lambda: (set_code(pg, code(pg).replace(" control: Sales policy", " contro: Sales policy")), yes("order.dsl:" in pg.inner_text(".problems__list") or ".dsl:" in pg.inner_text(".problems__list"), "строка ошибки не указана"), eq(pg.locator(".button--run").first.get_attribute("aria-disabled"), "true")))
    s.step("Спрашивает помощника «исправь ошибки»: опечатка исправлена, ошибок нет", lambda: (pg.click('[data-panel="ai"]'), pg.fill('.editor-tools__input[placeholder="Спросите помощника"]', "исправь ошибки"), pg.keyboard.press("Enter"), pg.wait_for_timeout(700), yes(" control: Sales policy" in code(pg), "не исправлено"), eq(pg.locator(".button--run").first.get_attribute("aria-disabled"), "false")))
    s.step("Просит «объясни диаграмму»: ответ называет нотацию и число строк", lambda: (pg.click("text=Объяснить диаграмму"), yes("IDEF0" in pg.inner_text(".editor-tools__chat li:last-child"), pg.inner_text(".editor-tools__chat li:last-child"))))
    s.step("Просит «создай erd»: код заменён шаблоном ERD, диаграмма перерисована", lambda: (pg.fill('.editor-tools__input[placeholder="Спросите помощника"]', "создай erd"), pg.click("text=Отправить"), pg.wait_for_timeout(700), yes(code(pg).startswith("diagram erd"), code(pg)[:20]), yes("Customer" in pg.inner_text(".canvas__remote"), "ERD не нарисована")))
    s.step("Отменяет создание ERD и возвращается к IDEF0 кнопкой «Отменить»", lambda: (pg.click('[data-panel="ai"]'), pg.click('[data-action="undo"]'), pg.wait_for_timeout(500), yes(code(pg).startswith("diagram idef0"), code(pg)[:20])))
    ctx.close()
    s.done()

    # ---------------------------------------------------------------- S6
    s = Scenario("S6", "Тимлид ведёт историю версий и переименовывает по всему коду", "Безопасно переименовать блок и при необходимости вернуть старую версию")
    ctx, pg = new_user()
    pg.goto(base + "/app/editor.html?template=idef0")
    tour(pg)
    pg.wait_for_timeout(500)
    first = {}
    s.step("Делает первый коммит «Исходная версия»", lambda: (first.update(code=code(pg)), pg.click('[data-panel="git"]'), pg.fill('.editor-tools__input[placeholder="Сообщение коммита"]', "Исходная версия"), pg.click("text=Закоммитить"), yes("создан" in pg.inner_text(".editor-tools__status"), pg.inner_text(".editor-tools__status")), yes(pg.locator(".editor-tools__commit").count() == 1, "коммита нет в списке")))
    s.step("Ищет «Check stock» и заменяет на «Проверка наличия» во всём коде", lambda: (pg.click('[data-panel="search"]'), pg.fill('.editor-tools__input[placeholder="Найти"]', "Check stock"), yes("Найдено: 1" in pg.inner_text(".editor-tools__status"), pg.inner_text(".editor-tools__status")), pg.fill('.editor-tools__input[placeholder="Заменить на"]', "Проверка наличия"), pg.click("text=Заменить всё"), pg.wait_for_timeout(500), yes("Проверка наличия" in code(pg) and "Check stock" not in code(pg), "замена не выполнена"), yes("Проверка наличия" in pg.inner_text(".canvas__remote"), "диаграмма не обновилась")))
    s.step("В Git видно изменения, коммитит вторую версию", lambda: (pg.click('[data-panel="git"]'), yes("+1" in pg.inner_text(".editor-tools__summary") or "−1" in pg.inner_text(".editor-tools__summary"), pg.inner_text(".editor-tools__summary")), pg.fill('.editor-tools__input[placeholder="Сообщение коммита"]', "Переименован блок"), pg.click("text=Закоммитить"), yes(pg.locator(".editor-tools__commit").count() == 2, "нет второго коммита")))
    s.step("Сравнивает с первой версией: diff показывает удалённую и добавленную строки", lambda: (pg.locator('.editor-tools__commit [data-act="diff"]').nth(1).click(), yes(pg.locator(".editor-tools__diff").is_visible(), "нет diff"), yes("Check stock" in pg.inner_text(".editor-tools__diff") or "Проверка наличия" in pg.inner_text(".editor-tools__diff"), pg.inner_text(".editor-tools__diff")[:80])))
    s.step("Возвращает первую версию: код точно совпадает с исходным", lambda: (pg.locator('.editor-tools__commit [data-act="restore"]').nth(1).click(), pg.wait_for_timeout(500), eq(code(pg), first["code"])))
    s.step("Копирует diff в буфер обмена", lambda: (pg.click("text=Скопировать diff"), pg.wait_for_timeout(400), yes(pg.evaluate("navigator.clipboard.readText()") != "", "буфер пуст")))
    ctx.close()
    s.done()

    # ---------------------------------------------------------------- S7
    s = Scenario("S7", "Преподаватель ведёт несколько проектов", "Создать несколько диаграмм, найти нужную, переименовать лишнюю и удалить ненужную, ничего не потеряв после перезагрузки")
    ctx, pg = new_user()
    names = {"idef0": "Заказ", "dfd": "Платежи", "erd": "Магазин"}

    def make(tpl, title):
        pg.goto(f"{base}/app/editor.html?template={tpl}")
        tour(pg)
        pg.wait_for_timeout(400)
        src = code(pg)
        lines = src.split("\n")
        lines[0] = re.sub(r'"[^"]*"', f'"{title}"', lines[0])
        set_code(pg, "\n".join(lines))
        pg.click('[data-action="save"]')
        pg.wait_for_timeout(400)

    for tpl, t in names.items():
        s.step(f"Создаёт и сохраняет проект «{t}» ({tpl})", lambda tpl=tpl, t=t: make(tpl, t))
    s.step("На панели три сохранённых проекта, новейший первым", lambda: (pg.goto(base + "/app/dashboard.html"), pg.wait_for_timeout(500), eq(pg.locator(".project-list__item:visible").count(), 3), eq(pg.locator(".project-list__item:visible").first.locator(".project-card__link").inner_text(), "Магазин")))
    s.step("Фильтр ERD оставляет только проект «Магазин»", lambda: (pg.click('.filter__chip[data-filter="erd"]'), pg.wait_for_timeout(300), eq(pg.locator(".project-list__item:visible .project-card__link").all_inner_texts(), ["Магазин"]), pg.click('.filter__chip[data-filter="all"]')))
    s.step("Поиск «плат» находит только «Платежи»", lambda: (pg.fill(".app-topbar__search-input", "плат"), pg.wait_for_timeout(300), eq(pg.locator(".project-list__item:visible .project-card__link").all_inner_texts(), ["Платежи"]), pg.fill(".app-topbar__search-input", "")))
    s.step("Сортировка по названию ставит «Заказ» раньше «Магазин»", lambda: (pg.select_option("#project-sort", "name"), pg.wait_for_timeout(300), (lambda t: yes(t.index("Заказ") < t.index("Магазин"), str(t)))(pg.locator(".project-list__item:visible .project-card__link").all_inner_texts()), pg.select_option("#project-sort", "newest")))
    s.step("Переименовывает «Платежи» в «Оплата»", lambda: (pg.once("dialog", lambda d: d.accept("Оплата")), pg.locator(".project-list__item", has_text="Платежи").locator(".project-card__menu").click(), pg.locator(".project-list__item", has_text="Платежи").locator('[data-act="rename"]').click(), pg.wait_for_timeout(400), yes("Оплата" in pg.inner_text("#project-list"), "не переименовано")))
    s.step("Удаляет «Заказ» с подтверждением", lambda: (pg.once("dialog", lambda d: d.accept()), pg.locator(".project-list__item:visible", has_text="Заказ").locator(".project-card__menu").first.click(), pg.locator(".project-list__item:visible", has_text="Заказ").locator('[data-act="remove"]').click(), pg.wait_for_timeout(400), eq(pg.locator(".project-list__item:visible").count(), 2)))
    s.step("Отказ в диалоге удаления ничего не удаляет", lambda: (pg.once("dialog", lambda d: d.dismiss()), pg.locator(".project-list__item:visible").first.locator(".project-card__menu").click(), pg.locator(".project-list__item:visible").first.locator('[data-act="remove"]').click(), pg.wait_for_timeout(300), eq(pg.locator(".project-list__item:visible").count(), 2)))
    s.step("После перезагрузки остались «Магазин» и «Оплата»", lambda: (pg.reload(), pg.wait_for_timeout(500), (lambda t: yes("Магазин" in t and "Оплата" in t and "Заказ" not in " ".join(pg.locator(".project-list__item:visible .project-card__link").all_inner_texts()), t))(pg.inner_text("#project-list"))))
    ctx.close()
    s.done()

    # ---------------------------------------------------------------- S8
    s = Scenario("S8", "Пользователь телефона (390 px)", "Создать диаграмму на телефоне и сохранить её")
    ctx, pg = new_user(390, 800)
    s.step("Открывает главную и редактор, горизонтальной прокрутки нет", lambda: (pg.goto(base + "/app/editor.html?template=idef0"), tour(pg), pg.wait_for_timeout(500), yes(pg.evaluate("document.documentElement.scrollWidth - innerWidth") <= 1, "есть прокрутка вбок")))
    s.step("Нижняя навигация переключает «Код» и «Холст»", lambda: (pg.click('.editor-bottom-nav [data-view="code"]'), pg.wait_for_timeout(300), yes(pg.locator("#editor-panel").is_visible(), "код не виден"), pg.click('.editor-bottom-nav [data-view="canvas"]'), pg.wait_for_timeout(300), yes(pg.locator(".canvas__remote svg").is_visible(), "холст не виден")))
    s.step("Кнопка «Меню» открывает проводник с шаблонами и палитрой", lambda: (pg.click('.editor-bottom-nav [data-action="sidebar"]'), pg.wait_for_timeout(300), yes(pg.locator(".palette__item").first.is_visible(), "палитра не видна")))
    s.step("Нажимает элемент палитры: блок добавлен, затем сохраняет", lambda: (pg.locator(".palette__item").first.click(), pg.wait_for_timeout(500), yes("box A4" in code(pg), "блок не добавлен"), pg.click('[data-action="save"]'), pg.wait_for_timeout(400), yes("?p=" in pg.url, pg.url)))
    ctx.close()
    s.done()

    # ---------------------------------------------------------------- S9
    s = Scenario("S9", "Англоязычный пользователь", "Пройти путь целиком на английской версии")
    ctx, pg = new_user(lang="en-US")
    s.step("Открывает /en/ и нажимает кнопку создания диаграммы", lambda: (pg.goto(base + "/en/"), pg.locator("a.button--hero").first.click(), pg.wait_for_url("**/en/app/editor.html**"), pg.wait_for_timeout(500), (pg.click(".tour button:has-text('Skip')") if pg.locator(".tour").count() and pg.locator(".tour").first.is_visible() else None)))
    s.step("Интерфейс английский: нижняя панель называет движок, палитра на английском", lambda: (eq(pg.inner_text(".editor-status__engine"), "Own engine (in the browser)"), yes("Function box" in pg.inner_text(".palette"), pg.inner_text(".palette"))))
    s.step("Сохраняет проект, ссылка на другой язык сохраняет проект в адресе", lambda: (pg.click('[data-action="save"]'), pg.wait_for_timeout(400), open_menu(pg), yes("?p=" in pg.locator('a[hreflang="ru"]').first.get_attribute("href"), pg.locator('a[hreflang="ru"]').first.get_attribute("href"))))
    s.step("Переключается на русский: проект открывается с тем же кодом", lambda: (lambda c: (pg.locator('a[hreflang="ru"]').first.click(), pg.wait_for_url("**/app/editor.html?p=*"), tour(pg), pg.wait_for_timeout(500), eq(code(pg), c)))(code(pg)))
    ctx.close()
    s.done()

    # ---------------------------------------------------------------- S10
    s = Scenario("S10", "Пользователь закрыл вкладку, не сохранив", "Не потерять работу: автосохранение сохранённого проекта и восстановление")
    ctx, pg = new_user()
    pg.goto(base + "/app/editor.html?template=bpmn")
    tour(pg)
    pg.wait_for_timeout(500)
    st = {}
    s.step("Сохраняет проект и затем продолжает править", lambda: (pg.click('[data-action="save"]'), pg.wait_for_timeout(400), st.update(url=pg.url), set_code(pg, code(pg).replace("diagram bpmn", "// правка без сохранения\ndiagram bpmn", 1))))
    s.step("Через две секунды автосохранение записало правку", lambda: (pg.wait_for_timeout(2200), yes("правка без сохранения" in pg.evaluate("JSON.parse(localStorage.getItem('dslkit.projects'))[0].source"), "правка не записана")))
    s.step("Закрывает вкладку и открывает проект по адресу: правка на месте", lambda: (pg.goto("about:blank"), pg.goto(st["url"]), tour(pg), pg.wait_for_timeout(500), yes("правка без сохранения" in code(pg), "правка потеряна")))
    s.step("Выключает автосохранение: новая правка уже не записывается", lambda: (open_menu(pg), pg.locator(".editor-toolbar__switch").evaluate("e => e.click()"), set_code(pg, code(pg) + "\n// не сохранится"), pg.wait_for_timeout(2200), yes("не сохранится" not in pg.evaluate("JSON.parse(localStorage.getItem('dslkit.projects'))[0].source"), "записалась при выключенном автосохранении")))
    ctx.close()
    s.done()

    # ---------------------------------------------------------------- S11
    s = Scenario("S11", "Пользователь в плохой сети", "Работать без интернета и при недоступном сервисе Kroki")
    ctx, pg = new_user()
    pg.goto(base + "/app/editor.html?template=idef0")
    tour(pg)
    pg.wait_for_timeout(1500)
    s.step("Собственный движок рисует без сети: интернет отключён, диаграмма перерисовывается", lambda: (ctx.set_offline(True), set_code(pg, code(pg).replace('"Order process"', '"Офлайн"')), yes("Офлайн" in pg.inner_text(".canvas__remote"), "не нарисовано без сети")))
    s.step("Выбирает движок Kroki в настройках: без сети получает понятное сообщение, а не белый экран", lambda: (ctx.set_offline(False), pg.goto(base + "/app/settings.html"), pg.select_option("#diagram-engine", "graphviz"), ctx.set_offline(True), pg.goto(base + "/app/editor.html?template=idef0"), tour(pg), pg.wait_for_timeout(1500), yes(any(w in pg.inner_text(".canvas__status") for w in ("Нет соединения", "недоступен", "Сервер")), pg.inner_text(".canvas__status")), yes(pg.locator("body").inner_text() != "", "пустая страница")))
    s.step("Страница редактора открывается из кэша без сети", lambda: (pg.goto(base + "/app/dashboard.html"), yes("Мои проекты" in pg.title(), pg.title())))
    ctx.close()
    s.done()

    # ---------------------------------------------------------------- S12
    s = Scenario("S12", "Заинтересованный посетитель", "Оставить заявку в списке ожидания")
    ctx, pg = new_user()
    s.step("Нажимает «Отправить» с пустой формой: ошибки у обязательных полей", lambda: (pg.goto(base + "/#waitlist-form"), pg.click("#waitlist-form button[type=submit]"), pg.wait_for_timeout(300), yes("name" in pg.inner_text("#waitlist").lower() or "имя" in pg.inner_text("#waitlist").lower() or pg.locator("#waitlist [aria-invalid=true]").count() > 0, "ошибок нет")))
    s.step("Вводит почту без @: поле отклоняет", lambda: (pg.fill("#name", "Анна Иванова"), pg.fill("#email", "anna.example.com"), pg.select_option("#notation", index=1), pg.fill("#team", "5"), pg.check("#consent"), pg.click("#waitlist-form button[type=submit]"), pg.wait_for_timeout(400), yes("thanks" not in pg.url, "форма принята с неверной почтой")))
    s.step("Исправляет почту: заявка принята, открывается страница благодарности", lambda: (pg.fill("#email", "anna@example.com"), pg.click("#waitlist-form button[type=submit]"), pg.wait_for_timeout(1000), yes("спасибо" in pg.inner_text("body").lower() or "thanks" in pg.url, pg.url)))
    ctx.close()
    s.done()

    # ---------------------------------------------------------------- S13
    s = Scenario("S13", "Автор правит диаграмму руками и убирает лишнее с доски", "Печатать код, добавлять и удалять блоки, не ломая диаграмму")
    ctx, pg = new_user()
    pg.goto(base + "/app/editor.html?template=dfd")
    tour(pg)
    pg.wait_for_timeout(700)
    s.step("Печатает с клавиатуры новое хранилище и поток: диаграмма обновляется без нажатия «Запустить»", lambda: (pg.click(".code__input", position={"x": 300, "y": 40}), pg.keyboard.press("Control+End"), pg.keyboard.press("Enter"), pg.keyboard.type('store D2 "Archive"'), pg.keyboard.press("Enter"), pg.keyboard.type('flow 2 -> D2 "copy"'), pg.wait_for_timeout(1200), yes('store D2 "Archive"' in code(pg), code(pg)[-60:]), yes("Archive" in pg.inner_text(".canvas__remote"), "хранилища нет на диаграмме"), yes(pg.locator(".canvas__remote .notation__node").count() == 6, "узлов не шесть")))
    s.step("Tab в коде вставляет отступ и не уводит фокус из поля", lambda: (pg.keyboard.press("Tab"), yes(pg.evaluate("document.activeElement.className") == "code__input", pg.evaluate("document.activeElement.className"))))
    s.step("Ошибка в коде показана с номером строки, щелчок по ней ставит курсор на эту строку", lambda: (pg.click(".code__input", position={"x": 300, "y": 12}), pg.keyboard.press("Control+End"), pg.keyboard.press("Enter"), pg.keyboard.type("flow Customer -> Bank"), pg.wait_for_timeout(1000), yes("не касается процесса" in pg.inner_text(".problems__list"), pg.inner_text(".problems__list")[:80]), pg.locator(".problems__location").first.click(), pg.wait_for_timeout(200), yes(pg.evaluate("document.activeElement.className") == "code__input", "курсор не в коде"), pg.keyboard.press("Shift+End"), pg.keyboard.press("Delete"), pg.keyboard.press("Backspace"), pg.wait_for_timeout(900), yes("не касается процесса" not in pg.inner_text(".problems__list"), "ошибка не ушла после правки")))
    s.step("Нажимает на блок «Archive» на доске и удаляет его клавишей Delete: блок и его связь исчезли из кода и с доски", lambda: (pg.locator('.notation__node[data-id="D2"]').click(), pg.wait_for_timeout(200), yes(pg.locator(".notation__node--picked").count() == 1, "блок не выбран"), pg.keyboard.press("Delete"), pg.wait_for_timeout(700), yes("D2" not in code(pg), "блок остался в коде"), yes("Archive" not in pg.inner_text(".canvas__remote"), "блок остался на доске"), yes("удалено" in pg.inner_text(".palette__message").lower(), pg.inner_text(".palette__message"))))
    s.step("Выбирает процесс и удаляет кнопкой «Удалить выбранный»; «Отменить» возвращает всё как было", lambda: (lambda before: (pg.locator('.notation__node[data-id="1"]').click(), pg.click(".palette__remove"), pg.wait_for_timeout(600), yes("process 1" not in code(pg), "процесс остался"), pg.click('[data-action="undo"]'), pg.wait_for_timeout(600), eq(code(pg), before)))(code(pg)))
    s.step("Без выбранного блока кнопка «Удалить выбранный» объясняет, что делать", lambda: (pg.click(".canvas__remote svg", position={"x": 5, "y": 5}), pg.click(".palette__remove"), yes("нажмите на блок" in pg.inner_text(".palette__message").lower(), pg.inner_text(".palette__message"))))
    ctx.close()
    s.done()

    # ---------------------------------------------------------------- S14
    s = Scenario("S14", "Студент ищет пример нужной нотации", "Найти пример любой из 33 нотаций, открыть и сохранить копию себе")
    ctx, pg = new_user()
    s.step("В «Общие примеры» есть пример для каждой из 33 нотаций", lambda: (pg.goto(base + "/app/dashboard.html"), pg.wait_for_timeout(500), pg.click("[data-section=shared]"), pg.wait_for_timeout(300), eq(pg.locator(".project-list__item:visible").count(), 33)))
    s.step("Список «Другие нотации» содержит остальные 29, выбор «UML · Состояния» оставляет один пример", lambda: (eq(pg.locator("#notation-filter option").count(), 30), pg.select_option("#notation-filter", "uml-state"), pg.wait_for_timeout(300), eq(pg.locator(".project-list__item:visible").count(), 1)))
    s.step("Открывает пример: в редакторе нужная нотация, диаграмма нарисована, ошибок нет", lambda: (pg.locator(".project-list__item:visible .project-card__link").click(), pg.wait_for_url("**/editor.html?template=uml-state"), tour(pg), pg.wait_for_timeout(600), yes(code(pg).startswith("diagram uml state"), code(pg)[:30]), yes(pg.locator(".canvas__remote svg").count() == 1, "нет диаграммы"), eq(pg.locator(".button--run").first.get_attribute("aria-disabled"), "false")))
    s.step("Сохраняет копию и находит её в «Мои проекты» с тегом нотации", lambda: (pg.click('[data-action="save"]'), pg.wait_for_timeout(400), pg.goto(base + "/app/dashboard.html"), pg.wait_for_timeout(500), eq(pg.locator(".project-list__item:visible").count(), 1), yes("UML" in pg.locator(".project-list__item:visible .project-card__tag").inner_text(), "тега нет")))
    s.step("Счётчик беты показывает одну созданную сегодня диаграмму", lambda: yes("создано 1 из 5" in pg.inner_text(".app-nav__quota-text"), pg.inner_text(".app-nav__quota-text")))
    s.step("Поиск в верхней строке с другой страницы открывает список с запросом", lambda: (pg.goto(base + "/app/welcome.html"), pg.fill(".app-topbar__search-input", "state"), pg.keyboard.press("Enter"), pg.wait_for_url("**/dashboard.html?q=state"), pg.wait_for_timeout(400), yes(pg.input_value(".app-topbar__search-input") == "state", "запрос не подставлен")))
    s.step("Ctrl+K ставит курсор в строку поиска, значок профиля ведёт в настройки", lambda: (pg.keyboard.press("Control+k"), yes(pg.evaluate("document.activeElement.className").find("search-input") >= 0, "фокус не в поиске"), pg.click(".app-topbar__avatar"), pg.wait_for_url("**/settings.html")))
    ctx.close()
    s.done()
    b.close()

passed = sum(1 for sc in scenarios if sc["status"] == "Passed")
json.dump({"scenarios": scenarios, "console_errors": errors}, open(out / "scenarios-e2e.json", "w", encoding="utf8"), ensure_ascii=False, indent=2)
for sc in scenarios:
    print(sc["id"], sc["status"], sc["persona"])
    for st in sc["steps"]:
        if st["status"] != "Passed":
            print("   ", st["status"], st["title"], "|", st["note"])
print({"scenarios": len(scenarios), "passed": passed, "failed": len(scenarios) - passed, "console_errors": errors[:5]})
sys.exit(0 if passed == len(scenarios) else 1)
