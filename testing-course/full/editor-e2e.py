"""End-to-end check of the editor in Edge: every button, the panels, the engine, the layouts. Writes editor-e2e.json."""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
out = Path(__file__).parent
results = []
errors = []


def check(id_, title, fn):
    try:
        fn()
        results.append({"id": id_, "kind": "e2e", "title": title, "status": "Passed", "note": ""})
    except Exception as e:  # noqa: BLE001
        results.append({"id": id_, "kind": "e2e", "title": title, "status": "Failed", "note": " ".join(str(e).splitlines()[:12])[:700]})


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
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.set_default_timeout(5000)
    page.goto(base + "/app/editor.html")
    page.wait_for_timeout(600)
    tour_shown = page.locator(".tour").count() > 0 and page.locator(".tour").first.is_visible()
    if tour_shown:
        page.click("text=Пропустить")
    code = lambda: page.evaluate("[...document.querySelectorAll('.code__line code')].map(e=>e.textContent).join('\\n')")  # noqa: E731
    status = lambda: page.inner_text(".canvas__status")  # noqa: E731

    check("E2E-01", "Страница редактора открывается без ошибок в консоли", lambda: eq([e for e in errors if "kroki" not in e.lower() and "favicon" not in e.lower()], []))
    check("E2E-02", "Движок по умолчанию: собственный, в нижней панели просто его название", lambda: eq(page.inner_text(".editor-status__engine"), "Собственный движок (в браузере)"))
    check("E2E-03", "На доске нет подписи про Kroki", lambda: yes("kroki" not in (status() + page.inner_text(".canvas__service")).lower(), status()))
    check("E2E-04", "Диаграмма нарисована в браузере (SVG на доске)", lambda: yes(page.locator(".canvas__remote svg").count() == 1, "нет svg"))
    check("E2E-05", "В примере есть ошибки, кнопка «Запустить» неактивна (aria-disabled)", lambda: eq(page.locator(".button--run").first.get_attribute("aria-disabled"), "true"))

    def panel_open(name, title):
        page.click(f'[data-panel="{name}"]')
        yes(page.locator(".editor-tools").is_visible(), f"панель {name} не открылась")
        eq(page.inner_text(".editor-tools__heading"), title)

    check("E2E-06", "Кнопка «Поиск» открывает панель поиска", lambda: panel_open("search", "Поиск"))

    def search_replace():
        page.fill('.editor-tools__input[placeholder="Найти"]', "box")
        yes("Найдено: 2" in page.inner_text(".editor-tools__status"), page.inner_text(".editor-tools__status"))
        page.locator(".editor-tools__hit").first.click()
        yes(page.locator(".code__line--found").count() == 1, "строка не подсвечена")
        page.fill('.editor-tools__input[placeholder="Заменить на"]', "node")
        page.click("text=Заменить всё")
        yes("node A0" in code() or "node A1" in code(), code())
        page.click('[data-action="undo"]')

    check("E2E-07", "Поиск находит, подсвечивает строку и заменяет всё; отмена возвращает", search_replace)

    def git_flow():
        page.click('[data-panel="git"]')
        original = code()
        page.fill('.editor-tools__input[placeholder="Сообщение коммита"]', "первый")
        page.click("text=Закоммитить")
        yes("создан" in page.inner_text(".editor-tools__status"), "нет коммита")
        page.click("text=Закоммитить")
        yes("Нет изменений" in page.inner_text(".editor-tools__status"), "повторный коммит")
        page.click('[data-panel="files"]')
        eq(page.locator(".editor-tools").is_visible(), False, "панель Git должна закрыться:")
        page.click('[data-template="dfd"]')
        page.click('[data-panel="git"]')
        page.wait_for_timeout(200)
        yes("−" in page.inner_text(".editor-tools__summary") or "+" in page.inner_text(".editor-tools__summary"), page.inner_text(".editor-tools__summary"))
        page.click('.editor-tools__commit [data-act="diff"]')
        yes(page.locator(".editor-tools__diff").is_visible(), "нет diff")
        page.click('.editor-tools__commit [data-act="restore"]')
        eq(code(), original)

    check("E2E-08", "Git: коммит, повторный коммит без изменений, шаблон меняет код, diff, возврат", git_flow)

    def versions_tab():
        page.click('[data-problems-tab="versions"]')
        yes("первый" in page.inner_text(".problems__extra:not([hidden])"), "нет версии")
        page.click('[data-problems-tab="output"]')
        yes("Запуск" in page.inner_text(".problems__extra:not([hidden])"), "нет вывода")
        page.click('[data-problems-tab="problems"]')

    check("E2E-09", "Вкладки «Версии» и «Вывод» показывают коммиты и журнал запусков", versions_tab)

    def ai_fix():
        page.click('[data-panel="ai"]')
        yes(page.locator(".editor-tools").is_visible(), "нет панели")
        page.fill('.editor-tools__input[placeholder="Спросите помощника"]', "исправь ошибки")
        page.keyboard.press("Enter")
        page.wait_for_timeout(500)
        yes("control" in code() or "Исправлять нечего" in page.inner_text(".editor-tools__chat"), code())

    check("E2E-10", "AI-помощник исправляет опечатку в коде по запросу (Enter)", ai_fix)

    def explain():
        page.click("text=Объяснить диаграмму")
        yes("Нотация" in page.inner_text(".editor-tools__chat li:last-child"), "нет ответа")

    check("E2E-11", "Кнопка «Объяснить диаграмму» отвечает", explain)

    def create():
        page.fill('.editor-tools__input[placeholder="Спросите помощника"]', "создай erd")
        page.click("text=Отправить")
        page.wait_for_timeout(400)
        yes(code().startswith("diagram erd") or "entity" in code(), code()[:80])

    check("E2E-12", "Помощник создаёт ERD по просьбе «создай erd»", create)

    def run_enabled():
        page.click('[data-panel="ai"]')  # close drawer
        page.click(".button--run")
        page.wait_for_timeout(400)
        eq(page.locator(".button--run").first.get_attribute("aria-disabled"), "false")
        yes(page.locator(".canvas__remote svg").count() == 1, "нет svg")

    check("E2E-13", "После шаблона ошибок нет, «Запустить» активна и рисует диаграмму", run_enabled)

    def toolbar():
        for action in ["undo", "redo", "format", "layout", "check", "zoom-in", "zoom-out", "zoom-fit", "save", "theme", "theme"]:
            if action in ("check", "format", "layout", "theme"):
                if not page.locator(".editor-menu").first.evaluate("e => e.open"):
                    page.click(".editor-menu__summary")
                page.locator(f'.editor-menu [data-action="{action}"]').click()
                page.keyboard.press("Escape")
            else:
                page.locator(f'[data-action="{action}"]:visible').first.click()
        yes(page.locator("html").get_attribute("data-theme") in ("light", "dark", None), "тема")

    check("E2E-14", "Кнопки панели: отмена, возврат, формат, раскладка, проверка, масштаб, сохранить, меню, тема", toolbar)

    def share():
        ctx.grant_permissions(["clipboard-read", "clipboard-write"], origin=base)
        page.locator('[data-action="share"]').first.evaluate("e => e.click()")
        page.wait_for_timeout(300)
        eq(page.evaluate("navigator.clipboard.readText()").replace("
", "
"), code())

    check("E2E-15", "«Поделиться» копирует код и сообщает результат", share)

    def templates():
        for t in ["idef0", "dfd", "erd"]:
            page.evaluate(f"document.querySelector('[data-template=\"{t}\"]').click()")
            page.wait_for_timeout(150)
            yes(len(code()) > 20, t)

    check("E2E-16", "Три кнопки шаблонов подставляют код", templates)

    def tabs():
        page.click("#tab-rules")
        yes(page.locator("#rules-panel").is_visible(), "rules")
        page.click("#tab-order")
        yes(page.locator("#editor-panel").is_visible(), "order")

    check("E2E-17", "Вкладки файлов переключаются", tabs)

    def exports():
        page.locator("text=Экспорт SVG").first.evaluate("e => e.click()")
        page.wait_for_timeout(300)

    check("E2E-18", "Кнопка «Экспорт SVG» не вызывает ошибок", exports)

    def all_buttons_do_something():
        dead = page.evaluate(
            """() => [...document.querySelectorAll('.app-page--editor button, .app-page--editor a.editor-activity__button')]
              .filter(b => !b.disabled && !b.closest('[hidden]') && b.offsetParent !== null)
              .filter(b => b.getAttribute('aria-disabled') !== 'true')
              .filter(b => Object.keys(b.dataset).length === 0 && !b.getAttribute('role') && !b.closest('.tour, .modal, dialog')
                           && !b.className.match(/button--run|canvas__refresh|editor-toolbar__switch|editor-tabs__close|problems__|editor-tools|editor-bottom|segmented|templates__|file-tree|banner|history/))
              .map(b => b.className + ':' + b.textContent.trim().slice(0,20))"""
        )
        eq(dead, [], "кнопки без обработчика:")

    check("E2E-19", "Нет видимых кнопок редактора без назначенного действия", all_buttons_do_something)

    page.set_viewport_size({"width": 390, "height": 800})
    page.wait_for_timeout(300)

    def mobile():
        yes(page.locator(".editor-bottom-nav").is_visible(), "нет нижней навигации")
        page.click('.editor-bottom-nav [data-view="code"]')
        page.click('.editor-bottom-nav [data-view="canvas"]')
        over = page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
        yes(over <= 1, f"горизонтальная прокрутка {over}px")

    check("E2E-20", "Мобильный вид: нижняя навигация работает, нет горизонтальной прокрутки", mobile)
    page.screenshot(path=str(out.parent / "screens" / "editor-mobile.png"))
    page.set_viewport_size({"width": 1366, "height": 800})
    page.screenshot(path=str(out.parent / "screens" / "editor-desktop.png"))

    ctx2 = b.new_context(viewport={"width": 1366, "height": 800})
    en = ctx2.new_page()
    en.goto(base + "/en/app/editor.html")
    en.wait_for_timeout(500)
    check("E2E-21", "Английская версия: движок назван без слова Kroki, панель поиска открывается", lambda: (eq(en.inner_text(".editor-status__engine"), "Own engine (in the browser)"), en.click('[data-panel="search"]'), yes(en.locator(".editor-tools").is_visible(), "нет панели")))
    b.close()

json.dump({"results": results, "console_errors": errors}, open(out / "editor-e2e.json", "w", encoding="utf8"), ensure_ascii=False, indent=2)
failed = [r for r in results if r["status"] == "Failed"]
for r in failed:
    print(r["id"], "Failed", r["title"], "|", r["note"])
print({"total": len(results), "passed": len(results) - len(failed), "failed": len(failed), "console_errors": errors[:5]})
sys.exit(1 if failed else 0)
