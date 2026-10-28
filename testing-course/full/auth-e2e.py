"""Accounts in Edge: registration, sign-in, sign-out and creating a diagram after signing in (Russian, English, phone width, guest).
Writes auth-e2e.json. Needs the site on :5173 (npm start). The accounts are created in a clean browser profile with test data only."""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
out = Path(__file__).parent
results = []
errors = []
PAGE = [None]
PASSWORD = "test-phrase-2026"


def check(id_, title, fn):
    try:
        fn()
        results.append({"id": id_, "kind": "auth", "title": title, "status": "Passed", "note": ""})
        print("ok", id_, flush=True)
    except Exception as e:  # noqa: BLE001
        try:
            (out.parent / "screens").mkdir(exist_ok=True)
            PAGE[0].screenshot(path=str(out.parent / "screens" / f"fail-{id_}.png"))
        except Exception:  # noqa: BLE001
            pass
        results.append({"id": id_, "kind": "auth", "title": title, "status": "Failed", "note": " ".join(str(e).splitlines()[:8])[:600]})
        print("FAIL", id_, results[-1]["note"][:200], flush=True)


def eq(a, b, msg=""):
    if a != b:
        raise AssertionError(f"{msg} ожидалось {b!r}, получено {a!r}")


def yes(v, msg):
    if not v:
        raise AssertionError(msg)


