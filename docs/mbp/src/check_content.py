"""Проверка структуры content отчётов по правилам владельца:
после названия раздела и подраздела идёт текст, после каждой таблицы и рисунка идёт абзац,
подписи таблиц и рисунков короткие (3–5 слов).
Запуск: python check_content.py"""
import glob
import os
import re

RG = r"E:\report-gen\projects"
problems = 0


def kind(line):
    s = line.strip()
    if not s:
        return "blank"
    if s.startswith("#"):
        return "heading"
    if s.startswith("Таблица:"):
        return "tcap"
    if s.startswith("!["):
        return "figure"
    if s.startswith("|"):
        return "table"
    if re.match(r"^(-|\d+\.)\s", s):
        return "list"
    return "text"


for proj in ("mbp-lr1", "mbp-lr2", "mbp-lr3", "mbp-lr4"):
    blocks = []
    for f in sorted(glob.glob(os.path.join(RG, proj, "content", "*.md"))):
        cur = None
        for line in open(f, encoding="utf-8").read().splitlines():
            k = kind(line)
            if k == "blank":
                cur = None
                continue
            if cur is None or k != cur[0] or k in ("heading", "figure", "tcap"):
                cur = [k, line.strip()]
                blocks.append(cur)
            else:
                cur[1] += " " + line.strip()
    for i, (k, t) in enumerate(blocks):
        nxt = blocks[i + 1][0] if i + 1 < len(blocks) else "end"
        if k == "heading" and t.startswith("##") and nxt != "text":
            print(f"{proj}: после подраздела «{t[:50]}» идёт {nxt}, нужен текст"); problems += 1
        if k == "heading" and t.startswith("# ") and "{-}" not in t and nxt != "text":
            print(f"{proj}: после раздела «{t[:50]}» идёт {nxt}, нужен текст"); problems += 1
        if k == "table" and nxt != "text":
            print(f"{proj}: после таблицы перед «{blocks[i + 1][1][:40] if nxt != 'end' else ''}» нет абзаца ({nxt})"); problems += 1
        if k == "figure":
            if nxt != "text":
                print(f"{proj}: после рисунка «{t[:40]}» нет абзаца ({nxt})"); problems += 1
            cap = re.match(r"!\[(.*?)\]", t).group(1)
            if not 3 <= len(cap.split()) <= 5:
                print(f"{proj}: подпись рисунка «{cap}» – {len(cap.split())} слов"); problems += 1
        if k == "tcap":
            cap = t.split(":", 1)[1].strip()
            if not 3 <= len(cap.split()) <= 5:
                print(f"{proj}: подпись таблицы «{cap}» – {len(cap.split())} слов"); problems += 1
print("замечаний:", problems)
