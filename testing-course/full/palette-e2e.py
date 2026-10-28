"""Palette, hand drawing and strict conformance in Edge. Writes palette-e2e.json. Needs the site on :5173."""
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
        results.append({"id": id_, "kind": "palette", "title": title, "status": "Passed", "note": ""})
    except Exception as e:  # noqa: BLE001
        try:
            (out.parent / "screens").mkdir(exist_ok=True)
            PAGE[0].screenshot(path=str(out.parent / "screens" / f"fail-{id_}.png"))
        except Exception:  # noqa: BLE001
            pass
        results.append({"id": id_, "kind": "palette", "title": title, "status": "Failed", "note": " ".join(str(e).splitlines()[:6])[:500]})


def eq(a, b, msg=""):
    if a != b:
        raise AssertionError(f"{msg} ожидалось {b!r}, получено {a!r}")


def yes(v, msg):
    if not v:
        raise AssertionError(msg)


NOTATIONS = ["idef0", "idef1", "idef1x", "idef3", "idef4", "idef5", "dfd", "erd", "bpmn", "petri", "gost", "graph", "dag", "uml-class", "uml-object",
             "uml-component", "uml-composite", "uml-deployment", "uml-package", "uml-profile", "uml-usecase", "uml-activity", "uml-state", "uml-sequence",
             "uml-communication", "uml-timing", "uml-overview", "mindmap", "orgchart", "c4", "network", "decision", "epc"]

