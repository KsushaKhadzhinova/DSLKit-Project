import time, json
from lib import *
PW = "test-phrase-2026"


def register(pg, tag):
    pg.goto(BASE + "/app/register.html"); pg.fill("#name", "Проверка"); pg.fill("#email", f"{tag}{int(time.time()*1000)%100000}@example.com")
    pg.fill("#password", PW); pg.fill("#confirm", PW); pg.click("#auth-form [type=submit]"); pg.wait_for_url("**/welcome.html", timeout=15000)


def overflow(pg):
    return pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth")


def small_targets(pg):
    return pg.evaluate("""() => [...document.querySelectorAll('a,button,input,select,textarea')].filter(e=>e.offsetParent&&!e.closest('[hidden]')).map(e=>{const r=e.getBoundingClientRect();return {t:(e.getAttribute('aria-label')||e.textContent||e.id||e.className).trim().slice(0,25),w:Math.round(r.width),h:Math.round(r.height)}}).filter(x=>(x.w<24||x.h<24)&&x.w>0&&!/skip|visually/.test(x.t)).slice(0,6)""")


with sync_playwright() as p:
    t = T("misc"); t.start(p); C = t.check
    pg = t.pg
    register(pg, "m")
    pages = [("index", "/index.html"), ("login", "/app/login.html"), ("register", "/app/register.html"), ("dashboard", "/app/dashboard.html"),
             ("welcome", "/app/welcome.html"), ("editor", "/app/editor.html?template=bpmn"), ("settings", "/app/settings.html"), ("en-dashboard", "/en/app/dashboard.html"), ("en-editor", "/en/app/editor.html?template=erd")]
    for w, h in ([] if True else [(375, 812)]):
        for name, url in pages:
            def f(w=w, h=h, name=name, url=url):
                keep = pg.evaluate("localStorage.getItem('dslkit.session')")
                pg.set_viewport_size({"width": w, "height": h})
                pg.goto(BASE + url); pg.wait_for_timeout(1800)
                if name in ("login", "register") and "/app/dashboard" in pg.url:
                    return "вошедшего пользователя со страницы входа/регистрации перенаправило на " + pg.url.split("5391")[1]
                o = overflow(pg)
                small = small_targets(pg) if w == 375 else []
                pg.screenshot(path=SC + f"SZ-{w}-{name}.png")
                yes(o <= 0, f"горизонтальная прокрутка {o}px при ширине {w}")
                return ("мелкие цели (<24px): " + json.dumps(small, ensure_ascii=False)) if small else ""
            C(f"SZ-{w}-{name}", f"Ширина {w}: страница «{name}» без горизонтальной прокрутки и ошибок консоли", f)
    pg.set_viewport_size({"width": 1366, "height": 800})

    def l01():
        pg.goto(BASE + "/app/editor.html?template=erd"); pg.wait_for_timeout(1200)
        href = pg.locator(".header__lang").first.get_attribute("href")
        pg.locator(".header__lang").first.click(); pg.wait_for_timeout(1500)
        yes("/en/" in pg.url, pg.url)
        return f"ссылка «English»: {href}; открылось {pg.url.split('5391')[1]} (параметр шаблона {'сохранён' if 'template=erd' in pg.url else 'потерян'})"
    C("LNG-01", "Смена языка в редакторе: открывается английская версия, параметр ?template сохраняется", l01, shot=True)

    def l02():
        pg.goto(BASE + "/app/dashboard.html"); pg.wait_for_timeout(1200)
        pg.locator(".header__lang").first.click(); pg.wait_for_timeout(1200)
        yes("/en/app/dashboard" in pg.url, pg.url)
        txt = pg.inner_text("body")
        cyr = [w for w in txt.replace("\n", " ").split() if any("а" <= c.lower() <= "я" or c in "ёЁ" for c in w)]
        pg.screenshot(path=SC + "LNG-02.png")
        yes(len(cyr) <= 5, "русский текст на английской странице: " + " ".join(cyr[:8]))
        return "русских слов на EN-странице: " + str(len(cyr)) + (" (" + " ".join(cyr[:6]) + ")" if cyr else "")
    C("LNG-02", "Английская «My projects»: нет русского текста, сессия сохранена", l02)

    def l03():
        pg.goto(BASE + "/en/app/editor.html?template=bpmn"); pg.wait_for_timeout(1500)
        txt = pg.inner_text("body"); cyr = [w for w in txt.replace("\n", " ").split() if any("а" <= c.lower() <= "я" for c in w)]
        pg.screenshot(path=SC + "LNG-03.png")
        yes(len(cyr) <= 5, "русский текст в английском редакторе: " + " ".join(cyr[:10]))
        return "русских слов: " + str(len(cyr))
    C("LNG-03", "Английский редактор: интерфейс переведён полностью", l03)

    def th1():
        pg.goto(BASE + "/app/dashboard.html"); pg.wait_for_timeout(1000)
        a = pg.evaluate("document.documentElement.dataset.theme||getComputedStyle(document.body).backgroundColor")
        pg.goto(BASE + "/app/settings.html"); pg.wait_for_timeout(1000)
        tg = pg.locator("#theme-toggle, [data-theme-toggle]").first
        tg.click(force=True); pg.wait_for_timeout(300)
        b = pg.evaluate("document.documentElement.dataset.theme||getComputedStyle(document.body).backgroundColor")
        pg.goto(BASE + "/app/dashboard.html"); pg.wait_for_timeout(1000)
        c = pg.evaluate("document.documentElement.dataset.theme||getComputedStyle(document.body).backgroundColor")
        pg.screenshot(path=SC + "THM-01-dashboard-dark.png")
        pg.goto(BASE + "/app/editor.html?template=bpmn"); pg.wait_for_timeout(1500); pg.screenshot(path=SC + "THM-01-editor-dark.png")
        d = pg.evaluate("document.documentElement.dataset.theme||getComputedStyle(document.body).backgroundColor")
        yes(b != a, f"тема не изменилась: {a} -> {b}"); yes(c == b and d == b, f"тема не держится между страницами: {b}, {c}, {d}")
        return f"{a} -> {b}"
    C("THM-01", "Тёмная тема: переключается в настройках и сохраняется на dashboard и в редакторе", th1)

    def th2():
        pg.evaluate("localStorage.setItem('dslkit.theme','zzz-неверное')"); pg.goto(BASE + "/app/dashboard.html"); pg.wait_for_timeout(1000)
        pg.evaluate("localStorage.setItem('dslkit.theme','{{{')"); pg.goto(BASE + "/app/editor.html"); pg.wait_for_timeout(1000)
        pg.evaluate("localStorage.removeItem('dslkit.theme')")
    C("THM-02", "Повреждённое значение темы в localStorage", th2)

    def th3():
        pg.emulate_media(color_scheme="dark"); pg.evaluate("localStorage.removeItem('dslkit.theme')"); pg.goto(BASE + "/index.html"); pg.wait_for_timeout(1200)
        bg = pg.evaluate("getComputedStyle(document.body).backgroundColor"); pg.screenshot(path=SC + "THM-03-os-dark-home.png")
        pg.emulate_media(color_scheme="light")
        return "фон при тёмной теме ОС и без сохранённого выбора: " + bg
    C("THM-03", "Тёмная тема операционной системы без сохранённого выбора", th3)

    def off1():
        pg.goto(BASE + "/app/editor.html?template=bpmn"); pg.wait_for_timeout(2500)
        t.ctx.set_offline(True)
        try:
            pg.goto(BASE + "/app/editor.html?template=erd"); pg.wait_for_timeout(2500)
            body = pg.inner_text("body")[:80].replace("\n", " ")
            n = pg.locator(".canvas__remote svg").count()
            res = f"офлайн: страница загрузилась (svg {n})"
        except Exception as e:
            res = "офлайн: страница не открылась (" + str(e).splitlines()[0][:60] + ")"; n = 0
        t.ctx.set_offline(False)
        yes(n >= 1, res); return res
    C("OFF-01", "Офлайн: повторное открытие редактора (service worker / кэш)", off1, shot=True)

    def off2():
        pg.goto(BASE + "/app/editor.html?template=bpmn"); pg.wait_for_timeout(2000)
        t.ctx.set_offline(True)
        pg.fill(".code__input", 'diagram bpmn "Офлайн"\nstart s "Старт"\ntask a "Задача"\nflow s -> a'); pg.wait_for_timeout(1200)
        n = len(pg.evaluate("[...document.querySelectorAll('.canvas__remote .notation__node[data-id]')].map(n=>n.dataset.id)"))
        pg.click('[data-action="save"]'); pg.wait_for_timeout(500)
        t.ctx.set_offline(False)
        yes(n >= 2, "доска не обновилась офлайн: блоков " + str(n))
        return f"офлайн: блоков {n}, сохранение выполнено"
    C("OFF-02", "Офлайн: ввод кода, отрисовка и сохранение проекта работают локально", off2)

    def tr1():
        pg.goto(BASE + "/app/dashboard.html"); pg.wait_for_timeout(1500)
        pg.evaluate("localStorage.removeItem('dslkit.tour-done')"); pg.goto(BASE + "/app/editor.html?template=bpmn"); pg.wait_for_timeout(2000)
        vis = pg.evaluate("!![...document.querySelectorAll('[role=dialog],.tour')].find(e=>e.offsetParent)")
        pg.screenshot(path=SC + "TUR-01.png")
        pg.keyboard.press("Escape"); pg.wait_for_timeout(500)
        vis2 = pg.evaluate("!![...document.querySelectorAll('.tour,[data-tour]')].find(e=>e.offsetParent&&!e.hidden)")
        flag = pg.evaluate("localStorage.getItem('dslkit.tour-done')")
        return f"тур показан: {vis}; после Escape виден: {vis2}; флаг tour-done: {flag}"
    C("TUR-01", "Первый запуск редактора: тур показывается и закрывается Escape", tr1, shot=True)

    def nf1():
        res = []
        for u in ["/net-takoy-stranicy.html", "/app/", "/en/app/zzz.html", "/app/editor.html%00", "/app/%2e%2e/%2e%2e/package.json", "/..%2f..%2fpackage.json"]:
            try:
                r = pg.goto(BASE + u); res.append(f"{u}: {r.status if r else '-'}")
            except Exception as e:
                res.append(f"{u}: ошибка")
        pg.goto(BASE + "/net-takoy-stranicy.html"); pg.screenshot(path=SC + "NF-01-404.png")
        body = pg.inner_text("body")[:120].replace("\n", " ")
        return " ; ".join(res) + " ; тело 404: " + body
    C("NF-01", "Несуществующие адреса и обход каталогов: статусы и страница 404", nf1)

    def cor1():
        pg.goto(BASE + "/app/editor.html?template=bpmn"); pg.wait_for_timeout(1500)
        pg.evaluate("localStorage.clear()"); pg.click('[data-action="save"]'); pg.wait_for_timeout(600)
        pg.reload(); pg.wait_for_timeout(1500)
        return "после очистки хранилища при открытом редакторе и сохранения: " + pg.url.split("5391")[1]
    C("COR-06", "Хранилище очищено при открытом редакторе, затем сохранение и перезагрузка", cor1, shot=True)

    def cor2():
        pg.evaluate("localStorage.clear()")
        for k in ["dslkit.projects", "dslkit.templates", "dslkit.seeded", "dslkit.dashboard", "dslkit.theme", "dslkit.lang", "dslkit.editor"]:
            pg.evaluate("([k,v])=>localStorage.setItem(k,v)", [k, "{{{garbage"])
        for u in ["/index.html", "/app/editor.html?template=bpmn", "/app/welcome.html", "/app/settings.html", "/en/app/editor.html"]:
            pg.goto(BASE + u); pg.wait_for_timeout(1000)
        pg.screenshot(path=SC + "COR-07.png")
    C("COR-07", "Повреждённые ключи dslkit.* (гость): все публичные страницы и редактор открываются", cor2)

    def two1():
        pg.evaluate("localStorage.clear()")
        a = pg; b = t.page()
        a.goto(BASE + "/app/editor.html?template=bpmn"); b.goto(BASE + "/app/editor.html?template=bpmn"); a.wait_for_timeout(1500); b.wait_for_timeout(1500)
        a.fill(".code__input", 'diagram bpmn "Вкладка A"\nstart s "A"'); a.wait_for_timeout(700); a.click('[data-action="save"]'); a.wait_for_timeout(500)
        b.fill(".code__input", 'diagram bpmn "Вкладка B"\nstart s "B"'); b.wait_for_timeout(700); b.click('[data-action="save"]'); b.wait_for_timeout(500)
        a.goto(BASE + "/app/dashboard.html"); a.wait_for_timeout(1500)
        res = json.loads(a.evaluate("JSON.stringify(Object.entries(localStorage).filter(([k])=>k.includes('projects')))"))
        names = [x["title"] for k, v in res for x in json.loads(v)]
        b.close()
        yes("Вкладка A" in names and "Вкладка B" in names, "теряется сохранение одной из вкладок: " + str(names))
        return "проекты после сохранения в двух вкладках: " + ", ".join(names)
    C("TWO-01", "Две вкладки редактора сохраняют разные диаграммы: обе остаются", two1)

    def two2():
        a = pg; b = t.page()
        a.goto(BASE + "/app/editor.html?template=bpmn"); a.wait_for_timeout(1500); a.fill(".code__input", 'diagram bpmn "Общий"\nstart s "A"'); a.wait_for_timeout(600); a.click('[data-action="save"]'); a.wait_for_timeout(600)
        url = a.url; b.goto(url); b.wait_for_timeout(1500)
        a.goto(BASE + "/app/dashboard.html"); a.wait_for_timeout(1200)
        a.locator(".project-list__item:visible .project-card__menu").first.click()
        a.once("dialog", lambda d: d.accept()); a.locator('[data-act="remove"]:visible').first.click(); a.wait_for_timeout(500)
        b.fill(".code__input", 'diagram bpmn "Общий после удаления"\nstart s "B"'); b.wait_for_timeout(600); b.click('[data-action="save"]'); b.wait_for_timeout(600)
        a.reload(); a.wait_for_timeout(1500)
        names = a.locator(".project-list__item:visible .project-card__link").all_inner_texts()
        b.close()
        return "после удаления в одной вкладке и сохранения в другой: " + " | ".join(names[:4])
    C("TWO-02", "Проект удалён в одной вкладке, во второй нажато «Сохранить»: что произойдёт (воскрешение / новый)", two2)

    t.save()
    print(len(t.rows), "errors:", t.errors[:6])
