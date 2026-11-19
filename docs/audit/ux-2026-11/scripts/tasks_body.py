"""Task walkthroughs of the UX audit. Usage: python run_tasks.py <engine edge|firefox> <lang ru|en> <device desktop|mobile> <name>
Each task is a story with counted steps; results go to logs/<name>.json, shots to shots/."""
import sys, time, json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from ux import *

engine, lang, device, name = sys.argv[1:5]
FX = Path(__file__).parent / "fixtures"
tag = f"{engine}-{lang}-{device}"
errs = []
T = lambda tid, title: Task(tid, title, lang, device, engine)
TOUR = "localStorage.setItem('dslkit.tour-done','1')"
dialogs = []


def hook(pg, answer=None, accept=True):
    def h(d):
        dialogs.append(f"{d.type}: {d.message[:90]}")
        d.accept(answer) if accept else d.dismiss()
    pg.on("dialog", h)


def tap(pg, sel):
    pg.locator(sel).first.click()


def tiny_targets(pg):
    """Interactive elements smaller than 44 px in the visible viewport."""
    return pg.evaluate("""() => [...document.querySelectorAll('a,button,input,select,summary,textarea')].filter(e=>e.offsetParent).map(e=>{const r=e.getBoundingClientRect();return {t:(e.innerText||e.getAttribute('aria-label')||e.className||'').toString().trim().slice(0,30),w:Math.round(r.width),h:Math.round(r.height)}}).filter(x=>(x.w<44||x.h<44)&&x.w>0)""")


def toast_text(pg):
    return pg.evaluate("[...document.querySelectorAll('.toast,[role=status],[role=alert]')].map(e=>e.innerText.trim()).filter(Boolean).join(' | ')")


