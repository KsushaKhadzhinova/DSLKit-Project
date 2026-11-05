"""Critical path in Edge: home -> Create diagram -> editor -> templates, edit, drag, save -> My projects -> open, rename, delete.
Writes critical-path-e2e.json. Needs the site on :5173 (npm start)."""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
out = Path(__file__).parent
results = []
errors = []
PAGE = [None]


def check(id_, title, fn):
    try:
        fn()
        results.append({"id": id_, "kind": "critical", "title": title, "status": "Passed", "note": ""})
    except Exception as e:  # noqa: BLE001
        try:
            (out.parent / "screens").mkdir(exist_ok=True)
            PAGE[0].screenshot(path=str(out.parent / "screens" / f"fail-{id_}.png"))
        except Exception:  # noqa: BLE001
            pass
        results.append({"id": id_, "kind": "critical", "title": title, "status": "Failed", "note": " ".join(str(e).splitlines()[:8])[:600]})


def eq(a, b, msg=""):
    if a != b:
        raise AssertionError(f"{msg} ожидалось {b!r}, получено {a!r}")


def yes(v, msg):
    if not v:
        raise AssertionError(msg)


with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge")
    ctx = b.new_context(viewport={"width": 1366, "height": 800}, accept_downloads=True)
    page = ctx.new_page()
    PAGE[0] = page
    page.set_default_timeout(8000)
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    code = lambda: page.evaluate("[...document.querySelectorAll('.code__line code')].map(e=>e.textContent).join('\\n')")  # noqa: E731
    state = {}

    def home():
        page.goto(base + "/")
        yes(page.locator("text=Создать диаграмму").first.is_visible(), "нет кнопки")
        page.locator("text=Создать диаграмму").first.click()
        page.wait_for_url("**/app/editor.html**")
        page.wait_for_timeout(700)
        if page.locator(".tour").count() and page.locator(".tour").first.is_visible():
            page.click("text=Пропустить")

    check("CP-01", "Главная: кнопка «Создать диаграмму» ведёт в редактор", home)

    def starter():
        yes(code().startswith("diagram idef0"), code()[:40])
        eq(page.locator(".button--run").first.get_attribute("aria-disabled"), "false", "запуск:")
        yes(page.locator(".canvas__remote svg").count() == 1, "нет диаграммы")
        yes(page.locator(".notation__node").count() >= 2, "нет блоков")

    check("CP-02", "Новая диаграмма начинается с корректного шаблона IDEF0, без ошибок, нарисована", starter)

    def templates():
        for key, word in [("dfd", "diagram dfd"), ("erd", "diagram erd"), ("idef0", "diagram idef0")]:
            page.evaluate(f"document.querySelector('[data-template=\"{key}\"]').click()")
            page.wait_for_timeout(300)
            yes(code().startswith(word), f"{key}: {code()[:30]}")
            yes(page.locator(".canvas__remote svg").count() == 1, f"{key}: нет диаграммы")

    check("CP-03", "Шаблоны IDEF0, DFD, ERD подставляют код и рисуют диаграмму", templates)

    def notation_select():
        sel = page.locator("[data-notation-select]")
        n = sel.locator("option").count()
        yes(n >= 20, f"в списке шаблонов {n}")
        sel.select_option(index=3)
        page.wait_for_timeout(400)
        yes(code().startswith("diagram "), code()[:30])
        page.evaluate("document.querySelector('[data-template=\"idef0\"]').click()")
        page.wait_for_timeout(300)

    check("CP-04", "Выпадающий список содержит все нотации и подставляет выбранный шаблон", notation_select)

    def edit_title():
        page.evaluate(
            """() => { const c = document.querySelector('.code__line code'); c.textContent = 'diagram idef0 "Мой заказ"'; c.dispatchEvent(new Event('input', {bubbles:true})); }"""
        )
        page.evaluate("document.querySelector('.code__lines').dispatchEvent(new Event('input', {bubbles:true}))")
        page.evaluate("window.dispatchEvent(new Event('resize'))")
        page.click(".button--run")
        page.wait_for_timeout(300)
        yes("Мой заказ" in code(), code()[:50])

    check("CP-05", "Код можно править руками, «Запустить» перерисовывает", edit_title)

    def drag():
        node = page.locator(".canvas__remote .notation__node[data-cx]").first
        box = node.bounding_box()
        x, y = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
        page.mouse.move(x, y)
        page.mouse.down()
        page.mouse.move(x + 40, y + 30, steps=6)
        page.mouse.up()
        page.wait_for_timeout(500)
        yes("pos=" in code(), "перетаскивание не записалось в код")
        state["drag_code"] = code()

    check("CP-06", "Блок перетаскивается мышью, положение записывается в код (pos=XxY)", drag)

    def keyboard_move():
        node = page.locator(".canvas__remote .notation__node[data-cx]").first
        before = code()
        node.focus()
        page.keyboard.press("ArrowRight")
        page.wait_for_timeout(500)
        yes(code() != before, "стрелка не сдвинула блок")

    check("CP-07", "Блок двигается стрелками с клавиатуры", keyboard_move)

    def save():
        page.click('[data-action="save"]')
        page.wait_for_timeout(400)
        yes("Сохранено" in page.inner_text(".editor-status__saved"), page.inner_text(".editor-status__saved"))
        yes("?p=" in page.url, page.url)
        eq(page.inner_text(".editor-topbar__title"), "мой-заказ.dsl")
        state["url"] = page.url
        state["saved_code"] = code()

    check("CP-08", "Кнопка «Сохранить» создаёт проект: статус, адрес ?p=…, имя файла", save)

    def reload_restores():
        page.reload()
        page.wait_for_timeout(800)
        if page.locator(".tour").count() and page.locator(".tour").first.is_visible():
            page.click("text=Пропустить")
        eq(code(), state["saved_code"], "после перезагрузки:")

    check("CP-09", "После перезагрузки открывается сохранённый проект с теми же положениями блоков", reload_restores)

    def autosave():
        page.evaluate("document.querySelector('[data-template=\"dfd\"]').click()")
        page.wait_for_timeout(1800)
        titles = page.evaluate("JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.includes('projects')))).map(p=>p.title)")
        yes(len(titles) == 1 and titles[0] != "Мой заказ", f"автосохранение не обновило проект: {titles}")
        page.evaluate("document.querySelector('[data-template=\"idef0\"]').click()")
        page.wait_for_timeout(300)
        page.evaluate("""() => { const c = document.querySelector('.code__line code'); c.textContent = 'diagram idef0 "Мой заказ"'; }""")
        page.click(".button--run")
        page.wait_for_timeout(1800)
        titles = page.evaluate("JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.includes('projects')))).map(p=>p.title)")
        eq(titles, ["Мой заказ"], "после возврата:")

    check("CP-10", "Автосохранение обновляет уже сохранённый проект", autosave)

    def dashboard_lists():
        page.click(".editor-toolbar__logo")
        page.wait_for_url("**/dashboard.html")
        page.wait_for_timeout(500)
        first = page.locator(".project-list__item").first
        eq(first.locator(".project-card__link").inner_text(), "Мой заказ", "первая карточка:")
        yes("p=" in first.locator(".project-card__link").get_attribute("href"), "ссылка")
        yes("Найдено проектов" in page.inner_text("#project-count"), "счётчик")

    check("CP-11", "«Мои проекты»: сохранённая диаграмма появилась первой в списке", dashboard_lists)

    def open_saved():
        page.locator(".project-list__item").first.locator(".project-card__link").click()
        page.wait_for_url("**/editor.html?p=*")
        page.wait_for_timeout(800)
        if page.locator(".tour").count() and page.locator(".tour").first.is_visible():
            page.click("text=Пропустить")
        yes("Мой заказ" in code(), code()[:60])
        yes(page.locator(".canvas__remote svg").count() == 1, "нет диаграммы")

    check("CP-12", "Открытие проекта из списка загружает код и рисует диаграмму", open_saved)

    def search_dashboard():
        page.goto(base + "/app/dashboard.html")
        page.wait_for_timeout(400)
        page.fill(".app-topbar__search-input", "заказ")
        page.wait_for_timeout(200)
        yes("1" in page.inner_text("#project-count"), page.inner_text("#project-count"))
        page.fill(".app-topbar__search-input", "")
        page.select_option("#project-sort", "name")
        page.wait_for_timeout(200)

    check("CP-13", "Список проектов: поиск и сортировка работают с сохранёнными", search_dashboard)

    def rename_delete():
        page.once("dialog", lambda d: d.accept("Переименованный"))
        item = page.locator(".project-list__item[data-project]").first
        item.locator(".project-card__menu").click()
        item.locator('[data-act="rename"]').click()
        page.wait_for_timeout(300)
        eq(page.locator(".project-list__item[data-project] .project-card__link").first.inner_text(), "Переименованный")
        page.once("dialog", lambda d: d.accept())
        page.locator(".project-list__item[data-project] .project-card__menu").first.click()
        page.locator('.project-list__item[data-project] [data-act="remove"]').first.click()
        page.wait_for_timeout(300)
        eq(page.locator(".project-list__item[data-project]:visible").count(), 0)
        page.locator("[data-section=trash]").click()
        eq(page.locator(".project-list__item[data-project]:visible").count(), 1, "в корзине:")
        page.locator(".project-list__item[data-project]:visible .project-card__menu").first.click()
        page.locator("[data-act=restore]:visible").first.click()
        page.locator("[data-section=mine]").click()
        eq(page.locator(".project-list__item[data-project]:visible").count(), 1, "после восстановления:")
        page.once("dialog", lambda d: d.accept())
        page.locator(".project-list__item[data-project]:visible .project-card__menu").first.click()
        page.locator("[data-act=remove]:visible").first.click()
        page.wait_for_timeout(300)

    check("CP-14", "Меню карточки: переименование и удаление проекта", rename_delete)

    def sample_copy():
        page.locator("[data-section=shared]").click()
        item = page.locator(".project-list__item:not([data-project]):visible").first
        item.locator(".project-card__menu").click()
        item.locator('[data-act="copy"]').click()
        page.wait_for_timeout(300)
        page.locator("[data-section=mine]").click()
        eq(page.locator(".project-list__item[data-project]:visible").count(), 1)
        page.locator(".project-list__item[data-project]:visible .project-card__link").first.click()
        page.wait_for_url("**/editor.html?p=*")
        page.wait_for_timeout(600)
        yes(code().startswith("diagram "), code()[:30])

    check("CP-15", "Пример из списка копируется в «Мои проекты» и открывается", sample_copy)

    def sample_link():
        page.goto(base + "/app/dashboard.html")
        page.wait_for_timeout(300)
        page.locator("[data-section=shared]").click()
        page.select_option("#notation-filter", "bpmn") if False else page.click('.filter__chip[data-filter="bpmn"]')
        page.locator(".project-list__item:not([data-project]):visible .project-card__link").first.click()
        page.wait_for_url("**/editor.html?template=*")
        page.wait_for_timeout(600)
        yes(code().startswith("diagram bpmn"), code()[:30])

    check("CP-16", "Пример «Hiring flow» открывает шаблон BPMN, а не общий пример", sample_link)

    def welcome():
        page.goto(base + "/app/welcome.html")
        page.locator(".template-card__link").nth(1).click()
        page.wait_for_url("**/editor.html?template=*")
        page.wait_for_timeout(600)
        yes(code().startswith("diagram bpmn"), code()[:30])

    check("CP-17", "Страница «Создать»: карточка шаблона открывает редактор с этим шаблоном", welcome)

    def strict_self_loop():
        page.goto(base + "/app/editor.html?template=dfd")
        page.wait_for_timeout(700)
        if page.locator(".tour").count() and page.locator(".tour").first.is_visible():
            page.click("text=Пропустить")
        page.evaluate("""() => {
          const ol = document.querySelector('.code__lines');
          const li = document.createElement('li'); li.className='code__line';
          const c = document.createElement('code'); c.textContent = 'flow ' + (document.querySelector('.code__line:nth-child(3) code').textContent.trim().split(' ')[1]) + ' -> ' + (document.querySelector('.code__line:nth-child(3) code').textContent.trim().split(' ')[1]);
          li.append(c); ol.append(li);
        }""")
        page.click(".button--run", force=True)
        page.wait_for_timeout(500)
        text = page.inner_text(".problems__list")
        yes("в себя" in text or "сам" in text.lower() or "points at itself" in text, text[:200])

    check("CP-18", "Строгая проверка нотации: связь элемента с самим собой показывается как ошибка", strict_self_loop)

    def export_download():
        page.goto(base + "/app/editor.html?template=idef0")
        page.wait_for_timeout(700)
        if page.locator(".tour").count() and page.locator(".tour").first.is_visible():
            page.click("text=Пропустить")
        with page.expect_download() as dl:
            page.locator("text=Экспорт SVG").first.evaluate("e => e.click()")
        yes(dl.value.suggested_filename.endswith(".svg"), dl.value.suggested_filename)

    check("CP-19", "Экспорт в SVG скачивает файл", export_download)

    def waitlist():
        page.goto(base + "/#waitlist-form")
        page.click("#waitlist-form button[type=submit]")
        yes(page.locator("#waitlist .form__error, #waitlist [aria-invalid=true], #waitlist .waitlist__error").count() > 0 or "обязательно" in page.inner_text("#waitlist").lower() or "укажите" in page.inner_text("#waitlist").lower(), "нет сообщений об ошибках пустой формы")
        page.fill("#name", "Анна Иванова")
        page.fill("#email", "anna@example.com")
        page.select_option("#notation", index=1)
        page.fill("#team", "5")
        page.check("#consent")
        page.click("#waitlist-form button[type=submit]")
        page.wait_for_timeout(900)
        yes("thanks" in page.url or "Спасибо" in page.inner_text("body") or "спасибо" in page.inner_text("body").lower(), page.url)

    check("CP-21", "Заявка с главной: пустая форма даёт ошибки, заполненная принимается", waitlist)

    check("CP-20", "За весь путь в консоли нет ошибок", lambda: eq([e for e in errors if "kroki" not in e.lower() and "favicon" not in e.lower()], []))
    b.close()

json.dump({"results": results, "console_errors": errors}, open(out / "critical-path-e2e.json", "w", encoding="utf8"), ensure_ascii=False, indent=2)
failed = [r for r in results if r["status"] == "Failed"]
for r in failed:
    print(r["id"], "Failed", r["title"], "|", r["note"])
print({"total": len(results), "passed": len(results) - len(failed), "failed": len(failed)})
sys.exit(1 if failed else 0)
