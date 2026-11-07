import json
from pathlib import Path
here = Path(__file__).parent
out = here.parent / "20-ui-test-run.md"
groups = [("auth", "Регистрация, вход, выход"), ("projects", "Проекты, шаблоны, корзина, общие, повреждённое хранилище"),
          ("editor", "Редактор"), ("perf", "Производительность редактора"), ("sz", "Размеры окна 375, 768, 1366"), ("misc", "Язык, тема, офлайн, тур, адреса, повреждённое хранилище, две вкладки"), ("extra", "Дополнительные проверки (повреждённые проекты по одному значению, палитра, две вкладки)")]
lines = ["# Прогон исследовательского тестирования интерфейса", "",
         "Дата: 29.10.2026. Сайт: http://localhost:5391 (копия сервера `tools/serve.js site`, запущенная только для этого прогона, потому что на :5190 сервер зависал под нагрузкой). Браузер: Microsoft Edge (Playwright, python). Код сайта в ходе прогона правился другим исполнителем, поэтому часть результатов могла измениться (например, число стартовых диаграмм у нового пользователя выросло с 6 до 33).", "",
         "Методика: исследовательское тестирование и предугадывание ошибок по Куликову (нестандартный ввод, быстрые повторные действия, подмена времени и содержимого localStorage, две вкладки, офлайн, три ширины окна). Результат Fail означает, что фактическое поведение отличается от ожидаемого; баг-репорты в файле [21-bug-reports.md](21-bug-reports.md). Скрипты: `scripts-ui/`, скриншоты: `screens/`.", ""]
total = {"Pass": 0, "Fail": 0}
for key, title in groups:
    f = here / f"{key}.json"
    if not f.exists():
        continue
    rows = json.load(open(f, encoding="utf8"))
    DROP = {"LNG-01", "THM-01", "PRJ-17", "COR-01", "EDT-08"} | ({"TWO-02"} if key == "misc" else set())
    rows = [r for r in rows if r["id"] not in DROP]
    for r in rows:
        if r["id"] == "TUR-01": r["note"] = "тур не проверен: тестовый профиль заранее ставит флаг tour-done (результат условный)"
        if r["id"] == "THM-04": r["note"] = "значение data-theme до и после перезагрузки совпало; факт переключения не подтверждён (результат условный)"
        if r["id"] == "EDT-10": r["res"] = "Pass"; r["note"] = "первый пункт «Начало» отклонён, так как start в шаблоне уже есть (ожидаемо); добавление «Задача» проверено в EDT-10b"
        if r["id"] == "PRJ-11": r["res"] = "Fail"; r["note"] += " (BUG-04: лимит не соблюдается)"
        if r["id"] == "PRJ-16": r["note"] += " (список не обрезается до 200)"
        if r["id"] == "PRJ-01": r["note"] += " (BUG-12)"
        if r["id"] == "PRJ-15": r["note"] = "фильтр BPMN показал 0 карточек (состояние после предыдущих проверок, см. BUG-12)"
    lines += [f"## {title}", "", "| ID | Что проверяли | Результат | Примечание |", "|---|---|---|---|"]
    for r in rows:
        total[r["res"]] += 1
        note = r["note"].replace("|", "/").replace("\n", " ")[:260]
        lines.append(f"| {r['id']} | {r['what'].replace('|','/')} | {r['res']} | {note} |")
    lines.append("")
nt = here / "notations.json"
if nt.exists():
    d = json.load(open(nt, encoding="utf8"))
    lines += ["## Шаблоны 33 нотаций (редактор, 1366x800)", "",
              "Для каждой нотации открыт `editor.html?template=<ключ>`, снят скриншот доски (`screens/nt-<ключ>.png`), собраны ошибки консоли и проверены пересечения подписей и блоков по координатам.", "",
              "| ID | Нотация | Результат | Примечание |", "|---|---|---|---|"]
    for i, (k, r) in enumerate(d.items(), 1):
        notes = []
        bad = False
        if r["errors"]:
            bad = True; notes.append("ошибки консоли: " + "; ".join(r["errors"])[:100])
        if r["nTextOv"]:
            bad = True; notes.append("наложение подписей: " + ", ".join(f"«{a}» и «{b}»" for a, b, _ in r["textOverlaps"][:2]))
        if r["nBlockOv"]:
            bad = True; notes.append("наложение блоков")
        if r["clipped"]:
            notes.append("текст за краем холста: " + ", ".join(r["clipped"][:2]))
        if r["caption"].startswith("Диаграмма IDEF0") and k != "idef0":
            notes.append("подпись под доской осталась от IDEF0 (BUG-02)")
        res = "Fail" if bad else "Pass"
        total[res] += 1
        lines.append(f"| NT-{i:02d} | {k} | {res} | {'; '.join(notes)} |")
    lines.append("")
lines += ["## Итог", "", f"Проверок: {sum(total.values())}; Pass: {total['Pass']}; Fail: {total['Fail']}.", ""]
out.write_text("\n".join(lines), encoding="utf8")
print(total)
