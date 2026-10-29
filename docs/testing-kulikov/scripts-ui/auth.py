from lib import *
PW = "test-phrase-2026"


def reg(pg, name, email, pw=PW, conf=None):
    pg.goto(BASE + "/app/register.html"); pg.wait_for_timeout(300)
    if "register" not in pg.url:
        pg.evaluate("localStorage.removeItem('dslkit.session')"); pg.goto(BASE + "/app/register.html")
    pg.fill("#name", name); pg.fill("#email", email); pg.fill("#password", pw); pg.fill("#confirm", pw if conf is None else conf)
    pg.click("#auth-form [type=submit]"); pg.wait_for_timeout(900)


def login(pg, email, pw=PW):
    pg.goto(BASE + "/app/login.html"); pg.wait_for_timeout(300)
    if "login" not in pg.url:
        pg.evaluate("localStorage.removeItem('dslkit.session')"); pg.goto(BASE + "/app/login.html")
    pg.fill("#email", email); pg.fill("#password", pw)
    pg.click("#auth-form [type=submit]"); pg.wait_for_timeout(900)


def logout(pg):
    if pg.locator("[data-auth-logout]:visible").count():
        pg.locator("[data-auth-logout]:visible").first.click(); pg.wait_for_timeout(500)
    else:
        pg.evaluate("localStorage.removeItem('dslkit.session')")


