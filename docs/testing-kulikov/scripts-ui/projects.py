import time
from lib import *
PW = "test-phrase-2026"
D = 86400000


def setup(t):
    """Новый профиль, регистрация, вход, dashboard."""
    t.new_ctx()
    pg = t.pg
    pg.goto(BASE + "/app/register.html")
    pg.fill("#name", "Проверка"); pg.fill("#email", f"pr{int(time.time())}@example.com"); pg.fill("#password", PW); pg.fill("#confirm", PW)
    pg.click("#auth-form [type=submit]"); pg.wait_for_url("**/welcome.html", timeout=15000)
    pg.goto(BASE + "/app/dashboard.html"); ready(pg)
    return pg


def uid(pg):
    return pg.evaluate("JSON.parse(localStorage.getItem('dslkit.session')).userId")


def getkey(pg, name):
    return pg.evaluate(f"JSON.parse(localStorage.getItem('dslkit.{name}.{uid(pg)}')||'[]')")


def setkey(pg, name, value):
    import json
    pg.evaluate("([k,v])=>localStorage.setItem(k,v)", [f"dslkit.{name}.{uid(pg)}", value if isinstance(value, str) else json.dumps(value)])


def section(pg, name):
    pg.click(f'[data-section="{name}"]'); pg.wait_for_timeout(250)


def cards(pg):
    return pg.locator(".project-list__item:visible").count()


def titles(pg):
    return pg.locator(".project-list__item:visible .project-card__link").all_inner_texts()


def menu(pg, idx=0):
    m = pg.locator(".project-list__item:visible .project-card__menu").nth(idx)
    if m.get_attribute("aria-expanded") != "true": m.click(); pg.wait_for_timeout(150)


def act(pg, name, idx=0, answer=None, accept=True):
    box = {"msg": None}

    def h(d):
        box["msg"] = d.message
        if d.type == "prompt": d.accept(answer) if (answer is not None and accept) else d.dismiss()
        elif accept: d.accept()
        else: d.dismiss()
    pg.on("dialog", h)
    menu(pg, idx)
    pg.locator(f'.project-list__item:visible [data-act="{name}"]:visible').nth(0).click(); pg.wait_for_timeout(400)
    pg.remove_listener("dialog", h)
    return box["msg"]


def dlg(pg, accept, text=None):
    def h(d):
        pg.remove_listener("dialog", h)
        d.accept(text) if accept and text is not None else (d.accept() if accept else d.dismiss())
    pg.on("dialog", h)


def ready(pg):
    pg.wait_for_function("() => { const c = document.querySelector('#project-count'); return !!c && c.textContent.trim() !== ''; }", timeout=15000); pg.wait_for_timeout(200)


def reload(pg, section_name="mine"):
    pg.goto(BASE + "/app/dashboard.html"); ready(pg)
    if section_name != "mine": section(pg, section_name)


