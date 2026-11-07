"""Обновляет проект draw.io владельца: заменяет страницы ЛР1 и ЛР2 исправленными, добавляет ЛР3 и ЛР4,
страницы макетов Части 2 переносит без изменений (побайтно).
Исходный файл не изменяется: результат пишется в новую папку."""
import os
import re
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = r"E:\ИИТ\МБП_ЛР1\ВСЕ_ДИАГРАММЫ_И_МАКЕТЫ.drawio"
OUT = os.path.join(BASE, "ВСЕ_ДИАГРАММЫ_И_МАКЕТЫ.drawio")
PAGE = re.compile(r"<diagram .*?</diagram>", re.S)
NAME = re.compile(r'<diagram name="([^"]*)"')

new_pages = []
for lab, prefix, files in [
    ("ЛР1_Анализ_предметной_области", "ЛР1", "ВСЕ_ДИАГРАММЫ_ЛР1.drawio"),
    ("ЛР2_BPMN", "ЛР2", "ВСЕ_ДИАГРАММЫ_ЛР2.drawio"),
    ("ЛР3_EPC", "ЛР3", "ВСЕ_ДИАГРАММЫ_ЛР3.drawio"),
    ("ЛР4_ССП", "ЛР4", "ВСЕ_ДИАГРАММЫ_ЛР4.drawio"),
]:
    text = open(os.path.join(BASE, lab, files), encoding="utf-8").read()
    for pg in PAGE.findall(text):
        nm = NAME.match(pg).group(1)
        new_pages.append(pg.replace(f'name="{nm}"', f'name="{prefix} {nm}"', 1))

old = open(SRC, encoding="utf-8").read()
keep = [pg for pg in PAGE.findall(old) if NAME.match(pg).group(1).startswith("Макет")]
print("страниц макетов сохранено:", len(keep), "новых страниц:", len(new_pages))
with open(OUT, "w", encoding="utf-8") as f:
    f.write('<mxfile host="app.diagrams.net">' + "".join(new_pages) + "".join(keep) + "</mxfile>")
names = [NAME.match(p).group(1) for p in new_pages + keep]
print("\n".join(names))
print("размер, МБ:", round(os.path.getsize(OUT) / 1e6, 2))
