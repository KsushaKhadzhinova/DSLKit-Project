"""Переводит PDF с заданиями и теорией курса МБП в Markdown: текст по страницам, встроенные рисунки,
страницы с векторными рисунками целиком. Оригиналы PDF копируются без изменений.
Запуск: python materials_to_md.py"""
import os
import re
import shutil
import pymupdf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "материалы")
SOURCES = [
    (r"E:\ИИТ\МБП_ЛР2\материалы", None),
    (r"E:\Downloads", ("МБП ЛР3", "МБП ЛР4")),
]
ORIG = os.path.join(OUT, "оригиналы")
MD = os.path.join(OUT, "md")
IMG = os.path.join(MD, "img")
for d in (ORIG, MD, IMG):
    os.makedirs(d, exist_ok=True)


def slug(name):
    s = re.sub(r"[^\w\-]+", "_", os.path.splitext(name)[0], flags=re.U).strip("_")
    return s[:60]


files = []
for folder, prefixes in SOURCES:
    for f in sorted(os.listdir(folder)):
        if not f.lower().endswith(".pdf") or not f.startswith("МБП"):
            continue
        if prefixes and not f.startswith(prefixes):
            continue
        files.append(os.path.join(folder, f))
# ЛР1 и ЛР2 берём из папки материалов, дубликат из Downloads не нужен
seen, uniq = set(), []
for p in files:
    key = os.path.basename(p)
    if key not in seen:
        seen.add(key)
        uniq.append(p)

index = ["# Материалы курса «Моделирование бизнес-процессов»", "",
         "Оригиналы PDF лежат в `оригиналы/`, текст и рисунки в `md/`. Источник: папка МБП на Google Drive курса.", "",
         "| Документ | Страниц | Рисунков | Markdown |", "|---|---|---|---|"]
for src in uniq:
    name = os.path.basename(src)
    shutil.copyfile(src, os.path.join(ORIG, name))
    base = slug(name)
    doc = pymupdf.open(src)
    lines = [f"# {os.path.splitext(name)[0]}", "", f"Оригинал: `../оригиналы/{name}`", ""]
    n_img = 0
    for i, page in enumerate(doc, 1):
        lines += [f"## Страница {i}", ""]
        text = page.get_text("text").strip()
        lines += [text, ""]
        shown = False
        for k, info in enumerate(page.get_images(full=True), 1):
            try:
                pix = pymupdf.Pixmap(doc, info[0])
                if pix.width < 60 or pix.height < 60:
                    continue
                if pix.colorspace and pix.colorspace.n > 3:
                    pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
                fn = f"{base}_p{i}_{k}.png"
                pix.save(os.path.join(IMG, fn))
                lines += [f"![Рисунок со страницы {i}](img/{fn})", ""]
                n_img += 1
                shown = True
            except Exception:
                continue
        if not shown and len(page.get_drawings()) > 40:
            fn = f"{base}_p{i}_page.png"
            page.get_pixmap(matrix=pymupdf.Matrix(1.4, 1.4)).save(os.path.join(IMG, fn))
            lines += [f"![Страница {i} с рисунком](img/{fn})", ""]
            n_img += 1
    with open(os.path.join(MD, base + ".md"), "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines))
    index.append(f"| {name} | {len(doc)} | {n_img} | [md/{base}.md](md/{base}.md) |")
    print(name, len(doc), "стр.,", n_img, "рис.")

txt = r"E:\Downloads\Структура отчета по МБП.txt"
if os.path.exists(txt):
    shutil.copyfile(txt, os.path.join(ORIG, os.path.basename(txt)))
    body = open(txt, encoding="utf-8-sig").read()
    with open(os.path.join(MD, "Структура_отчета_по_МБП.md"), "w", encoding="utf-8", newline="\n") as f:
        f.write("# Структура отчета по МБП\n\n" + body)
    index.append("| Структура отчета по МБП.txt | – | 0 | [md/Структура_отчета_по_МБП.md](md/Структура_отчета_по_МБП.md) |")
with open(os.path.join(OUT, "README.md"), "w", encoding="utf-8", newline="\n") as f:
    f.write("\n".join(index) + "\n")
print("готово")
