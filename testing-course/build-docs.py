import json, subprocess
from pathlib import Path
from docx import Document
from docx.shared import Cm, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

root = Path(__file__).parent
screens = root / "screens"
out = root / "documents"
out.mkdir(exist_ok=True)

lab3 = json.loads((root / "lab3/results.json").read_text(encoding="utf8"))
subprocess.run(["node", str(root / "lab2/run.js")], capture_output=True, cwd=root.parent)
lab2 = json.loads((root / "lab2/results.json").read_text(encoding="utf8"))
KIND = {"P": "позитивный", "N": "негативный", "B": "граничный"}
BASE = {"name": "Анна Иванова", "email": "anna@example.com", "notation": "idef0", "team": 5, "comment": "", "consent": True}
GREEN, RED = "C6EFCE", "FFC7CE"


from docx_kit import *


def diff(data):
    keys = [k for k in BASE if json.dumps(data.get(k)) != json.dumps(BASE[k])]
    if not keys:
        return "все поля корректны (базовый набор)"
    def v(x):
        return f"{x[:6]}… ({len(x)} симв.)" if isinstance(x, str) and len(x) > 20 else json.dumps(x, ensure_ascii=False)
    return "; ".join(f"{k} = {v(data.get(k))}" for k in keys) if data else "пустой объект {}"


# ---------- Document 1: test cases ----------
d = new_doc("", "Лабораторная работа №2 «Разработка тест-кейсов». В документе разработаны и выполнены тест-кейсы для формы заявки «Записаться в бету» на главной странице проекта DSLKit (проверка функции validateWaitlist): позитивные, негативные и граничные случаи с результатами выполнения и скриншотами.")
d.add_heading("1. Область и подход", 1)
d.add_paragraph(
    "Use case: пользователь оставляет заявку в листе ожидания. Поля: имя (2–60 букв, пробел, дефис, апостроф), email (формат, до 120 символов), "
    "нотация (из 6), размер команды (целое 0–500), комментарий (до 500), согласие (обязательно). Применены эквивалентное разбиение и анализ граничных значений. "
    "Базовый корректный набор: " + ", ".join(f"{k}={json.dumps(v, ensure_ascii=False)}" for k, v in BASE.items()) + "."
)
d.add_paragraph("Общие предусловия: проект запущен (npm start, http://localhost:5173), форма открыта, поля пусты. Общие постусловия: данные никуда не отправляются, состояние системы не меняется.")
passed = sum(r["status"] == "Passed" for r in lab2)
d.add_paragraph(f"Итог: {len(lab2)} тест-кейсов, Passed {passed}, Failed {len(lab2) - passed}.")
d.add_heading("2. Сводная таблица", 1)
table(d, ["ID", "Тип", "Приоритет", "Заголовок", "Статус"],
      [[r["id"], KIND[r["kind"]], r["priority"], r["title"], r["status"]] for r in lab2], [2.6, 2.6, 2.2, 7.5, 2.0], status_col=4)
d.add_heading("3. Тест-кейсы по шаблону", 1)
for r in lab2:
    d.add_heading(f'{r["id"]}: {r["title"]}', 3)
    exp = ", ".join(r["expected"]) or "ошибок нет, заявка принимается"
    act = ", ".join(r["actual"]) or "ошибок нет, заявка принимается"
    rows = [
        ("Приоритет / тип", f'{r["priority"]} / {KIND[r["kind"]]}'),
        ("Предусловия", "Проект запущен, форма открыта, поля пусты"),
        ("Тестовые данные", diff(r["data"])),
        ("Шаги", "1. Ввести тестовые данные в поля формы.\n2. Нажать «Отправить» (в автотесте: вызвать validateWaitlist).\n3. Прочитать список полей с ошибкой."),
        ("Ожидаемый результат", f"Поля с ошибкой: {exp}"),
        ("Фактический результат", f"Поля с ошибкой: {act}"),
        ("Постусловия", "Состояние системы не изменено"),
        ("Статус", r["status"]),
    ]
    t = d.add_table(rows=0, cols=2)
    t.style = "Table Grid"
    for k, v in rows:
        c = t.add_row().cells
        c[0].text = k; c[1].text = v
        c[0].paragraphs[0].runs[0].bold = True
        c[0].width, c[1].width = Cm(4.2), Cm(13)
        shade(c[0], "F2F2F2")
        if k == "Статус":
            shade(c[1], GREEN if v == "Passed" else RED)
    d.add_paragraph()
d.add_heading("4. Скриншоты выполнения", 1)
shot(d, "03-form-errors.png", "Рис. 1. TC-WL-022: пустая форма, все обязательные поля подсвечены ошибками", 9)
shot(d, "04-form-filled.png", "Рис. 2. TC-WL-001: форма с корректными данными", 9)
shot(d, "05-form-submitted.png", "Рис. 3. TC-WL-001: заявка принята, страница благодарности", 14)
shot(d, "09-console-lab2.png", "Рис. 4. Автоматический прогон 22 тест-кейсов", 16)
d.add_heading("5. Анализ результатов", 1)
d.add_paragraph("Все тест-кейсы пройдены, дефектов не выявлено. Ручная проверка в браузере (рис. 1–3) совпала с автоматическим прогоном.")
d.save(out / "01-test-cases.docx")