N0=[0]
with sync_playwright() as p:
    t = T("projects"); t.start(p); C = t.check
    pg = setup(t)

    def p01():
        N0[0]=cards(pg); yes(N0[0]>=6, "стартовых диаграмм: %d"%N0[0]); yes(pg.locator("#project-count").inner_text().strip() != "", "нет счётчика")
        return f"стартовых диаграмм: {N0[0]} ({pg.locator('#project-count').inner_text()}); по плану 6"
    C("PRJ-01", "Новый пользователь: «Мои проекты» показывает 6 стартовых диаграмм и счётчик", p01, shot=True)

    def p02():
        pg.goto(BASE + "/app/editor.html?template=bpmn"); pg.wait_for_timeout(700); pg.click('[data-action="save"]'); pg.wait_for_timeout(400)
        reload(pg); eq(cards(pg), N0[0]+1, "после сохранения:")
        pg.goto(BASE + "/app/editor.html?template=bpmn"); pg.wait_for_timeout(700)
        for _ in range(3): pg.click('[data-action="save"]'); pg.wait_for_timeout(250)
        reload(pg); eq(cards(pg), N0[0]+2, "после трёх сохранений второго новой диаграммы (должно быть одним проектом):")
    C("PRJ-02", "Create: сохранение новой диаграммы создаёт один проект, повторные сохранения не плодят копии", p02)

    def p03():
        ids = []
        for name, label in [("Новое имя", "обычное"), ("<b>x</b><img src=x onerror=window.__x=1>", "HTML"), ("Ё" * 600, "600 символов"), ("🦔 漢字 مرحبا", "юникод")]:
            act(pg, "rename", 0, answer=name)
            yes(titles(pg)[0].strip() != "", f"пустой заголовок после {label}")
        reload(pg)
        yes(pg.evaluate("window.__x") != 1, "XSS в названии")
        yes(pg.locator(".project-card__link img, .project-card__link b").count() == 0, "HTML в названии стал разметкой")
    C("PRJ-03", "Update: переименование в обычное, HTML, 600 символов и юникод; HTML не исполняется", p03, shot=True)

    def p04():
        before = titles(pg)[0]
        for ans in ["", "   "]:
            act(pg, "rename", 0, answer=ans); eq(titles(pg)[0], before, f"название после {ans!r}:")
        act(pg, "rename", 0, answer=None, accept=False); eq(titles(pg)[0], before, "после отмены:")
    C("PRJ-04", "Переименование пустым, из пробелов и отмена: название не меняется", p04)

    def p05():
        n = cards(pg)
        msg = act(pg, "remove", 0, accept=False); eq(cards(pg), n, "отмена удаления уменьшила список:")
        act(pg, "remove", 0, accept=True); eq(cards(pg), n - 1, "после удаления:")
        section(pg, "trash"); eq(cards(pg), 1, "в корзине:")
        return "подтверждение: " + (msg or "")
    C("PRJ-05", "Delete: отмена подтверждения сохраняет проект, подтверждение переносит в корзину", p05, shot=True)

    def p06():
        act(pg, "restore", 0); eq(cards(pg), 0, "корзина после восстановления:")
        section(pg, "mine"); eq(cards(pg), N0[0]+2, "проекты после восстановления:")
    C("PRJ-06", "Корзина: восстановление возвращает проект", p06)

    def p07():
        section(pg, "mine"); act(pg, "remove", 0); act(pg, "remove", 0); section(pg, "trash"); eq(cards(pg), 2, "в корзине:")
        yes(pg.locator("button:visible", has_text="Очистить").count() >= 1, "нет кнопки очистки корзины")
        dlg(pg,False); pg.locator("button:visible", has_text="Очистить").first.click(); pg.wait_for_timeout(400); eq(cards(pg), 2, "отмена очистки:")
        dlg(pg,True); pg.locator("button:visible", has_text="Очистить").first.click(); pg.wait_for_timeout(400); eq(cards(pg), 0, "после очистки:")
        yes(pg.locator("button:visible", has_text="Очистить").count() == 0, "кнопка очистки осталась на пустой корзине")
    C("PRJ-07", "Корзина: очистка с отменой и с подтверждением, кнопка исчезает на пустой корзине", p07)

    def p08():
        section(pg, "mine"); act(pg, "remove", 0); act(pg, "remove", 0); act(pg, "remove", 0); act(pg, "remove", 0)
        data = getkey(pg, "projects"); tr = [x for x in data if "trashedAt" in x]; yes(len(tr) == 4, f"в корзине {len(tr)}")
        now = pg.evaluate("Date.now()")
        tr[0]["trashedAt"] = now - 29 * D - 3600000 * 23
        tr[1]["trashedAt"] = now - 30 * D - 1000
        tr[2]["trashedAt"] = now - 31 * D
        tr[3]["trashedAt"] = now + 5 * D
        setkey(pg, "projects", data); reload(pg, "trash")
        n = cards(pg); stamps = pg.locator(".project-list__item:visible .project-card__updated").all_inner_texts()
        eq(n, 2, "в корзине после подмены времени (29 дн. и «из будущего» должны остаться; 30 и 31 дн. исчезнуть):")
        left = [x["id"] for x in getkey(pg, "projects") if "trashedAt" in x]
        return "подписи: " + " | ".join(s[:50] for s in stamps) + f"; в хранилище осталось {len(left)}"
    C("PRJ-08", "Корзина 30 дней: 29 дн. остаётся, 30 и 31 дн. удаляются, дата из будущего", p08, shot=True)

    def p10():
        reload(pg); sd = pg.evaluate("document.querySelector('[data-section=trash]').textContent")
        pg.goto(BASE + "/app/editor.html"); pg.wait_for_timeout(500)
        tr = [x for x in getkey(pg, "projects") if "trashedAt" in x]
        if not tr: return "нет проекта в корзине для проверки"
        pg.goto(BASE + f"/app/editor.html?p={tr[0]['id']}"); pg.wait_for_timeout(800)
        code = pg.evaluate("document.querySelector('.code__input').value.slice(0,60)")
        return "проект из корзины по ссылке открылся с кодом: " + code.replace("\n", " ")[:60]
    C("PRJ-10", "Проект из корзины по прямой ссылке ?p=id: поведение редактора", p10)

    def p11():
        reload(pg); n0 = cards(pg)
        for i in range(8):
            pg.goto(BASE + "/app/editor.html?template=erd"); pg.wait_for_timeout(300)
            pg.click('[data-action="save"]')
            pg.goto(BASE + "/app/editor.html?template=dag"); pg.wait_for_timeout(300)
        reload(pg); n1 = cards(pg)
        q = pg.locator("#quota-text").inner_text()
        return f"было {n0}, стало {n1} (создано сегодня 8, лимит беты 5); квота: {q}"
    C("PRJ-11", "Квота беты 5 диаграмм в день: что происходит при 8 новых проектах за день", p11, shot=True)

    def p12():
        pg.fill("#app-search", "[")
        pg.wait_for_timeout(300); n1 = cards(pg)
        for q in ["<script>", "(", "\\", "'\"", ".*", "ё" * 300]:
            pg.fill("#app-search", q); pg.wait_for_timeout(150)
        txt = pg.locator("#project-count").inner_text()
        pg.fill("#app-search", "")
        return "спецсимволы поиска без ошибок; пустой результат: " + txt
    C("PRJ-12", "Поиск: спецсимволы регулярных выражений, HTML, 300 символов — без ошибок", p12)

    def p13():
        pg.fill("#app-search", "zzzz-нет"); pg.wait_for_timeout(200)
        eq(cards(pg), 0, "найдено:"); yes("не найдено" in pg.locator("#project-count").inner_text().lower() or "нет" in pg.locator("#project-count").inner_text().lower(), "нет сообщения: " + pg.locator("#project-count").inner_text())
        pg.fill("#app-search", "")
    C("PRJ-13", "Поиск без результатов: сообщение о пустом списке", p13)

    def p14():
        pg.select_option("#project-sort", "name"); pg.wait_for_timeout(200); a = titles(pg)
        pg.select_option("#project-sort", "oldest"); pg.wait_for_timeout(200); b = titles(pg)
        pg.select_option("#project-sort", "newest") if pg.locator('#project-sort option[value=newest]').count() else None
        yes(a != b, "сортировки дают одинаковый порядок")
        pg.reload(); pg.wait_for_timeout(500)
        yes(pg.locator("#project-sort").input_value() in ("name", "oldest", "newest", "recent", "updated"), "значение сортировки: " + pg.locator("#project-sort").input_value())
    C("PRJ-14", "Сортировка по имени/старым и её запоминание после перезагрузки", p14)

    def p15():
        pg.click('[data-filter="bpmn"]'); pg.wait_for_timeout(200); n = cards(pg)
        pg.fill("#app-search", "bpmn"); pg.wait_for_timeout(200)
        section(pg, "templates"); section(pg, "shared"); section(pg, "mine")
        pg.click('[data-filter="all"]'); pg.fill("#app-search", "")
        return f"фильтр BPMN: {n} карточек"
    C("PRJ-15", "Фильтр по нотации + поиск + переключение разделов без ошибок", p15)

    # --- shared
    def s01():
        section(pg, "shared"); n = cards(pg); yes(n >= 33, f"общих примеров {n}, нотаций 33")
        return f"общих примеров: {n}"
    C("SHR-01", "«Общие»: по одному примеру на каждую из 33 нотаций", s01, shot=True)

    def s02():
        reload(pg); n0 = len(getkey(pg, "projects")); section(pg, "shared")
        act(pg, "copy", 0); act(pg, "copy", 0); act(pg, "copy", 0)
        n1 = len(getkey(pg, "projects")); eq(n1 - n0, 3, "копий в проекты:")
        reload(pg); return f"3 копирования → +{n1-n0}; квота: " + pg.locator("#quota-text").inner_text()
    C("SHR-02", "«Общие»: копировать в проекты (3 раза подряд), появляются копии", s02)

    def s03():
        reload(pg); section(pg, "shared"); n0 = len(getkey(pg, "projects")); lk = pg.locator('.project-list__item:visible [data-act="like"]').first
        menu(pg, 0); lk = pg.locator('.project-list__item:visible [data-act="like"]:visible').first
        lk.click(); pg.wait_for_timeout(250); a = lk.get_attribute("aria-pressed"); n1 = len(getkey(pg, "projects"))
        lk.click(); pg.wait_for_timeout(250); b = lk.get_attribute("aria-pressed"); n2 = len(getkey(pg, "projects"))
        lk.click(); pg.wait_for_timeout(250); n3 = len(getkey(pg, "projects"))
        yes(a == "true" and b == "false", f"aria-pressed {a},{b}")
        yes(n2 == n0 or n1 == n0, f"лайк создаёт проект: {n0}->{n1}->{n2}->{n3}")
        return f"проектов при лайках: {n0}->{n1}->{n2}->{n3}"
    C("SHR-03", "Лайк: включение/выключение; лайк не должен создавать копии проекта", s03)

    def s04():
        reload(pg); section(pg, "shared"); n0 = len(getkey(pg, "templates")); act(pg, "copy-template", 1); n1 = len(getkey(pg, "templates"))
        eq(n1 - n0, 1, "шаблонов добавилось:"); section(pg, "templates"); yes(cards(pg) >= 1, "нет карточки в «Мои шаблоны»")
    C("SHR-04", "«Общие»: копировать в шаблоны, шаблон виден в «Мои шаблоны»", s04, shot=True)

    # --- templates
    def tp1():
        reload(pg, "templates"); n0 = cards(pg)
        dlg(pg,True,"Мой шаблон <i>1</i>"); pg.click("[data-new-template]"); pg.wait_for_timeout(900)
        yes("tpl=" in pg.url, "редактор шаблона не открылся: " + pg.url)
        reload(pg, "templates"); eq(cards(pg), n0 + 1, "шаблонов:")
        yes(pg.locator(".project-card__link i").count() == 0, "HTML в названии шаблона стал разметкой")
    C("TPL-01", "Create шаблона через «Новый шаблон» с HTML в названии", tp1, shot=True)

    def tp2():
        act(pg, "rename", 0, answer="Переименован"); yes("Переименован" in titles(pg)[0], titles(pg)[0])
        act(pg, "rename", 0, answer=""); yes("Переименован" in titles(pg)[0], "пустое имя изменило название")
        n = cards(pg); act(pg, "remove-template", 0, accept=False); eq(cards(pg), n, "отмена удаления:")
        act(pg, "remove-template", 0); eq(cards(pg), n - 1, "после удаления:")
    C("TPL-02", "Шаблон: переименование, пустое имя, отмена и подтверждение удаления", tp2)

    def tp3():
        reload(pg, "templates"); yes(cards(pg) >= 1, "нет шаблонов")
        act(pg, "edit", 0); pg.wait_for_timeout(800); yes("tpl=" in pg.url, pg.url)
        pg.fill(".code__input", 'diagram bpmn "Изменён"\nstart s "Старт"'); pg.wait_for_timeout(600); pg.click('[data-action="save"]'); pg.wait_for_timeout(500)
        reload(pg, "templates"); yes(any("Изменён" in x for x in titles(pg)), "правка шаблона не сохранилась: " + str(titles(pg)))
    C("TPL-03", "Шаблон: открыть на правку, изменить код, сохранить", tp3)

    def tp4():
        reload(pg); n0 = len(getkey(pg, "templates")); act(pg, "template", 0); eq(len(getkey(pg, "templates")) - n0, 1, "«Сохранить как шаблон» из проекта:")
    C("TPL-04", "Проект → «Сохранить как шаблон»", tp4)

    def tp5():
        pg.goto(BASE + "/app/editor.html?tpl=nonexistent"); pg.wait_for_timeout(700)
        pg.goto(BASE + "/app/editor.html?p=nonexistent"); pg.wait_for_timeout(700)
        pg.goto(BASE + "/app/editor.html?my=%3Cscript%3E&template=nope"); pg.wait_for_timeout(700)
        return "несуществующие id открываются без ошибок в консоли"
    C("TPL-05", "Несуществующие ?tpl=, ?p=, ?my=, ?template= в адресе редактора", tp5, shot=True)

    # --- corrupted data
    def c01():
        pg.goto(BASE + "/app/dashboard.html")
        for v in ["{{garbage", "{\"a\":1}", "[1,2,null,{}]", '[{"id":"x","title":5,"source":"a","updated":1}]',
                  '[{"id":"x","title":"Без нотации","source":"a","updated":1}]',
                  '[{"id":"y","title":"Неизв","notation":"zzz","source":"diagram zzz","updated":1}]',
                  '[{"id":"z","title":"Бесконечность","notation":"bpmn","source":"x","updated":1e999}]']:
            setkey(pg, "projects", v); reload(pg); pg.wait_for_timeout(300)
        return "после каждого значения страница открывается"
    C("COR-01", "Повреждённый список проектов (мусор, объект, null, неверные типы, неизвестная нотация)", c01, shot=True)

    def c02():
        setkey(pg, "projects", '[{"id":"y","title":"Неизв","notation":"zzz","source":"diagram zzz","updated":1}]'); reload(pg)
        yes(cards(pg) == 1, "карточка проекта с неизвестной нотацией не показана: " + str(cards(pg)))
        pg.locator(".project-card__link:visible").first.click(); pg.wait_for_timeout(900)
        return "открытие проекта с неизвестной нотацией: " + pg.url.split("5391")[1]
    C("COR-02", "Проект с неизвестной нотацией: карточка и открытие", c02, shot=True)

    def c03():
        pg.evaluate("localStorage.removeItem('dslkit.dashboard')"); pg.evaluate("localStorage.setItem('dslkit.dashboard','not json')"); reload(pg)
        pg.evaluate("localStorage.setItem('dslkit.dashboard',JSON.stringify({sort:'zzz',filter:'zzz',query:5}))"); reload(pg)
    C("COR-03", "Повреждённое состояние dashboard (фильтр, сортировка, запрос)", c03)

    def c04():
        pg.evaluate("localStorage.clear()"); pg.goto(BASE + "/app/dashboard.html"); pg.wait_for_timeout(500)
        yes("login" in pg.url, pg.url)
    C("COR-04", "Очистка localStorage при открытом приложении: следующая загрузка ведёт на вход", c04)

    def q01():
        pg = setup(t)
        pg.evaluate("""()=>{const k='dslkit.projects.'+JSON.parse(localStorage.getItem('dslkit.session')).userId;
          const a=[];for(let i=0;i<250;i++)a.push({id:'p'+i,title:'Проект '+i,notation:'bpmn',source:'diagram bpmn "x"',created:Date.now()-i,updated:Date.now()-i});localStorage.setItem(k,JSON.stringify(a));}""")
        t0 = time.time(); reload(pg); dt = time.time() - t0
        return f"250 проектов: карточек {cards(pg)}, загрузка {dt:.1f} с, счётчик: {pg.locator('#project-count').inner_text()}"
    C("PRJ-16", "250 проектов (больше лимита 200): список, счётчик, время загрузки", q01, shot=True)

    def q02():
        pg = t.pg
        big = "x" * 4_000_000
        r = pg.evaluate("(s)=>{try{localStorage.setItem('dslkit.big',s);localStorage.setItem('dslkit.big2',s);localStorage.setItem('dslkit.big3',s);return 'ok'}catch(e){return e.name}}", big)
        pg.goto(BASE + "/app/editor.html?template=erd"); pg.wait_for_timeout(700)
        pg.click('[data-action="save"]'); pg.wait_for_timeout(500)
        note = pg.locator(".editor-statusbar, [role=status]").all_inner_texts()
        pg.evaluate("['dslkit.big','dslkit.big2','dslkit.big3'].forEach(k=>localStorage.removeItem(k))")
        return f"переполнение хранилища ({r}); сообщения: " + " | ".join(x.strip()[:60] for x in note if x.strip())[:200]
    C("COR-05", "Переполнение localStorage при сохранении: сообщение пользователю", q02, shot=True)
    pg = setup(t)
    def p09():
        data = getkey(pg, "projects")
        for x in data[:1]: x["trashedAt"] = "вчера"
        setkey(pg, "projects", data); pg.goto(BASE + "/app/dashboard.html"); pg.wait_for_timeout(2500)
        n = cards(pg); yes(pg.locator("#project-count").inner_text().strip() != "", "dashboard не инициализировался: счётчик пуст, карточек %d" % n)
        section(pg, "trash"); n = cards(pg)
        st = pg.locator(".project-list__item:visible .project-card__updated").all_inner_texts()
        yes(not any("NaN" in s or "undefined" in s or "Invalid" in s for s in st), "в подписях: " + " | ".join(st))
        return f"карточек {n}; подписи: " + " | ".join(s[:60] for s in st)
    C("PRJ-09", "Корзина: trashedAt строкой — нет NaN и undefined в подписи", p09)

    t.save()
    print(len(t.rows), "errors:", t.errors[:8])
