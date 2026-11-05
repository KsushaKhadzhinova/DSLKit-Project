"""Генерация диаграмм ЛР1 (МБП): IDEF0 A-0, A0, A2, дерево узлов, оргструктура.
Каждая диаграмма сохраняется в PNG и в .drawio (редактируется в draw.io).
Запуск: python generate.py
"""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
from xml.sax.saxutils import escape

OUT = os.path.dirname(os.path.abspath(__file__))
FONT = "Times New Roman"
PX = 0.72  # 1 px диаграммы -> pt шрифта (фигура W/100 дюймов)
plt.rcParams["font.family"] = FONT


def attr(s):
    return escape(s, {'"': "&quot;"}).replace("\n", "&lt;br&gt;")


class Diagram:
    def __init__(self, name, W, H):
        self.name, self.W, self.H = name, W, H
        self.boxes, self.arrows, self.labels, self.extra = {}, [], [], []
        self.strip = None

    def box(self, bid, x, y, w, h, text, num=None, fs=15):
        self.boxes[bid] = dict(id=bid, x=x, y=y, w=w, h=h, text=text, num=num, fs=fs)
        return self.boxes[bid]

    def arrow(self, pts, src=None, tgt=None):
        self.arrows.append(dict(pts=pts, src=src, tgt=tgt))

    def label(self, x, y, text, align="center", fs=13):
        self.labels.append(dict(x=x, y=y, text=text, align=align, fs=fs))

    def frame(self, node, title):
        self.strip = (node, title)

    # ---------- PNG ----------
    def png(self, path):
        fig = plt.figure(figsize=(self.W / 100, self.H / 100), dpi=150)
        ax = fig.add_axes([0, 0, 1, 1])
        ax.set_xlim(0, self.W)
        ax.set_ylim(self.H, 0)
        ax.axis("off")
        if self.strip:
            W, H = self.W, self.H
            ax.add_patch(Rectangle((10, 10), W - 20, H - 20, fill=False, lw=1.6, ec="k"))
            y0 = H - 75
            ax.add_patch(Rectangle((10, y0), 220, 65, fill=False, lw=1.2, ec="k"))
            ax.add_patch(Rectangle((230, y0), W - 240, 65, fill=False, lw=1.2, ec="k"))
            ax.text(20, y0 + 12, "УЗЕЛ:", fontsize=10 * PX, va="center")
            ax.text(120, y0 + 38, self.strip[0], fontsize=22 * PX, va="center", ha="center")
            ax.text(240, y0 + 12, "НАЗВАНИЕ:", fontsize=10 * PX, va="center")
            ax.text(230 + (W - 240) / 2, y0 + 38, self.strip[1], fontsize=19 * PX,
                    va="center", ha="center")
        for a in self.arrows:
            p = a["pts"]
            for i in range(len(p) - 2):
                ax.plot([p[i][0], p[i + 1][0]], [p[i][1], p[i + 1][1]], color="k", lw=1.6,
                        solid_capstyle="butt", zorder=2)
            ax.annotate("", xy=p[-1], xytext=p[-2], zorder=2,
                        arrowprops=dict(arrowstyle="-|>", color="k", lw=1.6, shrinkA=0,
                                        shrinkB=0, mutation_scale=15))
        for b in self.boxes.values():
            ax.add_patch(Rectangle((b["x"], b["y"]), b["w"], b["h"], fc="white", ec="k",
                                   lw=2.2, zorder=3))
            ax.text(b["x"] + b["w"] / 2, b["y"] + b["h"] / 2, b["text"], ha="center",
                    va="center", fontsize=b["fs"] * PX, zorder=4, linespacing=1.15)
            if b["num"]:
                ax.text(b["x"] + b["w"] - 8, b["y"] + b["h"] - 8, b["num"], ha="right",
                        va="bottom", fontsize=14 * PX, fontweight="bold", zorder=4)
        for l in self.labels:
            ax.text(l["x"], l["y"], l["text"], ha=l["align"], va="center", multialignment=l["align"],
                    fontsize=l["fs"] * PX, zorder=6, linespacing=1.1,
                    bbox=dict(fc="white", ec="none", pad=1.2))
        fig.savefig(path, dpi=150, facecolor="white")
        plt.close(fig)

    # ---------- draw.io ----------
    def drawio(self, path):
        cells, n = [], [1]

        def nid():
            n[0] += 1
            return f"c{n[0]}"

        def rect(x, y, w, h, text="", style="", fs=13):
            i = nid()
            cells.append(
                f'<mxCell id="{i}" value="{attr(text)}" style="rounded=0;whiteSpace=wrap;html=1;'
                f'fontFamily={FONT};fontSize={fs};{style}" vertex="1" parent="1">'
                f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>')
            return i

        if self.strip:
            W, H = self.W, self.H
            rect(10, 10, W - 20, H - 20, "", "fillColor=none;strokeWidth=2;", 10)
            y0 = H - 75
            rect(10, y0, 220, 65, "УЗЕЛ:\n" + self.strip[0], "fillColor=none;align=center;verticalAlign=middle;", 20)
            rect(230, y0, W - 240, 65, "НАЗВАНИЕ:\n" + self.strip[1], "fillColor=none;align=center;verticalAlign=middle;", 18)
        for b in self.boxes.values():
            b["cid"] = rect(b["x"], b["y"], b["w"], b["h"], b["text"],
                            "fillColor=#FFFFFF;strokeWidth=3;align=center;verticalAlign=middle;", b["fs"])
        for b in self.boxes.values():
            if b["num"]:
                rect(b["x"] + b["w"] - 34, b["y"] + b["h"] - 26, 30, 22, b["num"],
                     "fillColor=none;strokeColor=none;align=right;fontStyle=1;", 14)
        for a in self.arrows:
            p = a["pts"]
            st = "endArrow=block;endFill=1;html=1;rounded=0;edgeStyle=none;strokeWidth=2;strokeColor=#000000;"
            ex = ""
            if a["src"]:
                s = a["src"]
                st += f"exitX={(p[0][0]-s['x'])/s['w']:.4f};exitY={(p[0][1]-s['y'])/s['h']:.4f};exitDx=0;exitDy=0;"
                ex += f' source="{s["cid"]}"'
            if a["tgt"]:
                t = a["tgt"]
                st += f"entryX={(p[-1][0]-t['x'])/t['w']:.4f};entryY={(p[-1][1]-t['y'])/t['h']:.4f};entryDx=0;entryDy=0;"
                ex += f' target="{t["cid"]}"'
            mid = "".join(f'<mxPoint x="{x}" y="{y}"/>' for x, y in p[1:-1])
            i = nid()
            cells.append(
                f'<mxCell id="{i}" style="{st}" edge="1" parent="1"{ex}><mxGeometry relative="1" as="geometry">'
                f'<mxPoint x="{p[0][0]}" y="{p[0][1]}" as="sourcePoint"/>'
                f'<mxPoint x="{p[-1][0]}" y="{p[-1][1]}" as="targetPoint"/>'
                f'<Array as="points">{mid}</Array></mxGeometry></mxCell>')
        for l in self.labels:
            lines = l["text"].split("\n")
            w = int(max(len(s) for s in lines) * l["fs"] * 0.5) + 10
            h = len(lines) * (l["fs"] + 3) + 4
            x = l["x"] - w / 2 if l["align"] == "center" else (l["x"] if l["align"] == "left" else l["x"] - w)
            rect(round(x), round(l["y"] - h / 2), w, h, l["text"],
                 f"text;fillColor=#FFFFFF;strokeColor=none;align={l['align']};verticalAlign=middle;"
                 f"whiteSpace=nowrap;spacing=0;", l["fs"])
        xml = (f'<mxfile host="app.diagrams.net"><diagram name="{self.name}" id="{self.name}">'
               f'<mxGraphModel dx="{self.W}" dy="{self.H}" grid="1" gridSize="10" page="1" pageWidth="{self.W}" '
               f'pageHeight="{self.H}" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>'
               + "".join(cells) + "</root></mxGraphModel></diagram></mxfile>")
        with open(path, "w", encoding="utf-8") as f:
            f.write(xml)

    def save(self, fname):
        self.png(os.path.join(OUT, fname + ".png"))
        self.drawio(os.path.join(OUT, fname + ".drawio"))


# ====================== A-0 ======================
def a_minus_0():
    d = Diagram("A-0", 1400, 760)
    b = d.box("b", 500, 250, 380, 200, "Продажа компьютерной техники\nчерез интернет-магазин", "A0", 20)
    for y, t in [(300, "Заказ клиента"), (350, "Обращение по гарантии"), (400, "Товары поставщиков")]:
        d.arrow([(25, y), (500, y)], tgt=b)
        d.label(200, y - 13, t)
    for x, t in [(560, "Законодательство РБ\n(ЗоЗПП, налоговое)"), (690, "Политика закупок\nи ценообразования"),
                 (820, "Правила продаж,\nоплаты и доставки")]:
        d.arrow([(x, 140), (x, 250)], tgt=b)
        d.label(x, 112, t)
    for y, t in [(300, "Доставленный товар\n(выполненный заказ)"), (350, "Гарантийные обязательства"),
                 (400, "Отчёт о продажах")]:
        d.arrow([(880, y), (1380, y)], src=b)
        d.label(1130, y - (22 if "\n" in t else 12), t)
    for x, t in [(560, "Персонал\nмагазина"), (690, "ИС магазина\n(сайт, учёт)"), (820, "Склад и\nтранспорт")]:
        d.arrow([(x, 570), (x, 450)], tgt=b)
        d.label(x, 596, t)
    d.frame("A-0", "Продажа компьютерной техники через интернет-магазин")
    d.save("01_IDEF0_A-0_контекстная")


# ====================== A0 ======================
def a0():
    d = Diagram("A0", 1400, 880)
    w, h = 230, 140
    b1 = d.box("b1", 130, 130, w, h, "Управление\nассортиментом\nи закупками", "1")
    b2 = d.box("b2", 420, 270, w, h, "Приём и обработка\nзаказов", "2")
    b3 = d.box("b3", 710, 410, w, h, "Комплектация\nи доставка заказов", "3")
    b4 = d.box("b4", 1000, 550, w, h, "Гарантийное\nобслуживание\nи возвраты", "4")
    # граничные входы
    d.arrow([(25, 190), (130, 190)], tgt=b1)
    d.arrow([(25, 365), (420, 365)], tgt=b2)
    d.arrow([(25, 650), (1000, 650)], tgt=b4)
    # внутренние связи
    d.arrow([(360, 170), (390, 170), (390, 310), (420, 310)], src=b1, tgt=b2)
    d.arrow([(360, 225), (375, 225), (375, 510), (710, 510)], src=b1, tgt=b3)
    d.arrow([(650, 340), (680, 340), (680, 455), (710, 455)], src=b2, tgt=b3)
    d.arrow([(940, 535), (970, 535), (970, 600), (1000, 600)], src=b3, tgt=b4)
    # обратная связь B3 -> B1 (управление)
    d.arrow([(940, 430), (1300, 430), (1300, 80), (245, 80), (245, 130)], src=b3, tgt=b1)
    # граничные выходы
    d.arrow([(940, 465), (1380, 465)], src=b3)
    d.arrow([(940, 500), (1380, 500)], src=b3)
    d.arrow([(1230, 620), (1380, 620)], src=b4)
    # управление
    d.arrow([(170, 60), (170, 130)], tgt=b1)
    d.arrow([(535, 225), (535, 270)], tgt=b2)
    d.arrow([(850, 375), (850, 410)], tgt=b3)
    d.arrow([(1130, 520), (1130, 550)], tgt=b4)
    # механизмы
    d.arrow([(245, 315), (245, 270)], tgt=b1)
    d.arrow([(535, 455), (535, 410)], tgt=b2)
    d.arrow([(825, 595), (825, 550)], tgt=b3)
    d.arrow([(1115, 735), (1115, 690)], tgt=b4)
    # подписи
    d.label(78, 172, "Товары\nпоставщиков")
    d.label(110, 350, "Заказ клиента")
    d.label(150, 635, "Обращение по гарантии")
    d.label(365, 159, "Каталог и цены", "left")
    d.label(385, 523, "Товар на складе", "left")
    d.label(688, 362, "Подтверждённый\nзаказ", "left")
    d.label(965, 563, "Данные о выдаче", "right")
    d.label(770, 66, "Данные о продажах и остатках")
    d.label(1150, 453, "Отчёт о продажах")
    d.label(1150, 484, "Доставленный товар (выполненный заказ)")
    d.label(1305, 600, "Гарантийные\nобязательства")
    d.label(1137, 524, "Условия гарантии (ЗоЗПП)", "left")
    d.label(163, 88, "Политика закупок\nи ценообразования", "right")
    d.label(535, 210, "Правила продаж и оплаты")
    d.label(850, 364, "Условия доставки")
    d.label(245, 328, "Менеджер по закупкам")
    d.label(535, 474, "Менеджеры по продажам,\nсайт магазина")
    d.label(825, 607, "Склад, курьерская служба")
    d.label(1115, 752, "Сервисный центр,\nИС магазина")
    d.frame("A0", "Продажа компьютерной техники через интернет-магазин")
    d.save("02_IDEF0_A0_декомпозиция")


# ====================== A2 ======================
def a2():
    d = Diagram("A2", 1400, 880)
    w, h = 230, 140
    c1 = d.box("c1", 130, 130, w, h, "Оформление заказа\nна сайте", "1")
    c2 = d.box("c2", 420, 260, w, h, "Проверка наличия\nи резервирование\nтовара", "2")
    c3 = d.box("c3", 710, 390, w, h, "Приём оплаты", "3")
    c4 = d.box("c4", 1000, 520, w, h, "Подтверждение\nзаказа клиенту", "4")
    d.arrow([(25, 175), (130, 175)], tgt=c1)
    d.arrow([(25, 230), (130, 230)], tgt=c1)
    d.arrow([(360, 200), (390, 200), (390, 330), (420, 330)], src=c1, tgt=c2)
    d.arrow([(650, 330), (680, 330), (680, 460), (710, 460)], src=c2, tgt=c3)
    d.arrow([(940, 460), (970, 460), (970, 590), (1000, 590)], src=c3, tgt=c4)
    d.arrow([(940, 425), (1380, 425)], src=c3)
    d.arrow([(1230, 590), (1380, 590)], src=c4)
    d.arrow([(190, 70), (190, 130)], tgt=c1)
    d.arrow([(535, 215), (535, 260)], tgt=c2)
    d.arrow([(850, 345), (850, 390)], tgt=c3)
    d.arrow([(1115, 485), (1115, 520)], tgt=c4)
    d.arrow([(245, 315), (245, 270)], tgt=c1)
    d.arrow([(535, 445), (535, 400)], tgt=c2)
    d.arrow([(825, 575), (825, 530)], tgt=c3)
    d.arrow([(1115, 705), (1115, 660)], tgt=c4)
    d.label(78, 160, "Заказ клиента")
    d.label(78, 215, "Каталог\nи цены")
    d.label(365, 184, "Оформленный заказ", "left")
    d.label(688, 360, "Заказ\nс резервом", "left")
    d.label(945, 441, "Оплаченный заказ", "left")
    d.label(1150, 410, "Данные о платеже и продажах")
    d.label(1305, 575, "Подтверждённый\nзаказ")
    d.label(182, 80, "Правила продаж", "right")
    d.label(535, 202, "Политика резервирования")
    d.label(850, 332, "Правила оплаты")
    d.label(1115, 471, "Шаблоны уведомлений")
    d.label(245, 328, "Сайт магазина")
    d.label(535, 464, "Менеджер по продажам,\nИС склада")
    d.label(825, 588, "Платёжный шлюз")
    d.label(1115, 722, "Менеджер по продажам,\ne-mail / SMS")
    d.frame("A2", "Приём и обработка заказов")
    d.save("03_IDEF0_A2_приём_и_обработка_заказов")


# ====================== деревья ======================
def tree(name, fname, root, bw, bh, ygap, xgap, fs, title_levels=None, margin=40):
    """root = (text, [children])"""
    leaves = [0]
    pos = {}

    def layout(node, depth):
        text, kids = node
        if not kids:
            x = leaves[0]
            leaves[0] += 1
        else:
            xs = [layout(k, depth + 1) for k in kids]
            x = sum(xs) / len(xs)
        pos[id(node)] = (x, depth)
        return x

    layout(root, 0)
    maxd = max(d for _, d in pos.values())
    W = int((leaves[0] - 1) * xgap + bw + 2 * margin)
    H = int(maxd * ygap + bh + 2 * margin)
    d = Diagram(name, W, H)
    ids = {}

    def place(node):
        x, depth = pos[id(node)]
        bx, by = margin + x * xgap, margin + depth * ygap
        ids[id(node)] = d.box(f"n{len(ids)}", bx, by, bw, bh, node[0], None, fs)
        for k in node[1]:
            place(k)

    place(root)

    def link(node):
        p = ids[id(node)]
        for k in node[1]:
            c = ids[id(k)]
            x1, y1 = p["x"] + bw / 2, p["y"] + bh
            x2, y2 = c["x"] + bw / 2, c["y"]
            ym = (y1 + y2) / 2
            d.arrow([(x1, y1), (x1, ym), (x2, ym), (x2, y2)], src=p, tgt=c)
            link(k)

    link(root)
    d.save(fname)


def node_tree():
    root = ("A-0\nПродажа компьютерной техники\nчерез интернет-магазин",
            [("A0\nПродажа компьютерной техники\nчерез интернет-магазин", [
                ("A1\nУправление ассортиментом\nи закупками", []),
                ("A2\nПриём и обработка\nзаказов", [
                    ("A21\nОформление заказа\nна сайте", []),
                    ("A22\nПроверка наличия\nи резервирование", []),
                    ("A23\nПриём оплаты", []),
                    ("A24\nПодтверждение заказа\nклиенту", [])]),
                ("A3\nКомплектация\nи доставка заказов", []),
                ("A4\nГарантийное обслуживание\nи возвраты", [])])])
    tree("NodeTree", "04_Дерево_узлов", root, 190, 80, 130, 215, 14)


def org():
    root = ("Директор", [
        ("Коммерческий\nотдел", [("Отдел\nзакупок", []), ("Отдел\nпродаж", []), ("Отдел\nмаркетинга", [])]),
        ("Склад\nи логистика", [("Склад", []), ("Служба\nдоставки", [])]),
        ("Сервисный\nцентр", [("Гарантийный\nремонт", []), ("Техническая\nподдержка", [])]),
        ("ИТ-отдел", [("Разработка\nи поддержка сайта", [])]),
        ("Финансово-\nбухгалтерский отдел", [("Бухгалтерия", [])]),
    ])
    tree("OrgStructure", "05_Организационная_структура", root, 160, 64, 140, 185, 15)


if __name__ == "__main__":
    a_minus_0()
    a0()
    a2()
    node_tree()
    org()
    print("done")
