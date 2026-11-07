"""ЛР4 (МБП): сбалансированная система показателей DSLKit в draw.io.
Оформление по примеру из методички ЛР4: стратегическая карта с дорожками перспектив, целями-эллипсами,
показателями-прямоугольниками (пунктирная связь с целью) и синими стрелками причинно-следственных связей,
толщина стрелки отражает силу влияния. Справочники целей и показателей показаны деревом навигатора.
Страница 1 – справочники (задание 1), страница 2 – стратегическая карта (задание 2). Запуск: python lab4.py"""
import math
import os
import sys
import textwrap

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dgl import Scene, report, save_multi
from bsc_data import PERSPECTIVES, GOALS, LINKS, KPIS

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ЛР4_ССП")
BLUE, GOAL_FILL, KPI_FILL, LANE_HEAD = "#2F6EBA", "#E4E9F2", "#FFFFCC", "#E6ECF7"
CODE = {g[0]: g for g in GOALS}
WIDTH = {0.25: 1.0, 0.5: 1.6, 1: 2.2, 2: 3.4, 4: 5.0}
EW, EH = 250, 104       # размеры эллипса цели
BW, BH = 200, 52       # размеры прямоугольника показателя


def ellipse_point(cx, cy, tx, ty):
    """Точка на эллипсе цели в направлении (tx, ty)."""
    dx, dy = tx - cx, ty - cy
    t = 1 / math.sqrt((dx / (EW / 2)) ** 2 + (dy / (EH / 2)) ** 2)
    return (round(cx + dx * t, 1), round(cy + dy * t, 1))


SHORT = {1: "Доход: 700 USD/мес", 3: "Затраты: ≤ 0,2 USD", 4: "Лицензии: 3 шт.", 6: "SUS: ≥ 82", 8: "MAU: 1 000",
         10: "Конверсия: 6 %", 11: "Построение: ≤ 3 с", 13: "Ошибки найдены: ≥ 95 %", 15: "Доступность: ≥ 99,5 %",
         17: "Ответ: ≤ 8 ч", 20: "Нотаций: 7", 22: "Документация: ≥ 90 %", 23: "Покрытие тестов: ≥ 98 %"}


def strategic_map():
    W, H = 1790, 1110
    s = Scene("Стратегическая карта", W, H)
    s.shape("t1", "plain", 20, 10, W - 40, 36, "СК DSLKit", fs=16, lw=1.2, fill="#DCE6F4", talign="left", tdx=10)
    s.shape("t2", "plain", 20, 46, W - 40, 22, "", lw=1.2, fill="#EEF3FA")
    tops, hs = [70, 320, 570, 870], [250, 250, 300, 240]
    for i, name in enumerate(PERSPECTIVES):
        s.shape(f"lane{i}", "lane", 20, tops[i], W - 40, hs[i], name, hw=50, fill=LANE_HEAD, fs=15)
    lc = [tops[0] + 140, tops[1] + 140, tops[2] + 150, tops[3] + 130]
    X = [420, 900, 1380]
    pos = {"Ф3": (X[0], lc[0]), "Ф2": (X[1], lc[0]), "Ф1": (X[2], lc[0]),
           "К1": (X[0], lc[1]), "К2": (X[1], lc[1]), "К3": (X[2], lc[1]),
           "В2": (420, lc[2]), "В1": (720, lc[2]), "В3": (1080, lc[2]), "В4": (1380, lc[2]),
           "О3": (X[0], lc[3]), "О1": (X[1], lc[3]), "О2": (X[2], lc[3])}
    for code, (cx, cy) in pos.items():
        s.shape(f"g{code}", "ellipse", cx - EW / 2, cy - EH / 2, EW, EH, f"{code}. " + textwrap.fill(CODE[code][2].replace(chr(10), " "), 20),
                fill=GOAL_FILL, lw=1.6, fs=13)
    mode = {"Ф3": ("L", 0), "К1": ("L", 0), "О3": ("L", 0), "В2": ("L", -30), "В1": ("L", 115),
            "Ф1": ("R", 0), "К3": ("R", 0), "О2": ("R", 0), "В4": ("R", 55), "В3": ("R", -80),
            "Ф2": ("UR", 0), "К2": ("UR", 0), "О1": ("UR", 0)}
    for code, (cx, cy) in pos.items():
        k = next(x for x in KPIS if x[1] == code)
        side, dy = mode[code]
        if side == "L":
            bx, by, ax, ay = 80, cy + dy - BH / 2, 80 + BW, cy + dy
        elif side == "R":
            bx, by, ax, ay = 1550, cy + dy - BH / 2, 1550, cy + dy
        else:
            bx, by, ax, ay = cx + 80, cy - EH / 2 - BH - 6, cx + 110, cy - EH / 2 - 6
        s.shape(f"k{code}", "rect", bx, by, BW, BH, f"П{k[0]}\n{SHORT[k[0]]}", fs=12, lw=1.2, fill=KPI_FILL)
        s.edge([(ax, ay), ellipse_point(cx, cy, ax, ay)], style="assoc", arrow="none", lw=1.2, color="#5A5A5A", free=True)

    def point(code, side):
        cx, cy = pos[code]
        return {"t": (cx, cy - EH / 2), "b": (cx, cy + EH / 2), "l": (cx - EW / 2, cy), "r": (cx + EW / 2, cy)}[side]

    ym, yb = tops[2] - 22, tops[3] - 22
    for a, b, w in LINKS:
        pa, pb = pos[a], pos[b]
        if pa[0] == pb[0]:
            pts = [point(a, "t"), point(b, "b")]
        elif pa[1] == pb[1]:
            pts = [point(a, "r"), point(b, "l")]
        elif b == "К1":
            pts = [point(a, "t"), (pa[0], ym), (pb[0], ym), point(b, "b")]
        else:
            pts = [point(a, "t"), (pa[0], yb), (pb[0], yb), point(b, "b")]
        s.edge(pts, src=f"g{a}", tgt=f"g{b}", style="plain", lw=WIDTH[w], color=BLUE, free=True)
    s.shape("leg", "plain", 1000, 1070, 770, 30, "Толщина стрелки отражает силу влияния цели; пунктир связывает цель с показателем",
            fs=11, lw=0, talign="right", tdx=766)
    return s