def run_variant(p, tag, root, lang, viewport):
    """One clean browser profile: guest -> registration -> create a diagram -> sign out -> sign in -> create another one."""
    ru = lang == "ru"
    word = {
        "login": "Войти" if ru else "Sign in",
        "register": "Регистрация" if ru else "Sign up",
        "logout": "Выйти" if ru else "Sign out",
        "saved": "Сохранено" if ru else "Saved",
    }
    b = p.chromium.launch(channel="msedge")
    ctx = b.new_context(viewport=viewport)
    ctx.add_init_script("try { localStorage.setItem('dslkit.tour-done', 'true'); } catch (e) {}")
    page = ctx.new_page()
    PAGE[0] = page
    page.set_default_timeout(8000)
    page.on("pageerror", lambda e: errors.append(f"{tag}: {e}"))
    page.on("console", lambda m: errors.append(f"{tag}: {m.text}") if m.type == "error" and "kroki" not in m.text.lower() else None)
    mobile = viewport["width"] < 768
    code = lambda: page.evaluate("[...document.querySelectorAll('.code__line code')].map(e=>e.textContent).join('\\n')")  # noqa: E731
    email = f"{tag}@example.com"
    prefix = base + root

    def open_menu():
        if mobile and page.locator(".burger__button").is_visible():
            page.locator(".burger__button").click()

    def guest_header():
        page.goto(prefix + "/")
        open_menu()
        yes(page.locator(".auth [data-auth-guest]:visible", has_text=word["login"]).count() == 1, "нет ссылки входа")
        yes(page.locator(".auth [data-auth-guest]:visible", has_text=word["register"]).count() == 1, "нет ссылки регистрации")
        eq(page.locator("[data-auth-logout]:visible").count(), 0, "кнопка выхода у гостя:")

    check(f"AUTH-{tag}-01", f"[{tag}] Главная: гостю показаны «Войти» и «Регистрация», выхода нет", guest_header)

    def guest_creates():
        page.goto(prefix + "/app/dashboard.html")
        page.wait_for_timeout(400)
        yes(page.locator("[data-project]").count() == 6, f"сидов {page.locator('[data-project]').count()}")
        page.goto(prefix + "/app/editor.html?template=idef0")
        page.wait_for_timeout(500)
        page.click('[data-action="save"]')
        page.wait_for_timeout(400)
        yes("?p=" in page.url, page.url)
        page.goto(prefix + "/app/dashboard.html")
        page.wait_for_timeout(400)
        eq(page.locator("[data-project]").count(), 7, "6 стартовых и сохранённый проект гостя:")

    check(f"AUTH-{tag}-02", f"[{tag}] Гость: на «Мои проекты» стартовые диаграммы, создание и сохранение работают как раньше", guest_creates)

    def register_errors():
        page.goto(prefix + "/app/register.html")
        page.click("#auth-form [type=submit]")
        for id_ in ["name", "email", "password", "confirm"]:
            yes(page.locator(f"#{id_}-error").is_visible(), f"нет ошибки {id_}")
        page.fill("#name", "Ксения" if ru else "Ksenia")
        page.fill("#email", email)
        page.fill("#password", "short")
        page.fill("#confirm", "short")
        page.click("#auth-form [type=submit]")
        yes(page.locator("#password-error").is_visible(), "короткий пароль принят")
        page.fill("#password", PASSWORD)
        page.fill("#confirm", PASSWORD + "x")
        page.click("#auth-form [type=submit]")
        yes(page.locator("#confirm-error").is_visible(), "несовпадение паролей принято")

    check(f"AUTH-{tag}-03", f"[{tag}] Регистрация: пустые поля, короткий пароль и разные пароли дают ошибки", register_errors)

    def register_ok():
        page.fill("#confirm", PASSWORD)
        page.click("#auth-form [type=submit]")
        page.wait_for_url("**/app/welcome.html")
        stored = page.evaluate("JSON.stringify(Object.entries(localStorage))")
        yes(PASSWORD not in stored, "пароль лежит в открытом виде")
        yes(len(json.loads(page.evaluate("localStorage.getItem('dslkit.accounts')"))[0]["hash"]) == 64, "нет хеша")

    check(f"AUTH-{tag}-04", f"[{tag}] Регистрация создаёт аккаунт, ведёт на приветствие, пароль хранится только хешем", register_ok)

    def signed_header():
        page.goto(prefix + "/app/dashboard.html")
        page.wait_for_timeout(400)
        yes(page.locator("[data-auth-logout]:visible").count() == 1, "нет кнопки выхода в шапке приложения")
        yes(page.locator("[data-auth-guest]:visible").count() == 0, "у вошедшего видны гостевые ссылки")
        eq(page.locator("[data-project]").count(), 6, "стартовые диаграммы нового пользователя:")
        yes("0" in page.inner_text(".app-nav__quota-text"), page.inner_text(".app-nav__quota-text"))
        page.goto(prefix + "/")
        open_menu()
        yes(page.locator(".auth [data-auth-user]:visible", has_text="Ксения" if ru else "Ksenia").count() == 1, "нет имени на главной")
        yes(page.locator("[data-auth-logout]:visible").count() == 1, "нет кнопки выхода на главной")

    check(f"AUTH-{tag}-05", f"[{tag}] Вошедший: имя и «Выйти» в шапке (главная и приложение), у него свои стартовые проекты", signed_header)

    def create_after_login(title):
        page.goto(prefix + "/app/dashboard.html")
        page.wait_for_timeout(300)
        total = page.locator("[data-project]").count()
        page.locator(".app-topbar__new").click()
        page.wait_for_url("**/app/welcome.html")
        page.locator(".template-card__link").nth(1).click()
        page.wait_for_url("**/editor.html?template=*")
        page.wait_for_timeout(600)
        yes(code().startswith("diagram bpmn"), code()[:30])
        page.evaluate(
            """(t) => { const c = document.querySelector('.code__line code'); c.textContent = 'diagram bpmn "' + t + '"'; c.dispatchEvent(new Event('input', {bubbles:true})); }""",
            title,
        )
        page.evaluate("document.querySelector(\".button--run\").click()")
        page.wait_for_timeout(400)
        yes(title in code(), code()[:60])
        page.click('[data-action="save"]')
        page.wait_for_timeout(500)
        yes(word["saved"] in page.inner_text(".editor-status__saved"), page.inner_text(".editor-status__saved"))
        yes("?p=" in page.url, page.url)
        user_keys = page.evaluate("Object.keys(localStorage).filter(k => k.startsWith('dslkit.projects.'))")
        eq(len(user_keys), 1, "проект должен лежать под ключом пользователя:")
        page.goto(prefix + "/app/dashboard.html")
        page.wait_for_timeout(400)
        eq(page.locator("[data-project] .project-card__link").first.inner_text(), title, "первая карточка:")
        eq(page.locator("[data-project]").count(), total + 1, "число проектов:")
        page.locator("[data-project] .project-card__link").first.click()
        page.wait_for_url("**/editor.html?p=*")
        page.wait_for_timeout(700)
        yes(title in code(), "проект из списка не открылся")
        yes(page.locator(".canvas__remote svg").count() == 1, "нет диаграммы")

    check(f"AUTH-{tag}-06", f"[{tag}] После входа: «Новая диаграмма» -> шаблон -> правка кода -> сохранение -> карточка в списке -> открытие", lambda: create_after_login("First after login"))

    def palette_after_login():
        page.goto(prefix + "/app/editor.html?template=dfd")
        page.wait_for_timeout(600)
        before = code().count("process")
        page.evaluate("document.querySelector(\".palette__item\").click()")
        page.wait_for_timeout(500)
        yes(code() != "", "пустой код")
        yes(page.locator(".palette__message").count() >= 1, "нет сообщения палитры")
        page.click('[data-action="save"]')
        page.wait_for_timeout(500)
        yes("?p=" in page.url, page.url)
        _ = before

    check(f"AUTH-{tag}-07", f"[{tag}] После входа: блок из палитры добавляется и проект сохраняется", palette_after_login)

    def logout():
        page.goto(prefix + "/app/dashboard.html")
        page.wait_for_timeout(300)
        page.locator("[data-auth-logout]:visible").first.click()
        page.wait_for_timeout(700)
        yes("/app/" not in page.url, "после выхода не открылась главная: " + page.url)
        eq(page.evaluate("localStorage.getItem('dslkit.session')"), None, "сессия:")
        open_menu()
        yes(page.locator(".auth [data-auth-guest]:visible", has_text=word["login"]).count() == 1, "после выхода нет «Войти»")
        page.goto(prefix + "/app/dashboard.html")
        page.wait_for_timeout(400)
        yes(page.locator("[data-project] .project-card__link", has_text="First after login").count() == 0, "гость видит проект пользователя")

    check(f"AUTH-{tag}-08", f"[{tag}] Выход: сессия очищена, переход на главную, проекты пользователя гостю не видны", logout)

    def wrong_login():
        page.goto(prefix + "/app/login.html")
        page.fill("#email", email)
        page.fill("#password", "wrong-phrase-0000")
        page.click("#auth-form [type=submit]")
        page.wait_for_timeout(600)
        yes(page.locator("#auth-error").is_visible(), "нет сообщения о неверных данных")
        eq(page.evaluate("localStorage.getItem('dslkit.session')"), None, "сессия при неверном пароле:")

    check(f"AUTH-{tag}-09", f"[{tag}] Вход с неверным паролем: понятная ошибка, сессии нет", wrong_login)

    def login_again():
        page.fill("#password", PASSWORD)
        page.click("#auth-form [type=submit]")
        page.wait_for_url("**/app/dashboard.html")
        page.wait_for_timeout(400)
        yes(page.locator("[data-project] .project-card__link", has_text="First after login").count() == 1, "проект пользователя не вернулся после входа")
        yes(page.locator("[data-auth-logout]:visible").count() == 1, "нет кнопки выхода")

    check(f"AUTH-{tag}-10", f"[{tag}] Повторный вход: проекты пользователя на месте", login_again)

    check(f"AUTH-{tag}-11", f"[{tag}] После повторного входа создание диаграммы работает", lambda: create_after_login("Second after login"))

    def repeat_create():
        for n in range(1, 4):
            page.goto(prefix + "/app/dashboard.html")
            page.wait_for_timeout(300)
            total = page.locator("[data-project]").count()
            page.locator(".app-topbar__new").click()
            page.wait_for_url("**/app/welcome.html")
            page.locator(".template-card__link").nth(n % 3).click()
            page.wait_for_url("**/editor.html?template=*")
            page.wait_for_timeout(600)
            title = f"Round {n}"
            page.evaluate(
                """(t) => { const c = document.querySelector('.code__line code'); c.textContent = c.textContent.replace(/"[^"]*"/, '"' + t + '"'); c.dispatchEvent(new Event('input', {bubbles:true})); }""",
                title,
            )
            page.evaluate("document.querySelector(\".button--run\").click()")
            page.wait_for_timeout(1800)
            yes("?p=" in page.url or page.locator(".editor-status__saved").inner_text() != "", f"круг {n}: проект не создан автоматически")
            page.go_back() if n == 2 else None
            page.goto(prefix + "/app/dashboard.html")
            page.wait_for_timeout(400)
            eq(page.locator("[data-project]").count(), total + 1, f"круг {n}: число проектов:")

    check(f"AUTH-{tag}-12", f"[{tag}] Создать диаграмму, вернуться в «Мои проекты», создать снова (3 раза подряд, с переходом назад)", repeat_create)

    def templates_crudl():
        page.goto(prefix + "/app/dashboard.html")
        page.wait_for_timeout(300)
        eq(page.locator(".app-topbar__avatar").get_attribute("aria-label"), "Настройки" if ru else "Settings", "значок настроек:")
        eq(page.locator(".app-topbar__avatar").inner_text().strip(), "", "в значке настроек остался текст:")
        item = page.locator("[data-project]:visible").first
        item.locator(".project-card__menu").click()
        item.locator('[data-act="template"]').click()
        page.locator("[data-section=templates]").click()
        eq(page.locator("[data-template]:visible").count(), 1, "создание шаблона из проекта:")
        page.once("dialog", lambda d: d.accept("Мой шаблон" if ru else "My template"))
        card = page.locator("[data-template]:visible").first
        card.locator(".project-card__menu").click()
        card.locator('[data-act="rename"]').click()
        eq(page.locator("[data-template]:visible .project-card__link").first.inner_text(), "Мой шаблон" if ru else "My template", "переименование:")
        card = page.locator("[data-template]:visible").first
        card.locator(".project-card__menu").click()
        card.locator('[data-act="edit"]').click()
        page.wait_for_url("**/editor.html?tpl=*")
        page.wait_for_timeout(600)
        page.evaluate(
            """() => { const c = document.querySelector('.code__line code'); c.textContent = c.textContent.replace(/"[^"]*"/, '"Edited template"'); c.dispatchEvent(new Event('input', {bubbles:true})); }"""
        )
        page.click('[data-action="save"]')
        page.wait_for_timeout(400)
        page.goto(prefix + "/app/dashboard.html")
        page.wait_for_timeout(300)
        page.locator("[data-section=templates]").click()
        eq(page.locator("[data-template]:visible").count(), 1, "после правки шаблона:")
        total = page.locator("[data-section=mine]").count()
        _ = total
        page.once("dialog", lambda d: d.accept("Blank one"))
        page.locator("[data-new-template]").click()
        page.wait_for_url("**/editor.html?tpl=*")
        page.goto(prefix + "/app/dashboard.html")
        page.locator("[data-section=templates]").click()
        eq(page.locator("[data-template]:visible").count(), 2, "новый шаблон:")
        page.locator("[data-template]:visible .project-card__link").first.click()
        page.wait_for_url("**/editor.html?my=*")
        page.wait_for_timeout(500)
        yes(code().startswith("diagram "), "шаблон не открылся как начало диаграммы")
        page.goto(prefix + "/app/dashboard.html")
        page.locator("[data-section=templates]").click()
        for left in (1, 0):
            page.once("dialog", lambda d: d.accept())
            card = page.locator("[data-template]:visible").first
            card.locator(".project-card__menu").click()
            card.locator('[data-act="remove-template"]').click()
            page.wait_for_timeout(200)
            eq(page.locator("[data-template]:visible").count(), left, "удаление шаблона:")
        page.locator("[data-section=mine]").click()
        item = page.locator("[data-project]:visible").first
        page.once("dialog", lambda d: d.accept())
        item.locator(".project-card__menu").click()
        item.locator('[data-act="remove"]').click()
        page.locator("[data-section=trash]").click()
        yes(page.locator("[data-trashed]:visible").count() >= 1, "корзина пуста после удаления")
        page.once("dialog", lambda d: d.accept())
        page.locator("[data-trashed]:visible .project-card__menu").first.click()
        page.locator("[data-act=purge]:visible").first.click()

    check(f"AUTH-{tag}-13", f"[{tag}] CRUDL: шаблон создаётся, читается, переименовывается, правится, удаляется; проект уходит в корзину и удаляется навсегда", templates_crudl)
    try:
        b.close()
    except Exception:  # noqa: BLE001
        pass