with sync_playwright() as p:
    t = T("auth"); t.start(p); C = t.check

    def a01():
        pg = t.pg; pg.goto(BASE + "/app/dashboard.html"); pg.wait_for_timeout(600); yes(pg.url.endswith("login.html"), pg.url)
    C("AUTH-01", "«Мои проекты» без входа: редирект на страницу входа", a01)

    def a02():
        pg = t.pg
        pg.goto(BASE + "/en/app/dashboard.html"); pg.wait_for_timeout(600); yes("login.html" in pg.url and "/en/" in pg.url, pg.url)
    C("AUTH-02", "Английские «My projects» без входа: редирект на английский вход", a02)

    def a03():
        pg = t.pg; pg.goto(BASE + "/app/login.html"); pg.click("#auth-form [type=submit]"); pg.wait_for_timeout(300)
        yes(pg.locator("#email-error").is_visible() and pg.locator("#password-error").is_visible(), "нет ошибок на пустой форме")
    C("AUTH-03", "Вход с пустыми полями: ошибки у обоих полей", a03)

    def a04():
        pg = t.pg; login(pg, "nobody@example.com"); yes("login" in pg.url, pg.url); yes(pg.locator("#auth-error").is_visible(), "нет общей ошибки")
        return pg.inner_text("#auth-error")
    C("AUTH-04", "Вход с несуществующим адресом: остаётся на форме, общая ошибка", a04)

    def a05():
        pg = t.pg; reg(pg, "A" * 5000, "long@example.com")
        n = pg.evaluate("JSON.parse(localStorage.getItem('dslkit.accounts')||'[]').map(a=>a.name.length)")
        return f"после регистрации: {pg.url.split('5391')[1]}; длина сохранённого имени {n} (поле обрезает до 60)"
    C("AUTH-05", "Регистрация с именем из 5000 символов (поле имеет maxlength=60)", a05)

    def a06():
        pg = t.pg; pg.goto(BASE + "/app/dashboard.html"); pg.wait_for_timeout(700)
        w = pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth")
        nm = pg.evaluate("(()=>{const e=document.querySelector('.auth__name:not([hidden])');if(!e)return null;const r=e.getBoundingClientRect();return [Math.round(r.width),Math.round(r.right)]})()")
        yes(w <= 0 and (nm is None or nm[1] <= 1366), f"горизонтальная прокрутка {w}px, имя {nm}")
        return f"ширина имени {nm}, прокрутка {w}"
    C("AUTH-06", "Имя из 5000 символов в шапке не ломает вёрстку", a06, shot=True)
    t.new_ctx()

    def a07():
        pg = t.pg; pg.once("dialog", lambda d: d.dismiss())
        reg(pg, '<img src=x onerror="window.__xss=1">', "html@example.com")
        if "register" in pg.url and pg.locator("#name-error").is_visible():
            return "имя с тегом отклонено валидацией: " + pg.inner_text("#name-error")[:70]
        yes(pg.evaluate("window.__xss") != 1, "XSS выполнился")
    C("AUTH-07", "Регистрация с именем-HTML (img onerror): отклоняется или экранируется", a07, shot=True)

    def a07b():
        pg = t.pg; reg(pg, "Ксения", "craft@example.com")
        pg.evaluate("""()=>{const a=JSON.parse(localStorage.getItem('dslkit.accounts'));a.forEach(x=>x.name='<img src=x onerror="window.__xss=1"><b>жирный</b>');localStorage.setItem('dslkit.accounts',JSON.stringify(a));}""")
        for u in ["/index.html", "/app/dashboard.html", "/en/app/dashboard.html", "/app/settings.html"]:
            pg.goto(BASE + u); pg.wait_for_timeout(600)
            yes(pg.evaluate("window.__xss") != 1, "XSS выполнился на " + u)
            yes(pg.locator(".auth__name img, .auth__name b").count() == 0, "имя стало разметкой на " + u)
    C("AUTH-07b", "Имя-HTML, подставленное в хранилище напрямую: экранируется на главной, в приложении, в настройках", a07b, shot=True)
    t.new_ctx()

    def a08():
        pg = t.pg; reg(pg, "Ксения 漢字 مرحبا", "uni@example.com")
        yes("welcome" in pg.url or "dashboard" in pg.url, pg.url)
        pg.goto(BASE + "/app/dashboard.html"); pg.wait_for_timeout(500)
        return pg.locator(".auth__name:visible").first.inner_text()
    C("AUTH-08", "Регистрация с юникодным именем (кириллица, иероглифы, арабский)", a08, shot=True)

    def a08b():
        pg = t.pg; reg(pg, "Ёжик 🦔", "emoji@example.com"); yes("register" in pg.url, "имя с эмодзи принято: " + pg.url)
        yes(pg.locator("#name-error").is_visible(), "нет сообщения об ошибке имени")
        reg(pg, "J. R. Smith", "dots@example.com"); return "имя с точкой («J. R. Smith»): " + ("отклонено" if "register" in pg.url else "принято")
    C("AUTH-08b", "Имя с эмодзи отклоняется с сообщением; имя с точкой (инициалы)", a08b)

    def a09():
        pg = t.pg; logout(pg); reg(pg, "   ", "space@example.com"); yes("register" in pg.url, "имя из пробелов принято: " + pg.url)
    C("AUTH-09", "Имя из одних пробелов отклоняется", a09)

    def a10():
        pg = t.pg; reg(pg, "Дубль", "UNI@Example.com"); yes("register" in pg.url, "дубль адреса в другом регистре принят: " + pg.url)
        return pg.inner_text("#auth-error")[:80] if pg.locator("#auth-error").is_visible() else "нет текста ошибки"
    C("AUTH-10", "Повторная регистрация того же адреса в другом регистре", a10)

    def a11():
        pg = t.pg
        for bad in ["a@b", "a b@example.com", "@example.com", "a@@b.com", "<script>@x.com"]:
            reg(pg, "Имя", bad); yes("register" in pg.url, f"адрес {bad!r} принят: {pg.url}")
    C("AUTH-11", "Некорректные адреса (a@b, с пробелом, без локальной части, двойная @, тег) отклоняются", a11)

    def a12():
        pg = t.pg; reg(pg, "Пароль", "pw1@example.com", "  пароль 密码 🔑 1234  "); yes("register" not in pg.url, pg.url)
        pg.goto(BASE + "/app/dashboard.html"); logout(pg); login(pg, "pw1@example.com", "  пароль 密码 🔑 1234  "); yes("login" not in pg.url, "вход по юникодному паролю не удался " + pg.url)
    C("AUTH-12", "Пароль с пробелами по краям, юникодом и эмодзи: регистрация и вход", a12)

    def a13():
        pg = t.pg; pg.goto(BASE + "/app/dashboard.html"); logout(pg); reg(pg, "Длинный", "bigpw@example.com", "x" * 20000); r = pg.url
        n = pg.evaluate("document.getElementById('password')?.maxLength"); return "20000-символьный пароль: " + ("принят" if "register" not in r else "отклонён") + "; на странице maxlength пароля 128, остальное обрезается молча"
    C("AUTH-13", "Пароль из 20000 символов: нет зависания и ошибок", a13)

    def a14():
        pg = t.pg; pg.goto(BASE + "/app/dashboard.html"); logout(pg); login(pg, "  UNI@example.COM  ", PW); yes("login" not in pg.url, "вход с адресом в другом регистре и пробелами не прошёл: " + pg.url)
    C("AUTH-14", "Вход с адресом в другом регистре и с пробелами по краям", a14)

    def a15():
        pg = t.pg; pg.goto(BASE + "/app/dashboard.html"); logout(pg); login(pg, "uni@example.com", "wrong-pass"); yes("login" in pg.url, pg.url); yes(pg.locator("#auth-error").is_visible(), "нет ошибки")
        a = pg.inner_text("#auth-error")
        login(pg, "nobody@example.com", "wrong-pass"); b = pg.inner_text("#auth-error"); eq(a, b, "сообщения различаются (утечка существования аккаунта):")
    C("AUTH-15", "Неверный пароль и неизвестный адрес дают одинаковое сообщение", a15)

    def a16():
        pg = t.pg; logout(pg); pg.goto(BASE + "/app/login.html"); pg.fill("#email", "uni@example.com"); pg.fill("#password", PW)
        for _ in range(5):
            try: pg.keyboard.press("Enter")
            except Exception: break
        pg.wait_for_timeout(1500); s = pg.evaluate("JSON.parse(localStorage.getItem('dslkit.session')||'null')"); yes(s is not None, "сессии нет")
    C("AUTH-16", "Быстрые повторные Enter при входе: один вход, без ошибок", a16)

    def a17():
        pg = t.pg; pg.goto(BASE + "/app/dashboard.html"); pg.wait_for_timeout(500); logout(pg); pg.wait_for_timeout(500)
        pg.goto(BASE + "/app/dashboard.html"); pg.wait_for_timeout(500); yes("login" in pg.url, "после выхода открылась dashboard: " + pg.url)
        pg.go_back(); pg.wait_for_timeout(700)
        n = pg.locator("[data-project]:visible").count()
        yes("login" in pg.url or n == 0, "кнопка «назад» показала проекты после выхода: " + pg.url + " карточек " + str(n))
        return "после «назад»: " + pg.url.split("5391")[1]
    C("AUTH-17", "Выход, затем кнопка «назад»: чужие проекты не показываются", a17, shot=True)

    def a17b():
        pg = t.pg; login(pg, "uni@example.com"); pg.goto(BASE + "/app/dashboard.html"); pg.wait_for_timeout(500)
        logout(pg); pg.wait_for_timeout(600)
        # теперь «назад» должно вести не к закрытой странице
        pg.go_back(); pg.wait_for_timeout(800)
        n = pg.locator("[data-project]:visible").count()
        yes(n == 0, f"после выхода и «назад» видно проектов: {n} на {pg.url}")
    C("AUTH-17b", "Вошёл, открыл «Мои проекты», вышел, «назад» (страница из кэша переходов)", a17b, shot=True)

    def a18():
        pg = t.pg; login(pg, "uni@example.com"); pg.goto(BASE + "/app/dashboard.html"); pg.wait_for_timeout(500)
        pg2 = t.page(); pg2.goto(BASE + "/app/dashboard.html"); pg2.wait_for_timeout(500)
        logout(pg); pg2.wait_for_timeout(1200)
        before = pg2.url
        pg2.reload(); pg2.wait_for_timeout(600)
        yes("login" in pg2.url, "вторая вкладка осталась в приложении после перезагрузки")
        yes("login" in before, "вторая вкладка не отреагировала на выход в первой без перезагрузки (остаётся: " + before.split('5391')[1] + ")")
        pg2.close()
    C("AUTH-18", "Две вкладки: выход в первой, вторая должна выйти сама (событие storage)", a18)

    def a20():
        pg = t.pg
        pg.evaluate("localStorage.setItem('dslkit.accounts','{{garbage')"); pg.goto(BASE + "/app/login.html"); pg.wait_for_timeout(500)
        login(pg, "uni@example.com"); yes("login" in pg.url, "остались на входе")
        reg(pg, "После порчи", "after@example.com"); yes("register" not in pg.url, "регистрация после порчи хранилища: " + pg.url)
    C("AUTH-20", "Повреждённый список аккаунтов: вход отказывает, регистрация работает", a20)

    def a21():
        pg = t.pg
        for v in ["JSON.stringify({userId:{a:1}})", "'[[['", "JSON.stringify({userId:'u-fake'})"]:
            pg.evaluate(f"localStorage.setItem('dslkit.session',{v})"); pg.goto(BASE + "/app/dashboard.html"); pg.wait_for_timeout(600); yes("login" in pg.url, v + " -> " + pg.url)
    C("AUTH-21", "Подделанная или повреждённая сессия: считается гостем", a21)

    def a22():
        pg = t.pg; pg.evaluate("localStorage.clear()"); pg.goto(BASE + "/app/dashboard.html"); pg.wait_for_timeout(500); yes("login" in pg.url, pg.url)
        pg.goto(BASE + "/index.html"); pg.wait_for_timeout(500)
    C("AUTH-22", "Полностью очищенное хранилище: гость, без ошибок", a22)

    def a23():
        pg = t.pg; reg(pg, "Тест", "redir@example.com"); pg.goto(BASE + "/app/dashboard.html"); logout(pg)
        pg.goto(BASE + "/app/login.html?next=//evil.example.com&redirect=https://evil.example.com"); pg.wait_for_timeout(300)
        pg.fill("#email", "redir@example.com"); pg.fill("#password", PW); pg.click("#auth-form [type=submit]"); pg.wait_for_timeout(1200)
        yes("evil" not in pg.url, "открытый редирект: " + pg.url)
    C("AUTH-23", "Параметры next/redirect на странице входа не дают открытого редиректа", a23)

    def a24():
        pg = t.pg
        pg.goto(BASE + "/en/app/dashboard.html"); pg.wait_for_timeout(700); yes("login" not in pg.url, "английская версия не видит сессию: " + pg.url)
        yes(pg.locator(".auth__name:visible").count() == 1, "нет имени в английской шапке")
    C("AUTH-24", "Сессия общая для русской и английской версий", a24)

    def a25():
        pg = t.pg; pg.evaluate("localStorage.removeItem('dslkit.session')"); pg.goto(BASE + "/app/login.html"); pg.wait_for_timeout(300)
        pg.focus("#email"); order = ["email"]
        for _ in range(4):
            pg.keyboard.press("Tab"); order.append(pg.evaluate("document.activeElement.id||document.activeElement.tagName+'.'+document.activeElement.className.slice(0,25)"))
        yes(order[1] == "password", str(order)); return " > ".join(order)
    C("AUTH-25", "Вход: Tab проходит поля по порядку, есть фокус на email и password", a25)
    t.save()
    print(len(t.rows), "errors:", t.errors[:5])
