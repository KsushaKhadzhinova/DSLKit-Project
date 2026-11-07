"""ЛР4 (МБП): сбалансированная система показателей DSLKit в draw.io.
Страница 1 – стратегическая карта (цели и причинно-следственные связи),
страница 2 – цели с показателями. Запуск: python lab4.py"""
import os
import sys
import textwrap
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dgl import Scene, report, save_multi
from bsc_data import PERSPECTIVES, GOALS, LINKS, KPIS

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ЛР4_ССП")
LANE_FILL = ["#FFF2CC", "#DDEBF7", "#E2EFDA", "#FCE4D6"]
GOAL_FILL = ["#FFE699", "#BDD7EE", "#C6E0B4", "#F8CBAD"]
CODE = {g[0]: g for g in GOALS}


def lanes(s, tops, h, W):
    for i, name in enumerate(PERSPECTIVES):
        s.shape(f"lane{i}", "lane", 40, tops[i], W - 80, h[i], name, hw=34, fill=LANE_FILL[i], fs=15)


def goal(s, code, cx, cy, w=270, hgt=74):
    g = CODE[code]
    s.shape(f"g{code}", "ellipse", cx - w / 2, cy - hgt / 2, w, hgt, f"{code}. " + g[2], fill=GOAL_FILL[g[1]], lw=1.8, fs=13)


def strategic_map():
    W, H = 1500, 960
    s = Scene("Стратегическая карта", W, H)
    s.shape("title", "plain", 40, 10, W - 80, 36, "Стратегическая карта DSLKit", fs=20, bold=True, lw=0)
    tops, h = [60, 270, 480, 690], [210, 210, 210, 210]
    lanes(s, tops, h, W)
    pos = {"Ф3": (300, 165), "Ф2": (750, 165), "Ф1": (1200, 165),
           "К1": (300, 375), "К2": (750, 375), "К3": (1200, 375),
           "В2": (300, 585), "В1": (590, 585), "В3": (960, 585), "В4": (1275, 585),
           "О3": (300, 795), "О1": (750, 795), "О2": (1275, 795)}
    for c, (x, y) in pos.items():
        goal(s, c, x, y)
    L = lambda a, sa, b, sb, via=(), **kw: s.link(f"g{a}", sa, f"g{b}", sb, via=via, style="plain", lw=1.8, **kw)
    # снизу вверх: обучение -> процессы
    L("О3", "t", "В2", "b")
    L("О3", "t", "В1", "b", via=[(300, 700), (590, 700)])
    L("О2", "t", "В4", "b")
    L("О1", "t", "К2", "b")
    # процессы -> удовлетворённость (шина на y=508)
    L("В2", "t", "К1", "b")
    L("В1", "t", "К1", "b", via=[(590, 508), (300, 508)])
    L("В3", "t", "К1", "b", via=[(960, 508), (300, 508)])
    L("В4", "t", "К1", "b", via=[(1275, 508), (300, 508)])
    # клиенты
    L("К1", "r", "К2", "l")
    L("К2", "r", "К3", "l")
    # клиенты -> финансы
    L("К1", "t", "Ф3", "b")
    L("К2", "t", "Ф2", "b")
    L("К3", "t", "Ф1", "b")
    s.shape("leg", "plain", 1060, 905, 400, 40, "→ влияет на достижение цели (причина → следствие)", fs=12, lw=0, talign="right", tdx=396)
    return s


def goals_kpis():
    W, H = 1500, 1170
    s = Scene("Цели и показатели", W, H)
    s.shape("title", "plain", 40, 10, W - 80, 36, "Цели и показатели ССП DSLKit", fs=20, bold=True, lw=0)
    tops = [60, 330, 600, 910]
    h = [270, 270, 310, 260]
    lanes(s, tops, h, W)
    cols = {0: [300, 750, 1200], 1: [300, 750, 1200], 2: [300, 590, 945, 1300], 3: [300, 750, 1200]}
    for p in range(4):
        gs = [g for g in GOALS if g[1] == p]
        for i, g in enumerate(gs):
            cx = cols[p][i]
            cy = tops[p] + 52
            goal(s, g[0], cx, cy)
            ks = [k for k in KPIS if k[1] == g[0]]
            for j, k in enumerate(ks):
                ky = cy + 70 + j * 62
                sid = f"k{k[0]}"
                s.shape(sid, "rect", cx - 125, ky - 26, 250, 52, textwrap.fill(f"П{k[0]}. {k[2]}", 34) + f"\n({k[3]}; цель: {k[6]})", fs=9, lw=1.2, fill="#FFFFFF")
                s.link(sid, "l", f"g{g[0]}", "l", via=[(cx - 150, ky), (cx - 150, cy)], style="plain", lw=1.2)
    return s


def build(out=OUT):
    os.makedirs(out, exist_ok=True)
    a, b = strategic_map(), goals_kpis()
    w = a.save(os.path.join(out, "01_Стратегическая_карта")) + b.save(os.path.join(out, "02_Цели_и_показатели"))
    chk = check()
    return [a, b], w, chk


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
    for code in {x for l in LINKS for x in l}:
        if code not in CODE:
            out.append(f"в связях неизвестная цель {code}")
    linked = {x for l in LINKS for x in l}
    for g in GOALS:
        if g[0] not in linked:
            out.append(f"цель {g[0]} не связана причинно-следственными связями")
    # направление связей: от нижних перспектив к верхним (индекс перспективы убывает или остаётся)
    for a, b in LINKS:
        if CODE[a][1] < CODE[b][1]:
            out.append(f"связь {a}->{b} идёт сверху вниз")
    return out, share, nonfin, n


if __name__ == "__main__":
    sc, w, (ch, share, nonfin, n) = build()
    save_multi(os.path.join(OUT, "ВСЕ_ДИАГРАММЫ_ЛР4.drawio"), sc)
    print("Проверка ССП:", "OK" if not ch else "")
    for m in ch:
        print("   -", m)
    print("показателей:", n, "доли по перспективам, %:", share, "нефинансовых, %:", nonfin)
    report(w)