with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge")
    ctx = b.new_context(viewport={"width": 1366, "height": 900})
    ctx.add_init_script("try { localStorage.setItem('dslkit.tour-done', 'true'); } catch (e) {}")
    page = ctx.new_page()
    PAGE[0] = page
    page.set_default_timeout(8000)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" and "kroki" not in m.text.lower() else None)
    code = lambda: page.evaluate("[...document.querySelectorAll('.code__line code')].map(e=>e.textContent).join('\\n')")  # noqa: E731

    def load(template):
        page.goto(f"{base}/app/editor.html?template={template}")
        page.wait_for_timeout(600)

    def drop(index, dx=0.5, dy=0.5):
        item = page.locator(".palette__item").nth(index).bounding_box()
        svg = page.locator(".canvas__remote svg").bounding_box()
        page.mouse.move(item["x"] + 10, item["y"] + 10)
        page.mouse.down()
        page.mouse.move(svg["x"] + svg["width"] * dx, svg["y"] + svg["height"] * dy, steps=10)
        page.mouse.up()
        page.wait_for_timeout(600)

    def palettes():
        for key in ["idef0", "dfd", "erd", "bpmn", "uml-class", "petri", "network"]:
            load(key)
            n = page.locator(".palette__item").count()
            yes(n >= 1, f"{key}: палитра пуста")

    check("PL-01", "Палитра элементов есть у основных нотаций и меняется вместе с нотацией", palettes)

    def click_add():
        load("dfd")
        before = code()
        page.locator(".palette__item", has_text="Процесс").click()
        page.wait_for_timeout(500)
        yes(code().count("process") == before.count("process") + 1, "процесс не добавлен")
        yes("Добавлено" in page.inner_text(".palette__message"), page.inner_text(".palette__message"))
        yes(page.locator(".notation__node").count() >= 6, "узел не нарисован")

    check("PL-02", "Нажатие на элемент палитры добавляет его в код и на доску", click_add)

    def drag_new():
        load("dfd")
        drop(1, 0.8, 0.8)
        last = code().split("\n")[-1]
        yes(last.startswith("process P1") and "pos=" in last, last)

    check("PL-03", "Элемент перетаскивается из палитры на доску и встаёт на место (pos=XxY)", drag_new)

    def drag_idef0():
        load("idef0")
        svg0 = page.locator(".canvas__remote svg").bounding_box()
        tx, ty = svg0["x"] + svg0["width"] * 0.5, svg0["y"] + svg0["height"] * 0.7
        drop(0, 0.5, 0.7)
        tail = code()
        yes("box A4" in tail and "pos=" in tail, tail[-120:])
        yes(page.locator(".notation__node").count() == 4, "блок не нарисован")
        node = page.locator('.notation__node[data-id="A4"]').bounding_box()
        cx, cy = node["x"] + node["width"] / 2, node["y"] + node["height"] / 2
        yes(abs(cx - tx) < 40 and abs(cy - ty) < 40, f"блок встал не там: ({cx:.0f},{cy:.0f}) вместо ({tx:.0f},{ty:.0f})")

    check("PL-04", "Блок IDEF0 из палитры встаёт туда, куда его бросили", drag_idef0)

    def er_move():
        load("erd")
        node = page.locator(".canvas__remote .notation__node").first
        box = node.bounding_box()
        x, y = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
        page.mouse.move(x, y)
        page.mouse.down()
        page.mouse.move(x + 60, y + 40, steps=6)
        page.mouse.up()
        page.wait_for_timeout(600)
        yes("pos=" in code(), "положение не записано")
        errs = page.inner_text(".problems__status")
        yes("ошибки: 0" in errs or "Проблем нет" in errs or "нет проблем" in errs.lower() or "0" in page.inner_text(".editor-status__problems"), errs)
        yes("не распознана" not in page.inner_text(".problems__list"), page.inner_text(".problems__list"))

    check("PL-05", "Перетаскивание сущности ERD не ломает код (положение до скобки, ошибок синтаксиса нет)", er_move)

    def class_move():
        load("uml-class")
        node = page.locator(".canvas__remote .notation__node").first
        box = node.bounding_box()
        x, y = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
        page.mouse.move(x, y)
        page.mouse.down()
        page.mouse.move(x + 50, y + 30, steps=6)
        page.mouse.up()
        page.wait_for_timeout(600)
        yes("pos=" in code() and "не распознана" not in page.inner_text(".problems__list"), code()[:80])

    check("PL-06", "Перетаскивание класса UML не ломает код", class_move)

    def connect_ok():
        load("dfd")
        page.click(".palette__mode")
        nodes = page.locator(".canvas__remote .notation__node")
        ids = page.evaluate("[...document.querySelectorAll('.canvas__remote .notation__node')].map(n => n.dataset.id)")
        yes("Customer" in ids and "2" in ids, str(ids))
        page.locator('.notation__node[data-id="Customer"]').click()
        page.locator('.notation__node[data-id="2"]').click()
        page.wait_for_timeout(500)
        yes("добавлена" in page.inner_text(".palette__message"), page.inner_text(".palette__message"))
        yes("flow Customer -> 2" in code().replace('"', ""), code()[-80:])

    check("PL-07", "Режим «Соединить»: допустимая связь добавляется в код", connect_ok)

    def connect_refused():
        load("dfd")
        page.click(".palette__mode")
        before = code()
        page.locator('.notation__node[data-id="Customer"]').click()
        page.locator('.notation__node[data-id="Bank"]').click()
        page.wait_for_timeout(400)
        yes("отклонена" in page.inner_text(".palette__message"), page.inner_text(".palette__message"))
        yes("не касается процесса" in page.inner_text(".palette__message"), page.inner_text(".palette__message"))
        eq(code(), before, "код не должен меняться:")
        page.keyboard.press("Escape")

    check("PL-08", "Строгая проверка: связь, запрещённая нотацией (сущность к сущности), отклонена с причиной", connect_refused)

    def second_start():
        load("bpmn")
        before = code()
        page.locator(".palette__item", has_text="Начало").click()
        page.wait_for_timeout(400)
        eq(code(), before)
        yes("Не добавлено" in page.inner_text(".palette__message"), page.inner_text(".palette__message"))

    check("PL-09", "Строгая проверка: второе начало процесса BPMN не добавляется", second_start)

    def all_notations():
        bad = []
        for key in NOTATIONS:
            load(key)
            n = page.locator(".palette__item").count()
            if n == 0:
                bad.append(f"{key}: пусто")
                continue
            for i in range(n):
                page.locator(".palette__item").nth(i).click()
                page.wait_for_timeout(120)
            text = page.inner_text(".problems__list") if page.locator(".problems__list").count() else ""
            if "не распознана" in text or "Строка не распознана" in text:
                bad.append(f"{key}: синтаксическая ошибка после добавления")
        eq(bad, [], "нотации:")

    check("PL-10", "Во всех 33 нотациях элементы палитры добавляются без синтаксических ошибок", all_notations)

    def strict_codes():
        load("dfd")
        page.evaluate("""() => {
          const ol = document.querySelector('.code__lines');
          const li = document.createElement('li'); li.className = 'code__line';
          const c = document.createElement('code'); c.textContent = 'process P9 "Again" pos=abc'; li.append(c); ol.append(li);
        }""")
        page.click(".button--run", force=True)
        page.wait_for_timeout(500)
        yes("pos=abc" in page.inner_text(".problems__list"), page.inner_text(".problems__list")[:200])

    check("PL-11", "Строгая проверка кода: неверный формат положения pos= показан как ошибка", strict_codes)

    check("PL-12", "В консоли нет ошибок", lambda: eq(errors, []))
    b.close()

json.dump({"results": results, "console_errors": errors}, open(out / "palette-e2e.json", "w", encoding="utf8"), ensure_ascii=False, indent=2)
failed = [r for r in results if r["status"] == "Failed"]
for r in failed:
    print(r["id"], "Failed", r["title"], "|", r["note"])
print({"total": len(results), "passed": len(results) - len(failed), "failed": len(failed)})
sys.exit(1 if failed else 0)