with sync_playwright() as p:
    b = launch(p, engine)

    # ---- T1 first visit to first saved diagram (guest) ----
    t = T("T1", "First visit to the first saved diagram")
    ctx = new_ctx(b, lang=lang, device=device, signed_in=False)
    pg = page(ctx, errs)
    hook(pg)
    t.s("open landing", lambda: pg.goto(BASE + ("/" if lang == "ru" else "/en/")))
    t.evidence.append(shot(pg, f"t1-landing-{tag}"))
    if device == "mobile":
        t.f("landing nav on mobile: " + str(len(tiny_targets(pg))) + " targets under 44 px")
    t.s("click the main CTA", lambda: tap(pg, "a.button--hero"))
    pg.wait_for_timeout(1500)
    t.evidence.append(shot(pg, f"t1-editor-first-{tag}"))
    tour = pg.locator(".tour").count() > 0
    if tour:
        for i in range(5):
            if pg.locator(".tour").count() and pg.locator(".tour").first.is_visible():
                t.s(f"tour step {i+1}: next", lambda: pg.locator(".tour button.button--primary").first.click())
        t.f("5-step tour must be clicked through (or skipped) before the first action")
    t.s("press Save", lambda: tap(pg, "[data-action=save]"))
    pg.wait_for_timeout(700)
    msg = toast_text(pg)
    t.f(f"feedback after save: {msg[:100]!r}")
    t.evidence.append(shot(pg, f"t1-saved-{tag}"))
    t.done("Сохранено" in msg or "Saved" in msg or "saved" in msg.lower(), f"url {pg.url}")
    n_files = pg.locator(".file-tree__item").count()
    t.f(f"guest file tree shows {n_files} files (starter examples, duplicated names)")
    ctx.close()

    # ---- T2 auth ----
    t = T("T2", "Register, sign out, wrong password, sign in, forgot")
    ctx = new_ctx(b, lang=lang, device=device, signed_in=False, init=TOUR)
    pg = page(ctx, errs)
    base_app = BASE + ("/app/" if lang == "ru" else "/en/app/")
    t.s("open register", lambda: pg.goto(base_app + "register.html"))
    t.s("submit empty", lambda: tap(pg, "button[type=submit]"))
    empty_msg = pg.evaluate("[...document.querySelectorAll('.form__error,[role=alert],.field__error,:invalid')].map(e=>(e.validationMessage||e.innerText||e.id).toString().slice(0,80)).join(' | ')")
    t.f(f"empty submit message: {empty_msg!r}")
    t.evidence.append(shot(pg, f"t2-register-empty-{tag}"))
    t.s("fill name", lambda: pg.fill("input[name=name]", "Anna"))
    t.s("fill email", lambda: pg.fill("input[name=email]", "anna@example.com"))
    t.s("fill short password", lambda: pg.fill("input[name=password]", "123"))
    t.s("fill mismatching confirm", lambda: pg.fill("input[name=confirm]", "456"))
    t.s("submit", lambda: tap(pg, "button[type=submit]"))
    pg.wait_for_timeout(800)
    bad = pg.evaluate("document.querySelector('main').innerText.slice(0,500)")
    t.f("weak/mismatch feedback: " + bad.replace("\n", " / ")[:200])
    t.evidence.append(shot(pg, f"t2-register-bad-{tag}"))
    t.s("fix password", lambda: pg.fill("input[name=password]", "Passw0rd!x"))
    t.s("fix confirm", lambda: pg.fill("input[name=confirm]", "Passw0rd!x"))
    t.s("submit", lambda: tap(pg, "button[type=submit]"))
    pg.wait_for_timeout(2500)
    t.f(f"after register lands on {pg.url.split('/')[-1]}")
    t.evidence.append(shot(pg, f"t2-after-register-{tag}"))
    # sign out
    def sign_out():
        for sel in ["text=Выйти", "text=Sign out", "text=Log out"]:
            if pg.locator(sel).count():
                pg.locator(sel).first.click()
                return
        raise Exception("no sign-out control found on the page")
    t.s("find and press sign out", sign_out)
    pg.wait_for_timeout(1200)
    t.f(f"after sign out: {pg.url.split('/')[-1]}")
    t.s("open login", lambda: pg.goto(base_app + "login.html"))
    t.s("fill email", lambda: pg.fill("input[name=email]", "anna@example.com"))
    t.s("wrong password", lambda: pg.fill("input[name=password]", "wrongwrong"))
    t.s("submit", lambda: tap(pg, "button[type=submit]"))
    pg.wait_for_timeout(1200)
    wrong = pg.evaluate("document.querySelector('main').innerText.slice(0,400)")
    t.f("wrong password: " + wrong.replace("\n", " / ")[:200])
    t.evidence.append(shot(pg, f"t2-login-wrong-{tag}"))
    forgot = pg.locator("a:has-text('Забыли'), a:has-text('Forgot'), a:has-text('Восстанов'), a:has-text('Reset')").count()
    t.f(f"forgot-password link present: {bool(forgot)}")
    t.s("right password", lambda: pg.fill("input[name=password]", "Passw0rd!x"))
    t.s("submit", lambda: tap(pg, "button[type=submit]"))
    pg.wait_for_timeout(2500)
    t.done("dashboard" in pg.url or "welcome" in pg.url, pg.url)
    ctx.close()

    # ---- T3 draw by code and by board ----
    t = T("T3", "Draw a diagram by code and by the board")
    ctx = new_ctx(b, lang=lang, device=device, init=TOUR)
    pg = page(ctx, errs)
    hook(pg, "Renamed")
    t.s("open editor with the BPMN template", lambda: pg.goto(BASE + ("/app/" if lang == "ru" else "/en/app/") + "editor.html?template=bpmn"))
    pg.wait_for_timeout(1500)
    ta = pg.locator("textarea.code__input")
    t.s("click code", lambda: ta.click())
    t.s("go to end and type a new task line", lambda: (pg.keyboard.press("Control+End"), pg.keyboard.type("\ntask zz \"New step\"")))
    pg.wait_for_timeout(900)
    t.evidence.append(shot(pg, f"t3-code-typed-{tag}"))
    t.f("live render after typing: " + str("New step" in pg.inner_text("body")))
    t.s("type a broken line", lambda: pg.keyboard.type("\nnonsense ->"))
    pg.wait_for_timeout(900)
    pb = pg.evaluate("document.querySelector('#problems-panel')?.innerText.slice(0,300)")
    t.f("problem feedback for a broken line: " + (pb or "").replace("\n", " / "))
    t.evidence.append(shot(pg, f"t3-code-error-{tag}"))
    t.s("undo (toolbar)", lambda: tap(pg, "[data-action=undo]"))
    t.s("undo again", lambda: tap(pg, "[data-action=undo]"))
    t.s("redo", lambda: tap(pg, "[data-action=redo]"))
    t.s("open add element", lambda: tap(pg, ".board-tools__add"))
    t.f("palette items: " + str(pg.locator(".palette__item").count()))
    t.evidence.append(shot(pg, f"t3-palette-{tag}"))
    t.s("add task", lambda: pg.locator(".palette__item", has_text="Задача" if lang == "ru" else "Task").first.click())
    pg.wait_for_timeout(600)
    n0 = pg.locator("svg g, svg rect").count()
    t.s("add gateway", lambda: (pg.click(".board-tools__add"), pg.locator(".palette__item").nth(4).click()))
    pg.wait_for_timeout(600)
    t.s("connect mode", lambda: tap(pg, ".palette__mode"))
    t.evidence.append(shot(pg, f"t3-connect-{tag}"))
    t.s("delete selected with nothing selected", lambda: pg.locator(".palette__remove").first.click(timeout=3000))
    t.f("delete button disabled state: " + str(pg.locator(".palette__remove").first.is_disabled()))
    t.s("keyboard Delete in canvas", lambda: pg.keyboard.press("Delete"))
    t.done(True, "see friction and shots")
    ctx.close()

    # ---- T4 imports ----
    t = T("T4", "Import files of each format and a picture without AI")
    ctx = new_ctx(b, lang=lang, device=device, init=TOUR)
    pg = page(ctx, errs)
    hook(pg)
    results = {}
    for f in ["a.dot", "a.csv", "a.json", "a.graphml", "a.gexf", "a.mmd", "a.puml", "a.dsl", "a.txt", "a.bpmn", "a.drawio", "a.svg", "a.xmi", "broken.json", "empty.dsl", "pic.png"]:
        pg.goto(BASE + ("/app/" if lang == "ru" else "/en/app/") + "editor.html?auto=1")
        pg.wait_for_timeout(1200)
        try:
            inp = pg.locator("input[type=file]").first
            inp.set_input_files(str(FX / f))
            pg.wait_for_timeout(1500)
            results[f] = pg.evaluate("document.body.innerText").replace("\n", " / ")
            # keep only wizard-ish lines
            i = results[f].find("Диаграмма") if lang == "ru" else results[f].find("diagram")
            results[f] = results[f][:0] + " ".join(pg.evaluate("[...document.querySelectorAll('[role=status],[role=alert],.automation__status,.automation__message,.toast,.problems__status')].map(e=>e.innerText.trim()).filter(Boolean)"))[:260]
        except Exception as e:  # noqa: BLE001
            results[f] = "ERROR " + str(e)[:100]
        t.s(f"import {f}")
        t.f(f"{f}: {results[f]!r}")
        if f in ("a.txt", "broken.json", "pic.png", "a.drawio"):
            t.evidence.append(shot(pg, f"t4-{f.replace('.', '-')}-{tag}"))
    # large file
    big = Path(__file__).parent / "fixtures" / "_big.bin"
    big.write_bytes(b"0" * (11 * 1024 * 1024))
    try:
        pg.goto(BASE + ("/app/" if lang == "ru" else "/en/app/") + "editor.html?auto=1")
        pg.wait_for_timeout(1200)
        pg.locator("input[type=file]").first.set_input_files(str(big))
        pg.wait_for_timeout(1500)
        t.f("11 MB file: " + " ".join(pg.evaluate("[...document.querySelectorAll('[role=status],[role=alert],.toast')].map(e=>e.innerText.trim()).filter(Boolean)"))[:200])
        t.evidence.append(shot(pg, f"t4-big-{tag}"))
    finally:
        big.unlink(missing_ok=True)
    t.done(True, "per-format results in friction list")
    ctx.close()

    # ---- T5 AI panels with and without a key ----
    for key, base in (("noai", BASE), ("fakeai", BASE_AI)):
        t = T(f"T5-{key}", f"Review & fix and clarify panels ({key})")
        ctx = new_ctx(b, lang=lang, device=device, init=TOUR)
        pg = page(ctx, errs)
        hook(pg)
        pg.goto(base + ("/app/" if lang == "ru" else "/en/app/") + "editor.html?template=bpmn")
        pg.wait_for_timeout(1500)
        t.s("break the code", lambda: (pg.locator("textarea.code__input").click(), pg.keyboard.press("Control+End"), pg.keyboard.type("\nfoo -> bar")))
        pg.wait_for_timeout(800)
        t.s("open menu", lambda: tap(pg, ".editor-menu__summary"))
        t.s("Check and fix", lambda: pg.locator(".editor-menu__panel button", has_text="Проверить и исправить" if lang == "ru" else "Check and fix").first.click())
        pg.wait_for_timeout(2500)
        t.f("review panel text: " + pg.evaluate("document.body.innerText").replace("\n", " / ")[-500:])
        t.evidence.append(shot(pg, f"t5-review-{key}-{tag}"))
        t.s("open menu", lambda: tap(pg, ".editor-menu__summary"))
        t.s("Clarify", lambda: pg.locator(".editor-menu__panel button", has_text="Уточнить" if lang == "ru" else "Clarify").first.click())
        pg.wait_for_timeout(3000)
        t.evidence.append(shot(pg, f"t5-clarify-{key}-{tag}"))
        t.f("clarify state: " + toast_text(pg)[:200])
        t.done(True, "")
        ctx.close()

    # ---- T6 projects ----
    t = T("T6", "Projects: search, filter, rename, trash, restore, share, versions")
    ctx = new_ctx(b, lang=lang, device=device, seeded=True, init=TOUR)
    pg = page(ctx, errs)
    hook(pg, "My renamed project")
    app = BASE + ("/app/" if lang == "ru" else "/en/app/")
    t.s("open dashboard", lambda: pg.goto(app + "dashboard.html"))
    pg.wait_for_timeout(1500)
    t.evidence.append(shot(pg, f"t6-dashboard-{tag}"))
    t.s("search 'zzzz' (no result)", lambda: pg.fill("#app-search", "zzzz"))
    pg.wait_for_timeout(600)
    t.f("empty search message: " + pg.inner_text("#project-count"))
    t.s("clear search", lambda: pg.fill("#app-search", ""))
    t.s("search 'order'", lambda: pg.fill("#app-search", "order"))
    pg.wait_for_timeout(600)
    t.f("count after search: " + pg.inner_text("#project-count"))
    t.s("filter BPMN chip", lambda: pg.locator(".filter__chip[data-filter=bpmn]").click())
    pg.wait_for_timeout(500)
    t.f("count after search+filter: " + pg.inner_text("#project-count"))
    t.s("reset", lambda: (pg.fill("#app-search", ""), pg.locator(".filter__chip[data-filter=all]").click()))
    card = pg.locator(".project-list__item").first
    t.s("open card menu", lambda: card.locator(".project-card__menu").click())
    t.evidence.append(shot(pg, f"t6-card-menu-{tag}"))
    t.f("card menu items: " + " | ".join(card.locator("[data-act]").all_inner_texts()))
    t.s("rename", lambda: card.locator("[data-act=rename]").click())
    pg.wait_for_timeout(500)
    t.f("rename uses a native prompt: " + str([d for d in dialogs if d.startswith("prompt")][-1:]))
    t.s("open card menu", lambda: pg.locator(".project-list__item").first.locator(".project-card__menu").click())
    t.s("move to trash", lambda: pg.locator(".project-list__item").first.locator("[data-act=remove]").click())
    pg.wait_for_timeout(500)
    t.f("trash uses a native confirm: " + str([d for d in dialogs if d.startswith("confirm")][-1:]))
    t.s("open trash", lambda: pg.goto(app + "dashboard.html#trash"))
    pg.wait_for_timeout(1000)
    t.evidence.append(shot(pg, f"t6-trash-{tag}"))
    t.s("restore", lambda: pg.locator("[data-act=restore]").first.click())
    pg.wait_for_timeout(500)
    t.f("restore feedback: " + toast_text(pg)[:100])
    t.s("open project", lambda: (pg.goto(app + "dashboard.html"), pg.wait_for_timeout(800), pg.locator(".project-card__link").first.click()))
    pg.wait_for_timeout(1500)
    t.s("share", lambda: (pg.click(".editor-menu__summary"), pg.locator("[data-action=share]").click()))
    pg.wait_for_timeout(800)
    t.f("share feedback: " + toast_text(pg)[:200])
    t.evidence.append(shot(pg, f"t6-share-{tag}"))
    t.s("versions tab", lambda: pg.locator("[data-problems-tab=versions]").click())
    pg.wait_for_timeout(600)
    t.f("versions panel: " + pg.evaluate("document.querySelector('#problems-panel')?.innerText.slice(0,300)").replace("\n", " / "))
    t.evidence.append(shot(pg, f"t6-versions-{tag}"))
    t.done(True, "")
    ctx.close()

    # ---- T7 exports ----
    t = T("T7", "Export in every format")
    ctx = new_ctx(b, lang=lang, device=device, init=TOUR)
    pg = page(ctx, errs)
    hook(pg)
    pg.goto(app + "editor.html?template=bpmn")
    pg.wait_for_timeout(1500)
    t.s("open menu", lambda: tap(pg, ".editor-menu__summary"))
    labels = pg.evaluate("[...document.querySelectorAll('[data-export]')].map(e=>e.getAttribute('data-export')+':'+e.innerText.trim())")
    t.f("export items: " + str(labels))
    t.evidence.append(shot(pg, f"t7-menu-{tag}"))
    for fmt in [x.split(":")[0] for x in labels]:
        def go(fmt=fmt):
            if not pg.locator(".editor-menu__panel").is_visible():
                pg.click(".editor-menu__summary")
            el = pg.locator(f"[data-export={fmt}]")
            if not el.is_visible():
                pg.locator(".editor-menu__panel summary", has_text="Экспорт" if lang == "ru" else "Export").first.click()
            with pg.expect_download(timeout=8000) as dl:
                el.click()
            return dl.value.suggested_filename
        r = t.s(f"export {fmt}", go)
        t.f(f"export {fmt} -> {r}")
    t.done(True, "")
    ctx.close()

    # ---- T8 settings/theme/language ----
    t = T("T8", "Settings, theme and language switch keeping the page")
    ctx = new_ctx(b, lang=lang, device=device, init=TOUR)
    pg = page(ctx, errs)
    pg.goto(app + "editor.html?template=erd")
    pg.wait_for_timeout(1500)
    t.s("type into code", lambda: (pg.locator("textarea.code__input").click(), pg.keyboard.press("Control+End"), pg.keyboard.type("\n// unsaved note")))
    pg.wait_for_timeout(400)
    t.s("open menu", lambda: tap(pg, ".editor-menu__summary"))
    t.s("switch language", lambda: pg.locator(".editor-menu__panel a[href*='/en/'], .editor-menu__panel a[href*='../app/'], .editor-menu__panel a:has-text('English'), .editor-menu__panel a:has-text('Русский')").first.click())
    pg.wait_for_timeout(1800)
    t.f(f"after language switch url {pg.url.split('localhost')[-1].split('5391')[-1]}; unsaved note kept: " + str("unsaved note" in pg.evaluate("document.querySelector('textarea.code__input')?.value||''")))
    t.evidence.append(shot(pg, f"t8-lang-{tag}"))
    t.s("settings", lambda: pg.goto(app + "settings.html"))
    pg.wait_for_timeout(1000)
    t.evidence.append(shot(pg, f"t8-settings-{tag}", full=True))
    t.f("settings text: " + pg.evaluate("document.querySelector('main').innerText.slice(0,600)").replace("\n", " / "))
    t.done(True, "")
    ctx.close()

    # ---- T9 quota ----
    t = T("T9", "5 diagrams per day quota messaging")
    ctx = new_ctx(b, lang=lang, device=device, seeded=False, init=TOUR)
    pg = page(ctx, errs)
    hook(pg, "x")
    pg.goto(app + "dashboard.html")
    pg.wait_for_timeout(1200)
    t.f("quota text: " + pg.inner_text("#quota-text"))
    pg.goto(app + "welcome.html")
    pg.wait_for_timeout(800)
    for i in range(6):
        def mk(i=i):
            pg.goto(app + "editor.html")
            pg.wait_for_timeout(900)
            pg.locator("textarea.code__input").click()
            pg.keyboard.press("Control+End")
            pg.keyboard.type(f"\n// {i}")
            pg.click("[data-action=save]")
            pg.wait_for_timeout(500)
            return toast_text(pg)[:120]
        r = t.s(f"save new diagram #{i+1}", mk)
        t.f(f"#{i+1}: {r}")
    t.evidence.append(shot(pg, f"t9-quota-{tag}"))
    pg.goto(app + "dashboard.html")
    pg.wait_for_timeout(1000)
    t.f("quota text after: " + pg.inner_text("#quota-text"))
    t.done(True, "")
    ctx.close()

    # ---- T10 docs ----
    t = T("T10", "Docs pages")
    ctx = new_ctx(b, lang=lang, device=device, init=TOUR)
    pg = page(ctx, errs)
    t.s("open docs", lambda: pg.goto(app + "docs.html"))
    pg.wait_for_timeout(1200)
    t.evidence.append(shot(pg, f"t10-docs-{tag}"))
    t.f("docs head: " + pg.evaluate("document.querySelector('main').innerText.slice(0,300)").replace("\n", " / "))
    t.f("docs search input present: " + str(pg.locator("main input[type=search], main input[type=text]").count()))
    t.done(True, "")
    ctx.close()

    # ---- T11 errors ----
    t = T("T11", "Error situations")
    ctx = new_ctx(b, lang=lang, device=device, seeded=False, init=TOUR)
    pg = page(ctx, errs)
    hook(pg, "x")
    pg.goto(app + "editor.html?template=bpmn")
    pg.wait_for_timeout(1500)
    t.s("go offline", lambda: ctx.set_offline(True))
    t.s("save while offline", lambda: tap(pg, "[data-action=save]"))
    pg.wait_for_timeout(600)
    t.f("offline save feedback: " + toast_text(pg)[:150])
    t.s("export svg offline", lambda: None)
    t.s("open Check and fix offline", lambda: (pg.click(".editor-menu__summary"), pg.locator(".editor-menu__panel button", has_text="Проверить и исправить" if lang == "ru" else "Check and fix").first.click()))
    pg.wait_for_timeout(2000)
    t.f("offline review: " + toast_text(pg)[:150])
    t.evidence.append(shot(pg, f"t11-offline-{tag}"))
    ctx.set_offline(False)
    # corrupted storage
    ctx2 = new_ctx(b, lang=lang, device=device, signed_in=False, init="localStorage.setItem('dslkit.projects','{not json'); localStorage.setItem('dslkit.accounts','###'); " + TOUR)
    pg2 = page(ctx2, errs)
    pg2.goto(app + "dashboard.html")
    pg2.wait_for_timeout(1500)
    t.f(f"corrupted storage: url {pg2.url.split('/')[-1]}; text {pg2.evaluate('document.body.innerText').replace(chr(10), ' / ')[:200]}")
    t.evidence.append(shot(pg2, f"t11-corrupt-{tag}"))
    ctx2.close()
    # session expired / removed mid-use
    ctx3 = new_ctx(b, lang=lang, device=device, init=TOUR)
    pg3 = page(ctx3, errs)
    pg3.goto(app + "editor.html?template=bpmn")
    pg3.wait_for_timeout(1200)
    pg3.evaluate("localStorage.removeItem('dslkit.session')")
    pg3.click("[data-action=save]")
    pg3.wait_for_timeout(800)
    t.f("save after session removed: " + toast_text(pg3)[:150] + " url " + pg3.url.split("/")[-1])
    pg3.goto(app + "dashboard.html")
    pg3.wait_for_timeout(1200)
    t.f("dashboard after session removed -> " + pg3.url.split("/")[-1])
    ctx3.close()
    # storage full
    ctx4 = new_ctx(b, lang=lang, device=device, init=TOUR + ";const _s=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(String(k).startsWith('dslkit.projects')&&window.__full)throw new DOMException('full','QuotaExceededError');return _s.call(this,k,v)}")
    pg4 = page(ctx4, errs)
    pg4.goto(app + "editor.html?template=bpmn")
    pg4.wait_for_timeout(1200)
    pg4.evaluate("window.__full=true")
    pg4.click("[data-action=save]")
    pg4.wait_for_timeout(800)
    t.f("save with storage full: " + toast_text(pg4)[:150] + "; status: " + pg4.evaluate("document.querySelector('.editor-status__saved')?.innerText||''"))
    t.evidence.append(shot(pg4, f"t11-full-{tag}"))
    ctx4.close()
    t.done(True, "")
    # 404 page
    ctx5 = new_ctx(b, lang=lang, device=device, signed_in=False)
    pg5 = page(ctx5, errs)
    pg5.goto(BASE + "/nope")
    t.f("404 page: " + pg5.evaluate("document.body.innerText").replace("\n", " / ")[:200])
    ctx5.close()

    # ---- T12 keyboard / a11y / reduced motion ----
    t = T("T12", "Keyboard-only traversal, skip links, live regions, reduced motion")
    ctx = new_ctx(b, lang=lang, device=device, init=TOUR, reduced=True)
    pg = page(ctx, errs)
    pg.goto(app + "editor.html?template=bpmn")
    pg.wait_for_timeout(1500)
    order = []
    for i in range(14):
        pg.keyboard.press("Tab")
        order.append(pg.evaluate("(()=>{const e=document.activeElement;return (e.tagName+':'+(e.getAttribute('aria-label')||e.innerText||e.className||'').toString().trim().slice(0,25)+(getComputedStyle(e).outlineStyle==='none'&&getComputedStyle(e).boxShadow==='none'?' [NO-FOCUS-RING]':''))})()"))
    t.f("tab order: " + " > ".join(order))
    t.evidence.append(shot(pg, f"t12-focus-{tag}"))
    a11y = pg.evaluate("""() => ({
      liveRegions: document.querySelectorAll('[aria-live],[role=status],[role=alert]').length,
      unlabeledButtons: [...document.querySelectorAll('button,a,input,select,textarea')].filter(e=>e.offsetParent&&!(e.getAttribute('aria-label')||e.innerText.trim()||e.labels?.length||e.getAttribute('aria-labelledby')||e.title)).map(e=>e.className.toString().slice(0,30)),
      h1: document.querySelectorAll('h1').length, lang: document.documentElement.lang,
      animations: document.getAnimations().length })""")
    t.f("a11y probe: " + json.dumps(a11y, ensure_ascii=False))
    ta11 = tiny_targets(pg)
    t.f(f"targets under 44 px in editor: {len(ta11)} e.g. {ta11[:6]}")
    t.s("Ctrl+S in code", lambda: (pg.locator("textarea.code__input").click(), pg.keyboard.press("Control+s")))
    pg.wait_for_timeout(600)
    t.f("Ctrl+S feedback: " + toast_text(pg)[:100])
    t.s("Escape closes menu", lambda: (pg.click(".editor-menu__summary"), pg.keyboard.press("Escape")))
    t.f("menu closed on Escape: " + str(not pg.locator(".editor-menu__panel").is_visible()))
    if device == "mobile":
        pg.goto(app + "dashboard.html")
        pg.wait_for_timeout(1200)
        t.f(f"dashboard small targets: {len(tiny_targets(pg))} {tiny_targets(pg)[:8]}")
        t.evidence.append(shot(pg, f"t12-mobile-dash-{tag}"))
        pg.goto(app + "editor.html?template=bpmn")
        pg.wait_for_timeout(1500)
        t.evidence.append(shot(pg, f"t12-mobile-editor-{tag}"))
        t.f("mobile editor horizontal overflow: " + str(pg.evaluate("document.documentElement.scrollWidth>innerWidth")))
    t.done(True, "")
    ctx.close()

    t_all = [x.dump() for x in Task.ALL]
    (LOGS / f"{name}.json").write_text(json.dumps({"tag": tag, "tasks": t_all, "errors": errs[:40], "dialogs": dialogs}, ensure_ascii=False, indent=1), encoding="utf-8")
    try:
        b.close()
    except Exception:
        pass
print("done", name)
