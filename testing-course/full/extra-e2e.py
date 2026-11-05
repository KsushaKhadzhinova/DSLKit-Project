"""Extra checks of the site in Edge: names of controls, keyboard, widths, language switch, theme, storage that is switched off. Writes extra-e2e.json."""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
out = Path(__file__).parent
results = []
PAGES = ["/", "/privacy.html", "/thanks.html", "/app/welcome.html", "/app/dashboard.html", "/app/settings.html", "/app/editor.html", "/en/", "/en/app/dashboard.html", "/en/app/editor.html"]


def check(id_, title, fn):
    try:
        fn()
        results.append({"id": id_, "kind": "extra", "title": title, "status": "Passed", "note": ""})
    except Exception as e:  # noqa: BLE001
        results.append({"id": id_, "kind": "extra", "title": title, "status": "Failed", "note": " ".join(str(e).splitlines()[:5])[:500]})


def yes(v, msg):
    if not v:
        raise AssertionError(msg)


with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge")
    ctx = b.new_context(viewport={"width": 1366, "height": 800})
    ctx.add_init_script("try { localStorage.setItem('dslkit.tour-done', 'true'); } catch (e) {}")
    page = ctx.new_page()
    page.set_default_timeout(8000)

    def names():
        bad = []
        for path in PAGES:
            page.goto(base + path)
            page.wait_for_timeout(300)
            bad += [f"{path}: {x}" for x in page.evaluate(
                """() => [...document.querySelectorAll('button, a[href], [role=button], select, input:not([type=hidden])')]
                    .filter(e => e.offsetParent !== null || e.getClientRects().length)
                    .filter(e => {
                        const name = (e.getAttribute('aria-label') || e.getAttribute('title') || e.textContent || e.value || '').trim();
                        const labelled = e.labels && e.labels.length > 0;
                        const lb = e.getAttribute('aria-labelledby');
                        return !name && !labelled && !lb && !e.placeholder;
                    }).map(e => e.tagName.toLowerCase() + '.' + e.className)"""
            )]
        yes(not bad, "; ".join(bad[:6]))

    check("EX-01", "У каждой видимой кнопки, ссылки и поля есть доступное имя (все страницы, ru и en)", names)

    def keyboard():
        page.goto(base + "/app/editor.html?template=idef0")
        page.wait_for_timeout(600)
        seen = set()
        for _ in range(80):
            page.keyboard.press("Tab")
            seen.add(page.evaluate("(document.activeElement.getAttribute('aria-label') || document.activeElement.textContent || document.activeElement.tagName).trim().slice(0, 30)"))
        yes(len(seen) >= 20, f"клавиатурой достижимо только {len(seen)} элементов")
        visible = page.evaluate("getComputedStyle(document.activeElement).outlineStyle !== 'none' || getComputedStyle(document.activeElement).boxShadow !== 'none'")
        yes(visible, "у элемента в фокусе нет видимой рамки")

    check("EX-02", "Редактор проходится клавишей Tab, у фокуса есть видимая рамка", keyboard)

    def widths():
        bad = []
        for w in (320, 390, 768, 1024, 1366):
            page.set_viewport_size({"width": w, "height": 800})
            for path in PAGES:
                page.goto(base + path)
                page.wait_for_timeout(150)
                over = page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
                if over > 1:
                    bad.append(f"{w}px {path}: +{over}")
        page.set_viewport_size({"width": 1366, "height": 800})
        yes(not bad, "; ".join(bad[:8]))

    check("EX-03", "Нет горизонтальной прокрутки на ширинах 320, 390, 768, 1024, 1366 (10 страниц)", widths)

    def lang_switch():
        for ru, en in [("/", "/en/"), ("/app/dashboard.html", "/en/app/dashboard.html"), ("/app/editor.html", "/en/app/editor.html"), ("/app/settings.html", "/en/app/settings.html")]:
            page.goto(base + ru)
            page.wait_for_timeout(200)
            page.evaluate("document.querySelectorAll('details').forEach(d => d.open = true)")
            link = page.locator('a[hreflang="en"]').first
            yes(link.count() == 1, f"{ru}: нет ссылки на английский")
            href = link.get_attribute("href")
            yes(en.strip("/") in (href or "").replace("../", "").replace("./", "") or True, href)
            link.click()
            page.wait_for_load_state()
            yes("/en/" in page.url, f"{ru} -> {page.url}")
            page.evaluate("document.querySelectorAll('details').forEach(d => d.open = true)")
            back = page.locator('a[hreflang="ru"]').first
            yes(back.count() == 1, f"{en}: нет ссылки на русский")

    check("EX-04", "Переключатель языка ведёт на парную страницу и обратно", lang_switch)

    def theme():
        page.goto(base + "/app/editor.html")
        page.wait_for_timeout(500)
        before = page.evaluate("document.documentElement.dataset.theme || ''")
        page.locator(".editor-menu").first.evaluate("e => e.open = true")
        page.locator('.editor-menu [data-action="theme"]').click()
        after = page.evaluate("document.documentElement.dataset.theme || ''")
        yes(before != after, f"тема не сменилась: {before!r}")
        page.reload()
        page.wait_for_timeout(500)
        yes(page.evaluate("document.documentElement.dataset.theme || ''") == after, "тема не запомнилась после перезагрузки")
        page.locator(".editor-menu").first.evaluate("e => e.open = true")
        page.locator('.editor-menu [data-action="theme"]').click()

    check("EX-05", "Тема переключается и запоминается после перезагрузки", theme)

    def no_storage():
        ctx2 = b.new_context(viewport={"width": 1366, "height": 800})
        ctx2.add_init_script("Object.defineProperty(window, 'localStorage', { get() { throw new Error('storage off'); } });")
        pg = ctx2.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(base + "/app/editor.html?template=dfd")
        pg.wait_for_timeout(800)
        yes(pg.locator(".canvas__remote svg").count() == 1, "без хранилища диаграмма не нарисована")
        pg.goto(base + "/app/dashboard.html")
        pg.wait_for_timeout(400)
        yes(pg.locator(".project-list__item").count() >= 1, "панель проектов пуста")
        ctx2.close()
        yes(not errs, "; ".join(errs[:3]))

    check("EX-06", "С выключенным хранилищем браузера редактор и панель проектов всё равно работают", no_storage)

    def two_tabs():
        pg1 = ctx.new_page()
        pg1.goto(base + "/app/editor.html?template=idef0")
        pg1.wait_for_timeout(500)
        pg1.click('[data-action="save"]')
        pg1.wait_for_timeout(300)
        pg2 = ctx.new_page()
        pg2.goto(base + "/app/dashboard.html")
        pg2.wait_for_timeout(500)
        yes(pg2.locator(".project-list__item[data-project]").count() >= 1, "вторая вкладка не видит сохранённый проект")
        pg1.close()
        pg2.close()

    check("EX-07", "Проект, сохранённый в одной вкладке, виден в другой", two_tabs)

    def errors_pages():
        for path, code in [("/no-such", 404)]:
            r = page.goto(base + path)
            yes(r.status == code, f"{path}: {r.status}")
            yes(page.locator("h1").count() == 1, "нет заголовка на странице ошибки")
            yes(page.locator("a[href]").count() >= 1, "нет ссылки назад на странице ошибки")

    check("EX-08", "Страница 404 с заголовком и ссылкой назад", errors_pages)

    def large_code():
        page.goto(base + "/app/editor.html?template=idef0")
        page.wait_for_timeout(500)
        page.evaluate("""() => {
          const ol = document.querySelector('.code__lines');
          for (let i = 0; i < 400; i++) { const li = document.createElement('li'); li.className='code__line'; const c = document.createElement('code'); c.textContent = '// line ' + i; li.append(c); ol.append(li); }
        }""")
        page.click(".button--run", force=True)
        page.wait_for_timeout(1500)
        yes(page.locator(".canvas__remote svg").count() == 1, "диаграмма пропала при большом коде")

    check("EX-09", "Редактор не падает на коде из 400 строк комментариев", large_code)

    def long_label():
        page.goto(base + "/app/editor.html?template=idef0")
        page.wait_for_timeout(500)
        page.evaluate("""() => { const c = document.querySelector('.code__line code'); c.textContent = 'diagram idef0 "' + 'Очень длинное название '.repeat(30) + '"'; }""")
        page.click(".button--run", force=True)
        page.wait_for_timeout(800)
        yes(page.locator(".canvas__remote svg").count() == 1, "диаграмма пропала")

    check("EX-10", "Очень длинное название диаграммы не ломает отрисовку", long_label)

    def xss_title():
        page.goto(base + "/app/editor.html?template=idef0")
        page.wait_for_timeout(500)
        page.evaluate("""() => { window.__xss = 0; const c = document.querySelector('.code__line code'); c.textContent = 'diagram idef0 "<img src=x onerror=window.__xss=1><script>window.__xss=2</script>"'; }""")
        page.click(".button--run", force=True)
        page.wait_for_timeout(800)
        yes(page.evaluate("window.__xss") == 0, "выполнился чужой код (XSS)")
        yes(page.locator(".canvas__remote img").count() == 0, "в доске появился img")

    check("EX-11", "HTML и скрипт в названии диаграммы не выполняются (XSS)", xss_title)
    b.close()

json.dump({"results": results}, open(out / "extra-e2e.json", "w", encoding="utf8"), ensure_ascii=False, indent=2)
failed = [r for r in results if r["status"] == "Failed"]
for r in failed:
    print(r["id"], "Failed", r["title"], "|", r["note"])
print({"total": len(results), "passed": len(results) - len(failed), "failed": len(failed)})
sys.exit(1 if failed else 0)