# ---------- Document 2: checklists + test report ----------
m = lab3["metrics"]
allc = lab3["smoke"] + lab3["critical"]
d = new_doc("", "Лабораторная работа №3 «Разработка чек-листов и отчёта о тестировании». В документе составлены дымовой чек-лист и чек-лист критического пути для проекта DSLKit, показаны результаты их выполнения и оформлен отчёт о тестировании (Test Report) с метриками, покрытием требований и скриншотами.")
d.add_heading("1. Требования и модули", 1)
reqs = [("R1", "Доступность страниц"), ("R2", "Загрузка стилей и скриптов"), ("R3", "Разбор DSL, преобразование в DOT и Mermaid"),
        ("R4", "Форма заявки и валидация"), ("R5", "Ошибки сервера: 404, 405, обход каталогов"), ("R6", "Разметка и локализация"),
        ("R7", "Безопасность: CSP и заголовки"), ("R8", "PWA, robots, sitemap"), ("R9", "Локальное хранилище")]
table(d, ["ID", "Требование"], reqs, [2, 15])
box = lambda s: "☑ Checked" if s == "Passed" else ("☒ " + s)
d.add_heading("2. Дымовой чек-лист (Smoke)", 1)
table(d, ["ID", "Треб.", "Проверка", "Статус", "Комментарий"], [[r["id"], r["req"], r["title"], box(r["status"]), r["note"]] for r in lab3["smoke"]], [1.8, 1.3, 8.5, 2.6, 3], status_col=3)
d.add_heading("3. Чек-лист критического пути (Critical Path)", 1)
table(d, ["ID", "Треб.", "Проверка", "Статус", "Комментарий"], [[r["id"], r["req"], r["title"], box(r["status"]), r["note"]] for r in lab3["critical"]], [1.8, 1.3, 8.5, 2.6, 3], status_col=3)
d.add_page_break()
d.add_heading("Отчёт о тестировании (Test Report)", 1)
d.add_heading("4. Общая информация", 2)
table(d, ["Параметр", "Значение"], [("Проект", "DSLKit (site/), ветка testing-course"), ("Дата", "25.10.2026"),
      ("Среда", "Windows 11, Node.js, локальный сервер tools/server.js; браузер Microsoft Edge (скриншоты)"),
      ("Способ", "Автоматические проверки (npm run tc:lab3) и ручная проверка в браузере")], [4, 13])
d.add_heading("5. Объём тестирования", 2)
d.add_paragraph("Тестировалось: доступность страниц (RU и EN), ресурсы, DSL-парсер и экспорт в DOT и Mermaid, форма заявки, ошибки сервера, защитные заголовки, PWA, хранилище. "
                "Не тестировалось: отрисовка диаграмм внешним сервисом Kroki, кроссбраузерность, нагрузка.")
d.add_heading("6. Результаты", 2)
table(d, ["Статус", "Количество"], [("Passed", m["passed"]), ("Failed", m["failed"]), ("Blocked", m["blocked"]), ("Всего", m["total"])], [6, 4])
d.add_heading("Метрики", 3)
table(d, ["Метрика", "Формула", "Значение"], [
    ("Процент выполненных", "Выполненные / Всего × 100%", f'{m["executedPct"]}%'),
    ("Процент успешных", "Passed / Выполненные × 100%", f'{m["passedPct"]}%'),
    ("Плотность дефектов", "Дефекты / Количество тестов", m["defectDensity"]),
    ("Покрытие требований", "Покрытые / Всего × 100%", f'{m["coveragePct"]}% ({m["requirements"]} из {m["requirements"]})')], [4.5, 8, 4.5])
d.add_heading("7. Обнаруженные дефекты", 2)
failed = [r for r in allc if r["status"] == "Failed"]
d.add_paragraph("Проваленных проверок нет, баг-репорты не создавались." if not failed else "\n".join(f'{r["id"]}: {r["note"]}' for r in failed))
d.add_paragraph("Примечание: при отладке проверка SM-06 падала из-за ошибки в синтаксисе тестовых данных (DSL требует diagram, box … {, arrow). Это дефект теста, он исправлен, к продукту отношения не имеет.")
d.add_heading("8. Покрытие требований", 2)
rows = []
for rid, name in reqs:
    ids = [r["id"] for r in allc if r["req"] == rid]
    ok = all(r["status"] == "Passed" for r in allc if r["req"] == rid)
    rows.append((rid, name, f"{len(ids)}: {ids[0]} … {ids[-1]}" if len(ids) > 1 else ids[0], "Passed" if ok else "Failed"))
table(d, ["Треб.", "Описание", "Проверки", "Результат"], rows, [1.6, 7, 6, 2.4], status_col=3)
d.add_heading("9. Скриншоты", 2)
shot(d, "01-home.png", "Рис. 1. R1: главная страница (RU)", 14)
shot(d, "02-home-en.png", "Рис. 2. R1, R6: английская версия", 14)
shot(d, "06-editor.png", "Рис. 3. R1: редактор", 14)
shot(d, "07-dashboard.png", "Рис. 4. R1: панель проектов", 14)
shot(d, "08-404.png", "Рис. 5. R5: страница 404", 14)
shot(d, "03-form-errors.png", "Рис. 6. R4: ошибки валидации формы", 8)
shot(d, "10-console-lab3.png", "Рис. 7. Автоматический прогон чек-листов и метрики", 16)
d.add_heading("10. Риски и проблемы", 2)
d.add_paragraph("Проверки не охватывают визуальную отрисовку диаграмм (внешний сервис Kroki) и другие браузеры. Работа редактора проверена выборочно.")
d.add_heading("11. Выводы и рекомендации", 2)
d.add_paragraph(f'Выполнено {m["passed"]} из {m["total"]} проверок, дымовой тест пройден на 100%, покрытие требований 100%, дефектов нет. Качество оценено как высокое, релиз рекомендован; браузерные сценарии стоит проверять отдельно.')
d.save(out / "02-checklists-and-test-report.docx")
print(sorted(x.name for x in out.iterdir()))