def navigator_tree():
    """Справочники «Цели» и «Показатели» в виде дерева навигатора (задание 1 методички)."""
    rows = [(0, "Цели и показатели", "root"), (1, "Перспективы стратегической карты", "folder"), (1, "Цели", "goals")]
    for p, name in enumerate(PERSPECTIVES):
        rows.append((2, name, "folder"))
        for g in GOALS:
            if g[1] == p:
                rows.append((3, f"{g[0]}. {g[2].replace(chr(10), ' ')}", "goal"))
    rows.append((1, "Показатели", "kpis"))
    for k in KPIS:
        rows.append((2, f"П{k[0]}. {k[2]}", "kpi"))
    rows += [(1, "Стратегические карты", "maps"), (2, "СК DSLKit", "map")]
    row_h, x0, ind = 30, 40, 34
    W, H = 1000, len(rows) * row_h + 60
    s = Scene("Справочники целей и показателей", W, H)
    icon = {"root": "#C7D6EE", "folder": "#F6D56B", "goals": "#D85A5A", "goal": "#9DB7E3", "kpis": "#6AA84F", "kpi": "#F1B64C",
            "maps": "#E0A458", "map": "#FFFFFF"}
    last_child = {}
    stack = {}
    ys = []
    for i, (lvl, text, kind) in enumerate(rows):
        y = 30 + i * row_h + row_h / 2
        ys.append(y)
    for i, (lvl, text, kind) in enumerate(rows):
        y, x = ys[i], x0 + lvl * ind
        shape = "ellipse" if kind in ("goal", "kpi") else "rect"
        s.shape(f"i{i}", shape, x, y - 8, 16, 16, "", fill=icon[kind], lw=1.0)
        s.text(x + 26, y, text, align="left", fs=13, white=False, tag="free-ok", bold=lvl == 0)
        # связь с родителем: вертикаль от родителя и горизонтальный отрезок
        if lvl > 0:
            j = max(k for k in range(i) if rows[k][0] == lvl - 1)
            px = x0 + (lvl - 1) * ind + 8
            s.edge([(px, ys[j] + 8), (px, y), (x, y)], style="plain", arrow="none", lw=1.0, color="#808080", free=True)
    return s


def build(out=OUT):
    os.makedirs(out, exist_ok=True)
    a, b = navigator_tree(), strategic_map()
    w = a.save(os.path.join(out, "01_Справочники_целей_и_показателей")) + b.save(os.path.join(out, "02_Стратегическая_карта"))
    return [a, b], w, check()


def check():
    """Проверка требований методички ЛР4 к составу ССП."""
    out = []
    per = {p: [k for k in KPIS if CODE[k[1]][1] == p] for p in range(4)}
    n = len(KPIS)
    if len(GOALS) > 25:
        out.append("целей больше 25")
    for g in GOALS:
        c = sum(1 for k in KPIS if k[1] == g[0])
        if not 1 <= c <= 3:
            out.append(f"цель {g[0]}: показателей {c}, нужно от 1 до 3")
    share = {p: round(100 * len(v) / n) for p, v in per.items()}
    nonfin = round(100 * (n - len(per[0])) / n)
    if nonfin < 75:
        out.append(f"нефинансовых показателей {nonfin}%, ожидается около 80%")
    linked = {x for l in LINKS for x in l[:2]}
    for code in linked:
        if code not in CODE:
            out.append(f"в связях неизвестная цель {code}")
    for g in GOALS:
        if g[0] not in linked:
            out.append(f"цель {g[0]} не связана причинно-следственными связями")
    for a, b, w in LINKS:
        if CODE[a][1] < CODE[b][1]:
            out.append(f"связь {a}->{b} идёт сверху вниз")
        if w not in WIDTH:
            out.append(f"связь {a}->{b}: недопустимая сила влияния {w}")
    return out, share, nonfin, n


if __name__ == "__main__":
    sc, w, (ch, share, nonfin, n) = build()
    save_multi(os.path.join(OUT, "ВСЕ_ДИАГРАММЫ_ЛР4.drawio"), sc)
    print("Проверка ССП:", "OK" if not ch else "")
    for m in ch:
        print("   -", m)
    print("показателей:", n, "доли по перспективам, %:", share, "нефинансовых, %:", nonfin)
    report(w)