import os
import subprocess

VARIANTS = {
    "ru": ("", "ru", {"width": 1366, "height": 800}),
    "en": ("/en", "en", {"width": 1366, "height": 800}),
    "phone": ("", "ru", {"width": 375, "height": 812}),
}
wanted = os.environ.get("AUTH_VARIANTS")

if wanted is None:
    # Every variant runs in its own process with a clean browser, then the parts are merged.
    merged = {"results": [], "console_errors": []}
    for tag in VARIANTS:
        try:
            subprocess.run([sys.executable, __file__, base], env={**os.environ, "AUTH_VARIANTS": tag}, timeout=300, check=False)
        except subprocess.TimeoutExpired:
            merged["results"].append({"id": f"AUTH-{tag}-00", "kind": "auth", "title": f"[{tag}] Сценарий завершился", "status": "Failed", "note": "тайм-аут 300 с"})
        part = out / f"auth-e2e.{tag}.json"
        if part.exists():
            data = json.loads(part.read_text(encoding="utf8"))
            merged["results"] += data["results"]
            merged["console_errors"] += data["console_errors"]
            part.unlink()
    (out / "auth-e2e.json").write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf8")
    failed = [r for r in merged["results"] if r["status"] == "Failed"]
    print({"total": len(merged["results"]), "passed": len(merged["results"]) - len(failed), "failed": len(failed)})
    sys.exit(1 if failed else 0)

with sync_playwright() as p:
    for tag in wanted.split(","):
        run_variant(p, tag, *VARIANTS[tag])

check("AUTH-99", "За весь путь в консоли нет ошибок", lambda: eq([e for e in errors if "favicon" not in e.lower()], []))

part = out / f"auth-e2e.{wanted}.json"
json.dump({"results": results, "console_errors": errors}, open(part, "w", encoding="utf8"), ensure_ascii=False, indent=2)
failed = [r for r in results if r["status"] == "Failed"]
for r in failed:
    print(r["id"], "Failed", r["title"], "|", r["note"])
print({"total": len(results), "passed": len(results) - len(failed), "failed": len(failed)})
sys.exit(1 if failed else 0)
