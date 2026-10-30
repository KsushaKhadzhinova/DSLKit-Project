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


